import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getFeed } from '../services/feedService.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      feedType = 'popular',
      sort = 'hot',
      timeWindow = 'all',
      communitySlug = null,
      cursor = null,
      limit = 20,
    } = req.query;

    const result = await getFeed({
      feedType,
      sort,
      timeWindow,
      communitySlug,
      userId: req.user ? req.user._id : null,
      cursor,
      limit,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
