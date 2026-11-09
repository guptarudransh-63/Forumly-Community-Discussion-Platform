import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, CommunityMember } from '../models/index.js';
import { config } from '../config/env.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and hyphens'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().max(50).optional(),
});

const loginSchema = z.object({
  login: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(statusCode).json({
    user: user.toSafeJSON(),
    token,
  });
};

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    const existing = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
    });

    if (existing) {
      if (existing.username === username.toLowerCase()) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const user = new User({
      username,
      email,
      passwordHash: password,
      displayName: displayName || username,
    });

    await user.save();
    return sendAuthResponse(res, user, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { login, password } = req.body;
    const normalized = login.toLowerCase().trim();

    const user = await User.findOne({
      $or: [{ username: normalized }, { email: normalized }],
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    return sendAuthResponse(res, user, 200);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Successfully signed out' });
});

router.get('/me', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ user: null });
    }

    const memberships = await CommunityMember.find({
      user: req.user._id,
      isBanned: false,
    }).populate('community', 'name slug iconUrl memberCount privacyType');

    const joinedCommunities = memberships
      .filter((m) => m.community != null)
      .map((m) => ({
        ...m.community.toObject(),
        role: m.role,
      }));

    res.json({
      user: req.user.toSafeJSON(),
      joinedCommunities,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
