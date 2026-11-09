import express from 'express';
import { z } from 'zod';
import { Post, Community, CommunityMember, Vote, SavedPost } from '../models/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { calculateHotScore } from '../services/rankingService.js';
import { verifyModerator } from '../services/moderationService.js';
import { getIO } from '../sockets/index.js';

const router = express.Router();

const createPostSchema = z.object({
  title: z.string().min(3).max(300),
  body: z.string().max(40000).optional(),
  postType: z.enum(['text', 'link', 'image', 'poll']).default('text'),
  communityId: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
  externalUrl: z.string().url().nullish().or(z.literal('')),
  pollOptions: z.array(z.string().min(1).max(120)).min(2).max(10).optional(),
  flair: z.object({
    text: z.string().default(''),
    backgroundColor: z.string().default(''),
    textColor: z.string().default(''),
  }).optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  body: z.string().max(40000).optional(),
});

router.post('/', requireAuth, validate(createPostSchema), async (req, res, next) => {
  try {
    const { title, body, postType, communityId, mediaUrls, externalUrl, pollOptions, flair } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    if (community.isArchived) {
      return res.status(400).json({ error: 'This community is archived. No new posts can be made.' });
    }

    // Check membership and bans
    const membership = await CommunityMember.findOne({ community: community._id, user: req.user._id });
    if (membership && membership.isBanned) {
      return res.status(403).json({ error: 'You are banned from posting in this community' });
    }

    if (membership && membership.mutedUntil && new Date(membership.mutedUntil) > new Date()) {
      return res.status(403).json({ error: 'You are temporarily muted from posting in this community' });
    }

    // Check posting permissions
    if (community.postingPermission === 'members_only' && !membership) {
      return res.status(403).json({ error: 'You must join this community before publishing posts' });
    }

    if (community.postingPermission === 'approved_only') {
      const isApproved = membership && ['owner', 'moderator', 'approved_contributor'].includes(membership.role);
      if (!isApproved && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only approved contributors may post in this community' });
      }
    }

    // Process poll options if poll type
    let pollData = null;
    if (postType === 'poll' && pollOptions) {
      pollData = {
        options: pollOptions.map((opt) => ({
          text: opt,
          voteCount: 0,
          voters: [],
        })),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days poll
      };
    }

    const now = new Date();
    const hotRankScore = calculateHotScore(0, now);

    const post = await Post.create({
      title,
      body: body || '',
      postType: postType || 'text',
      community: community._id,
      author: req.user._id,
      mediaUrls: mediaUrls || [],
      externalUrl: externalUrl || '',
      pollData,
      flair: flair || { text: '' },
      score: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      commentCount: 0,
      hotRankScore,
    });

    const populated = await post.populate([
      { path: 'author', select: 'username displayName avatarUrl' },
      { path: 'community', select: 'name slug iconUrl privacyType' },
    ]);

    // Broadcast to community room
    const io = getIO();
    if (io) {
      io.to(`community:${community.slug}`).emit('post:new', populated);
    }

    res.status(201).json({ post: populated });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username displayName avatarUrl')
      .populate('community', 'name slug iconUrl description privacyType rules memberCount isArchived')
      .lean();

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.isRemoved) {
      // Check if user is moderator
      let canViewModDetails = false;
      if (req.user) {
        try {
          await verifyModerator(req.user._id, post.community._id);
          canViewModDetails = true;
        } catch {
          canViewModDetails = false;
        }
      }

      if (!canViewModDetails) {
        post.body = `[Removed by moderator: ${post.removedReason || 'Violated community guidelines'}]`;
        post.mediaUrls = [];
      }
    }

    // Check private community access
    if (post.community.privacyType === 'private') {
      if (!req.user) {
        return res.status(401).json({ error: 'Sign in to access this post' });
      }
      const member = await CommunityMember.findOne({ community: post.community._id, user: req.user._id, isBanned: false });
      if (!member) {
        return res.status(403).json({ error: 'You do not have permission to view posts in this private community' });
      }
    }

    let userVote = 0;
    let isSaved = false;

    if (req.user) {
      const [voteDoc, savedDoc] = await Promise.all([
        Vote.findOne({ user: req.user._id, targetType: 'Post', targetId: post._id }),
        SavedPost.findOne({ user: req.user._id, post: post._id }),
      ]);
      if (voteDoc) userVote = voteDoc.value;
      if (savedDoc) isSaved = true;
    }

    res.json({
      post: {
        ...post,
        userVote,
        isSaved,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, validate(updatePostSchema), async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    if (post.isRemoved) {
      return res.status(400).json({ error: 'Cannot edit a removed post' });
    }

    const { title, body } = req.body;
    if (title !== undefined) post.title = title;
    if (body !== undefined) post.body = body;

    await post.save();
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isAuthor = post.author.toString() === req.user._id.toString();
    let isMod = false;
    try {
      await verifyModerator(req.user._id, post.community);
      isMod = true;
    } catch {
      isMod = false;
    }

    if (!isAuthor && !isMod) {
      return res.status(403).json({ error: 'You do not have permission to delete this post' });
    }

    post.isRemoved = true;
    post.removedReason = isAuthor ? 'Deleted by author' : 'Removed by moderator';
    post.removedBy = req.user._id;
    await post.save();

    res.json({ message: 'Post successfully deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/poll-vote', requireAuth, async (req, res, next) => {
  try {
    const { optionId } = req.body;
    if (!optionId) {
      return res.status(400).json({ error: 'optionId is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post || post.postType !== 'poll' || !post.pollData) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check if user already voted in any option of this poll
    const hasVoted = post.pollData.options.some((opt) =>
      opt.voters.some((vId) => vId.toString() === req.user._id.toString())
    );

    if (hasVoted) {
      return res.status(400).json({ error: 'You have already voted on this poll' });
    }

    const option = post.pollData.options.id(optionId);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    option.voters.push(req.user._id);
    option.voteCount += 1;
    await post.save();

    res.json({ pollData: post.pollData });
  } catch (err) {
    next(err);
  }
});

export default router;
