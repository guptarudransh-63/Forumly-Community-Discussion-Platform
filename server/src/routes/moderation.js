import express from 'express';
import { z } from 'zod';
import { Report, ModerationLog, Community, Post, Comment } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  verifyModerator,
  removePost,
  restorePost,
  setPostLock,
  setPostPin,
  removeComment,
  banMember,
  unbanMember,
  resolveReport,
} from '../services/moderationService.js';

const router = express.Router();

const createReportSchema = z.object({
  targetType: z.enum(['Post', 'Comment', 'User', 'Community']),
  targetId: z.string().min(1),
  communityId: z.string().optional(),
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'misinformation', 'rule_violation', 'inappropriate', 'other']),
  description: z.string().max(1000).optional(),
});

const resolveReportSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'dismissed']),
  resolutionNotes: z.string().max(1000).optional(),
});

router.post('/report', requireAuth, validate(createReportSchema), async (req, res, next) => {
  try {
    const { targetType, targetId, communityId, reason, description } = req.body;

    let targetCommunity = (communityId && typeof communityId === 'string' && communityId.trim() !== '') ? communityId.trim() : null;

    if (!targetCommunity) {
      if (targetType === 'Post') {
        const post = await Post.findById(targetId);
        if (post) targetCommunity = post.community;
      } else if (targetType === 'Comment') {
        const comment = await Comment.findById(targetId).populate('post');
        if (comment && comment.post) targetCommunity = comment.post.community;
      }
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      community: targetCommunity,
      reason,
      description: description || '',
      status: 'open',
    });

    res.status(201).json({ message: 'Report submitted for review', report });
  } catch (err) {
    next(err);
  }
});

router.get('/communities/:slug/queue', requireAuth, async (req, res, next) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    await verifyModerator(req.user._id, community._id);

    const { status = 'open' } = req.query;
    const filter = { community: community._id };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .populate('reporter', 'username displayName')
      .populate('resolvedBy', 'username displayName')
      .lean();

    // Populate target content previews
    const enriched = await Promise.all(
      reports.map(async (r) => {
        let targetPreview = null;
        if (r.targetType === 'Post') {
          targetPreview = await Post.findById(r.targetId).select('title body isRemoved author').populate('author', 'username').lean();
        } else if (r.targetType === 'Comment') {
          targetPreview = await Comment.findById(r.targetId).select('content isRemoved author').populate('author', 'username').lean();
        }
        return {
          ...r,
          targetPreview,
        };
      })
    );

    res.json({ reports: enriched });
  } catch (err) {
    next(err);
  }
});

router.patch('/reports/:id', requireAuth, validate(resolveReportSchema), async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const report = await resolveReport(req.user._id, req.params.id, status, resolutionNotes);
    res.json({ message: `Report marked as ${status}`, report });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/remove', requireAuth, async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const post = await removePost(req.user._id, req.params.id, reason);
    res.json({ message: 'Post removed by moderator', post });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/restore', requireAuth, async (req, res, next) => {
  try {
    const post = await restorePost(req.user._id, req.params.id);
    res.json({ message: 'Post restored', post });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/lock', requireAuth, async (req, res, next) => {
  try {
    const { isLocked = true } = req.body;
    const post = await setPostLock(req.user._id, req.params.id, isLocked);
    res.json({ message: `Post comments ${isLocked ? 'locked' : 'unlocked'}`, post });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/pin', requireAuth, async (req, res, next) => {
  try {
    const { isPinned = true } = req.body;
    const post = await setPostPin(req.user._id, req.params.id, isPinned);
    res.json({ message: `Post ${isPinned ? 'pinned' : 'unpinned'}`, post });
  } catch (err) {
    next(err);
  }
});

router.post('/comments/:id/remove', requireAuth, async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const comment = await removeComment(req.user._id, req.params.id, reason);
    res.json({ message: 'Comment removed by moderator', comment });
  } catch (err) {
    next(err);
  }
});

router.post('/communities/:slug/ban', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId, reason = '' } = req.body;
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const membership = await banMember(req.user._id, community._id, targetUserId, reason);
    res.json({ message: 'User banned from community', membership });
  } catch (err) {
    next(err);
  }
});

router.post('/communities/:slug/unban', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const membership = await unbanMember(req.user._id, community._id, targetUserId);
    res.json({ message: 'User unbanned', membership });
  } catch (err) {
    next(err);
  }
});

router.get('/communities/:slug/logs', requireAuth, async (req, res, next) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    await verifyModerator(req.user._id, community._id);

    const logs = await ModerationLog.find({ community: community._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('moderator', 'username displayName')
      .lean();

    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

export default router;
