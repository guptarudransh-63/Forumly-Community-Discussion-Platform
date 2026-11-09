import express from 'express';
import { z } from 'zod';
import { User, Post, Comment, CommunityMember, Vote } from '../models/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { encodeCursor, decodeCursor, buildCursorQuery } from '../services/rankingService.js';
import { getAccessibleCommunityIds } from '../services/feedService.js';

const router = express.Router();

const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
});

router.get('/:username', optionalAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', requireAuth, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { displayName, bio, avatarUrl, bannerUrl } = req.body;
    const user = req.user;

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) user.bannerUrl = bannerUrl;

    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.get('/:username/posts', optionalAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    const accessibleCommunityIds = await getAccessibleCommunityIds(req.user ? req.user._id : null);

    const baseQuery = {
      author: user._id,
      community: { $in: accessibleCommunityIds },
      isRemoved: false,
    };

    const cursorClause = buildCursorQuery('createdAt', 'desc', cursor);
    const finalQuery = { ...baseQuery, ...cursorClause };

    const posts = await Post.find(finalQuery)
      .sort({ createdAt: -1, _id: -1 })
      .limit(pageLimit + 1)
      .populate('community', 'name slug iconUrl')
      .populate('author', 'username displayName avatarUrl')
      .lean();

    const hasNextPage = posts.length > pageLimit;
    const items = hasNextPage ? posts.slice(0, pageLimit) : posts;

    let userVotesMap = {};
    if (req.user && items.length > 0) {
      const votes = await Vote.find({
        user: req.user._id,
        targetType: 'Post',
        targetId: { $in: items.map((p) => p._id) },
      }).lean();
      userVotesMap = votes.reduce((acc, v) => {
        acc[v.targetId.toString()] = v.value;
        return acc;
      }, {});
    }

    const enriched = items.map((p) => ({
      ...p,
      userVote: userVotesMap[p._id.toString()] || 0,
    }));

    let nextCursor = null;
    if (hasNextPage && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor(last.createdAt, last._id);
    }

    res.json({
      posts: enriched,
      nextCursor,
      hasNextPage,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:username/comments', optionalAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accessibleCommunityIds = await getAccessibleCommunityIds(req.user ? req.user._id : null);

    // Find all post IDs belonging to communities accessible to the requester
    const accessiblePosts = await Post.find({
      community: { $in: accessibleCommunityIds },
      isRemoved: false,
    }).select('_id');
    const accessiblePostIds = accessiblePosts.map((p) => p._id);

    const comments = await Comment.find({
      author: user._id,
      isRemoved: false,
      post: { $in: accessiblePostIds },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('post', 'title community')
      .populate({
        path: 'post',
        populate: { path: 'community', select: 'name slug iconUrl' },
      })
      .lean();

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

export default router;
