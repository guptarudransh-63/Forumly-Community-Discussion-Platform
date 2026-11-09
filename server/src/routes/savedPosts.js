import express from 'express';
import { SavedPost, Post, Vote } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { encodeCursor, buildCursorQuery } from '../services/rankingService.js';
import { getAccessibleCommunityIds } from '../services/feedService.js';

const router = express.Router();

router.post('/:postId', requireAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post || post.isRemoved) {
      return res.status(404).json({ error: 'Post not found or removed' });
    }

    const saved = await SavedPost.findOneAndUpdate(
      { user: req.user._id, post: postId },
      { $setOnInsert: { user: req.user._id, post: postId, savedAt: new Date() } },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Post saved successfully', saved });
  } catch (err) {
    next(err);
  }
});

router.delete('/:postId', requireAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;
    await SavedPost.deleteOne({ user: req.user._id, post: postId });
    res.json({ message: 'Post unsaved successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    const baseQuery = { user: req.user._id };
    const cursorClause = buildCursorQuery('savedAt', 'desc', cursor);
    const finalQuery = { ...baseQuery, ...cursorClause };

    const savedRecords = await SavedPost.find(finalQuery)
      .sort({ savedAt: -1, _id: -1 })
      .limit(pageLimit + 1)
      .populate({
        path: 'post',
        populate: [
          { path: 'author', select: 'username displayName avatarUrl' },
          { path: 'community', select: 'name slug iconUrl' },
        ],
      })
      .lean();

    const hasNextPage = savedRecords.length > pageLimit;
    const items = hasNextPage ? savedRecords.slice(0, pageLimit) : savedRecords;

    const accessibleCommunityIds = await getAccessibleCommunityIds(req.user._id);
    const accessibleSet = new Set(accessibleCommunityIds.map((id) => id.toString()));

    // Filter out posts that might have been hard-deleted, are removed, or belong to private communities no longer accessible
    const validPosts = items
      .filter((item) => {
        if (!item.post || item.post.isRemoved) return false;
        const commId = (item.post.community?._id || item.post.community)?.toString();
        return commId && accessibleSet.has(commId);
      })
      .map((item) => item.post);

    let userVotesMap = {};
    if (validPosts.length > 0) {
      const votes = await Vote.find({
        user: req.user._id,
        targetType: 'Post',
        targetId: { $in: validPosts.map((p) => p._id) },
      }).lean();

      userVotesMap = votes.reduce((acc, v) => {
        acc[v.targetId.toString()] = v.value;
        return acc;
      }, {});
    }

    const enriched = validPosts.map((p) => ({
      ...p,
      userVote: userVotesMap[p._id.toString()] || 0,
      isSaved: true,
    }));

    let nextCursor = null;
    if (hasNextPage && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = encodeCursor(last.savedAt, last._id);
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

export default router;
