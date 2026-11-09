import express from 'express';
import { z } from 'zod';
import { Comment, CommunityMember } from '../models/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createComment, getCommentsTree } from '../services/commentService.js';
import { verifyModerator } from '../services/moderationService.js';

const router = express.Router();

const createCommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(10000),
  parentCommentId: z.string().nullable().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

router.post('/', requireAuth, validate(createCommentSchema), async (req, res, next) => {
  try {
    const { postId, content, parentCommentId } = req.body;

    const comment = await createComment({
      postId,
      authorId: req.user._id,
      content,
      parentCommentId: parentCommentId || null,
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

router.get('/post/:postId', optionalAuth, async (req, res, next) => {
  try {
    const { sort = 'top' } = req.query;
    const tree = await getCommentsTree(req.params.postId, req.user ? req.user._id : null, sort);
    res.json({ comments: tree });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, validate(updateCommentSchema), async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    if (comment.isRemoved) {
      return res.status(400).json({ error: 'Cannot edit a removed comment' });
    }

    comment.content = req.body.content.trim();
    await comment.save();

    res.json({ comment });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('post');
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    let isMod = false;
    try {
      if (comment.post && comment.post.community) {
        await verifyModerator(req.user._id, comment.post.community);
        isMod = true;
      }
    } catch {
      isMod = false;
    }

    if (!isAuthor && !isMod) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' });
    }

    comment.isRemoved = true;
    comment.removedReason = isAuthor ? 'Deleted by author' : 'Removed by moderator';
    comment.removedBy = req.user._id;
    await comment.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
