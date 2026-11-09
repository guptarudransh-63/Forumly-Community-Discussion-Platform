import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { castVote } from '../services/votingService.js';
import { getIO } from '../sockets/index.js';

const router = express.Router();

const voteSchema = z.object({
  targetType: z.enum(['Post', 'Comment']),
  targetId: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

router.post('/', requireAuth, validate(voteSchema), async (req, res, next) => {
  try {
    const { targetType, targetId, value } = req.body;

    const result = await castVote(req.user._id, targetType, targetId, value);

    // Broadcast score change to listening room
    const io = getIO();
    if (io) {
      if (targetType === 'Post') {
        io.to(`post:${targetId}`).emit('post:voteUpdate', {
          postId: targetId,
          score: result.score,
          upvoteCount: result.upvoteCount,
          downvoteCount: result.downvoteCount,
        });
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
