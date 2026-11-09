import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, Community, CommunityMember, Post, Report, ModerationLog } from '../src/models/index.js';
import {
  removePost,
  restorePost,
  banMember,
  unbanMember,
  resolveReport,
} from '../src/services/moderationService.js';

describe('Community Moderation & Audit System', () => {
  let owner, mod, member, rogue, community, post;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Community.deleteMany({}),
      CommunityMember.deleteMany({}),
      Post.deleteMany({}),
      Report.deleteMany({}),
      ModerationLog.deleteMany({}),
    ]);

    owner = await User.create({ username: 'owner_user', email: 'owner@test.com', passwordHash: 'secret' });
    mod = await User.create({ username: 'mod_user', email: 'mod@test.com', passwordHash: 'secret' });
    member = await User.create({ username: 'member_user', email: 'member@test.com', passwordHash: 'secret' });
    rogue = await User.create({ username: 'rogue_user', email: 'rogue@test.com', passwordHash: 'secret' });

    community = await Community.create({
      name: 'Mod Test Community',
      slug: 'mod_test',
      creator: owner._id,
    });

    await CommunityMember.create([
      { community: community._id, user: owner._id, role: 'owner' },
      { community: community._id, user: mod._id, role: 'moderator' },
      { community: community._id, user: member._id, role: 'member' },
    ]);

    post = await Post.create({
      title: 'Flagged Post Content',
      body: 'Questionable text needing moderation',
      community: community._id,
      author: member._id,
    });
  });

  it('allows authorized moderators to remove posts and writes an audit log', async () => {
    const updatedPost = await removePost(mod._id, post._id, 'Spam and off-topic');
    expect(updatedPost.isRemoved).toBe(true);
    expect(updatedPost.removedReason).toBe('Spam and off-topic');
    expect(updatedPost.removedBy.toString()).toBe(mod._id.toString());

    // Check audit log
    const auditLog = await ModerationLog.findOne({
      community: community._id,
      action: 'remove_post',
      targetId: post._id,
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog.moderator.toString()).toBe(mod._id.toString());
    expect(auditLog.reason).toBe('Spam and off-topic');
  });

  it('rejects unauthorized users from removing posts', async () => {
    await expect(removePost(rogue._id, post._id, 'Trolling')).rejects.toThrow(
      'You do not have moderator privileges in this community'
    );
  });

  it('bans and unbans a member correctly while logging audit entries', async () => {
    await banMember(mod._id, community._id, rogue._id, 'Repeated harassment');

    const bannedRecord = await CommunityMember.findOne({ community: community._id, user: rogue._id });
    expect(bannedRecord).not.toBeNull();
    expect(bannedRecord.isBanned).toBe(true);
    expect(bannedRecord.banReason).toBe('Repeated harassment');

    const banLog = await ModerationLog.findOne({ community: community._id, action: 'ban_user' });
    expect(banLog).not.toBeNull();
    expect(banLog.targetId.toString()).toBe(rogue._id.toString());

    // Unban
    await unbanMember(mod._id, community._id, rogue._id);
    const unbannedRecord = await CommunityMember.findOne({ community: community._id, user: rogue._id });
    expect(unbannedRecord.isBanned).toBe(false);
  });

  it('resolves reports and marks resolution metadata', async () => {
    const report = await Report.create({
      reporter: member._id,
      targetType: 'Post',
      targetId: post._id,
      community: community._id,
      reason: 'spam',
      description: 'Report description',
      status: 'open',
    });

    const resolved = await resolveReport(mod._id, report._id, 'resolved', 'Post removed and warning issued');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedBy.toString()).toBe(mod._id.toString());
    expect(resolved.resolutionNotes).toBe('Post removed and warning issued');
  });
});
