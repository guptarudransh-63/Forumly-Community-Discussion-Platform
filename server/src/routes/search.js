import express from 'express';
import { Post, Community, User } from '../models/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { getAccessibleCommunityIds } from '../services/feedService.js';

const router = express.Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q = '', type = 'all', limit = 20 } = req.query;
    const query = q.trim();

    if (!query) {
      return res.json({ posts: [], communities: [], users: [] });
    }

    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const accessibleCommunityIds = await getAccessibleCommunityIds(req.user ? req.user._id : null);

    const safeRegex = new RegExp(escapeRegex(query), 'i');

    let posts = [];
    let communities = [];
    let users = [];

    // Search Communities
    if (type === 'all' || type === 'communities') {
      communities = await Community.find({
        $or: [{ name: safeRegex }, { slug: safeRegex }, { description: safeRegex }],
        privacyType: { $in: ['public', 'restricted'] },
        isArchived: false,
      })
        .limit(pageLimit)
        .lean();
    }

    // Search Users
    if (type === 'all' || type === 'users') {
      users = await User.find({
        $or: [{ username: safeRegex }, { displayName: safeRegex }],
        isBanned: false,
      })
        .select('username displayName avatarUrl bio postKarma commentKarma')
        .limit(pageLimit)
        .lean();
    }

    // Search Posts (respects community access and removed status)
    if (type === 'all' || type === 'posts') {
      posts = await Post.find({
        $or: [{ title: safeRegex }, { body: safeRegex }],
        community: { $in: accessibleCommunityIds },
        isRemoved: false,
      })
        .sort({ score: -1, createdAt: -1 })
        .limit(pageLimit)
        .populate('author', 'username displayName avatarUrl')
        .populate('community', 'name slug iconUrl')
        .lean();
    }

    res.json({
      query,
      posts,
      communities,
      users,
    });
  } catch (err) {
    next(err);
  }
});

// Autocomplete suggestions endpoint
router.get('/suggestions', async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const query = q.trim();
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const safePrefixRegex = new RegExp(`^${escapeRegex(query)}`, 'i');
    const [communities, users] = await Promise.all([
      Community.find({
        $or: [{ slug: safePrefixRegex }, { name: safePrefixRegex }],
        privacyType: { $in: ['public', 'restricted'] },
      })
        .select('name slug iconUrl memberCount')
        .limit(5)
        .lean(),
      User.find({ username: safePrefixRegex, isBanned: false })
        .select('username displayName avatarUrl')
        .limit(5)
        .lean(),
    ]);

    const suggestions = [
      ...communities.map((c) => ({ type: 'community', title: `r/${c.slug}`, data: c })),
      ...users.map((u) => ({ type: 'user', title: `u/${u.username}`, data: u })),
    ];

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
