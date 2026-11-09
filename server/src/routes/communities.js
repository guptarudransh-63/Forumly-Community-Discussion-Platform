import express from 'express';
import { z } from 'zod';
import { Community, CommunityMember, ModerationLog } from '../models/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { verifyModerator } from '../services/moderationService.js';

const router = express.Router();

const createCommunitySchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Slug can only contain letters, numbers, and underscores'),
  description: z.string().max(1000).optional(),
  privacyType: z.enum(['public', 'restricted', 'private']).default('public'),
  postingPermission: z.enum(['anyone', 'members_only', 'approved_only']).default('members_only'),
  iconUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  rules: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
  })).optional(),
});

const updateCommunitySchema = z.object({
  description: z.string().max(1000).optional(),
  postingPermission: z.enum(['anyone', 'members_only', 'approved_only']).optional(),
  iconUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  rules: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    order: z.number().optional(),
  })).optional(),
});

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { limit = 20, sort = 'members' } = req.query;
    const pageLimit = Math.min(parseInt(limit, 10) || 20, 50);

    const query = { privacyType: { $in: ['public', 'restricted'] }, isArchived: false };
    const sortObj = sort === 'new' ? { createdAt: -1 } : { memberCount: -1 };

    const communities = await Community.find(query)
      .sort(sortObj)
      .limit(pageLimit)
      .lean();

    res.json({ communities });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() })
      .populate('creator', 'username displayName')
      .lean();

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    let userMembership = null;
    if (req.user) {
      userMembership = await CommunityMember.findOne({
        community: community._id,
        user: req.user._id,
      }).lean();
    }

    if (community.privacyType === 'private') {
      if (!req.user) {
        return res.status(401).json({ error: 'Sign in to access this private community' });
      }
      if (!userMembership || userMembership.isBanned) {
        return res.status(403).json({ error: 'You do not have access to this private community' });
      }
    }

    // Fetch list of moderators
    const modMemberships = await CommunityMember.find({
      community: community._id,
      role: { $in: ['owner', 'moderator'] },
      isBanned: false,
    }).populate('user', 'username displayName avatarUrl').lean();

    const moderators = modMemberships
      .filter((m) => m.user != null)
      .map((m) => ({
        user: m.user,
        role: m.role,
      }));

    res.json({
      community,
      userMembership: userMembership
        ? {
            role: userMembership.role,
            isBanned: userMembership.isBanned,
            mutedUntil: userMembership.mutedUntil,
            joinedAt: userMembership.joinedAt,
          }
        : null,
      moderators,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validate(createCommunitySchema), async (req, res, next) => {
  try {
    const { name, slug, description, privacyType, postingPermission, iconUrl, bannerUrl, rules } = req.body;
    const normalizedSlug = slug.toLowerCase();

    const existing = await Community.findOne({ slug: normalizedSlug });
    if (existing) {
      return res.status(400).json({ error: `Community r/${slug} already exists` });
    }

    const formattedRules = (rules || []).map((r, i) => ({
      title: r.title,
      description: r.description || '',
      order: i,
    }));

    const community = await Community.create({
      name,
      slug: normalizedSlug,
      description: description || '',
      privacyType: privacyType || 'public',
      postingPermission: postingPermission || 'members_only',
      iconUrl: iconUrl || '',
      bannerUrl: bannerUrl || '',
      creator: req.user._id,
      rules: formattedRules,
      memberCount: 1,
    });

    // Creator is assigned as 'owner'
    await CommunityMember.create({
      community: community._id,
      user: req.user._id,
      role: 'owner',
    });

    res.status(201).json({ community });
  } catch (err) {
    next(err);
  }
});

router.patch('/:slug', requireAuth, validate(updateCommunitySchema), async (req, res, next) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    await verifyModerator(req.user._id, community._id);

    const { description, postingPermission, iconUrl, bannerUrl, rules } = req.body;
    if (description !== undefined) community.description = description;
    if (postingPermission !== undefined) community.postingPermission = postingPermission;
    if (iconUrl !== undefined) community.iconUrl = iconUrl;
    if (bannerUrl !== undefined) community.bannerUrl = bannerUrl;
    if (rules !== undefined) {
      community.rules = rules.map((r, i) => ({
        title: r.title,
        description: r.description || '',
        order: r.order !== undefined ? r.order : i,
      }));
    }

    await community.save();

    await ModerationLog.create({
      community: community._id,
      moderator: req.user._id,
      action: 'update_rules',
      targetId: community._id,
      targetType: 'Community',
      reason: 'Community settings updated',
    });

    res.json({ community });
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/join', requireAuth, async (req, res, next) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    if (community.privacyType === 'private') {
      return res.status(403).json({ error: 'Cannot directly join a private community. Request invitation.' });
    }

    const existing = await CommunityMember.findOne({ community: community._id, user: req.user._id });
    if (existing) {
      if (existing.isBanned) {
        return res.status(403).json({ error: 'You are banned from this community' });
      }
      return res.json({ message: 'Already a member', membership: existing });
    }

    const membership = await CommunityMember.create({
      community: community._id,
      user: req.user._id,
      role: 'member',
    });

    await Community.findByIdAndUpdate(community._id, { $inc: { memberCount: 1 } });

    res.status(201).json({ message: 'Joined community', membership });
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/leave', requireAuth, async (req, res, next) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug.toLowerCase() });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const membership = await CommunityMember.findOne({ community: community._id, user: req.user._id });
    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this community' });
    }

    if (membership.role === 'owner') {
      return res.status(400).json({ error: 'Community owner cannot leave without transferring ownership' });
    }

    await CommunityMember.deleteOne({ _id: membership._id });
    await Community.findByIdAndUpdate(community._id, { $inc: { memberCount: -1 } });

    res.json({ message: 'Left community' });
  } catch (err) {
    next(err);
  }
});

export default router;
