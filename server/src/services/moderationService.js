import { Community, CommunityMember, Post, Comment, Report, ModerationLog, User } from '../models/index.js';

/**
 * Checks if a user has moderation authority over a given community
 */
export async function verifyModerator(userId, communityId) {
  if (!userId) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const user = await User.findById(userId);
  if (user && user.role === 'admin') {
    return { isAuthorized: true, role: 'admin' };
  }

  const membership = await CommunityMember.findOne({
    community: communityId,
    user: userId,
    isBanned: false,
  });

  if (!membership || !['owner', 'moderator'].includes(membership.role)) {
    const err = new Error('You do not have moderator privileges in this community');
    err.status = 403;
    throw err;
  }

  return { isAuthorized: true, role: membership.role };
}

/**
 * Removes a post as a moderator action
 */
export async function removePost(moderatorId, postId, reason = '') {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  await verifyModerator(moderatorId, post.community);

  post.isRemoved = true;
  post.removedReason = reason || 'Removed by moderator';
  post.removedBy = moderatorId;
  await post.save();

  await ModerationLog.create({
    community: post.community,
    moderator: moderatorId,
    action: 'remove_post',
    targetId: post._id,
    targetType: 'Post',
    reason,
    metadata: { title: post.title },
  });

  return post;
}

/**
 * Restores a previously removed post
 */
export async function restorePost(moderatorId, postId) {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  await verifyModerator(moderatorId, post.community);

  post.isRemoved = false;
  post.removedReason = '';
  post.removedBy = null;
  await post.save();

  await ModerationLog.create({
    community: post.community,
    moderator: moderatorId,
    action: 'restore_post',
    targetId: post._id,
    targetType: 'Post',
  });

  return post;
}

/**
 * Locks or unlocks comments on a post
 */
export async function setPostLock(moderatorId, postId, isLocked) {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  await verifyModerator(moderatorId, post.community);

  post.isLocked = isLocked;
  await post.save();

  await ModerationLog.create({
    community: post.community,
    moderator: moderatorId,
    action: isLocked ? 'lock_post' : 'unlock_post',
    targetId: post._id,
    targetType: 'Post',
  });

  return post;
}

/**
 * Pins or unpins a post in a community
 */
export async function setPostPin(moderatorId, postId, isPinned) {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  await verifyModerator(moderatorId, post.community);

  post.isPinned = isPinned;
  await post.save();

  await ModerationLog.create({
    community: post.community,
    moderator: moderatorId,
    action: isPinned ? 'pin_post' : 'unpin_post',
    targetId: post._id,
    targetType: 'Post',
  });

  return post;
}

/**
 * Removes a comment as a moderator
 */
export async function removeComment(moderatorId, commentId, reason = '') {
  const comment = await Comment.findById(commentId).populate('post');
  if (!comment) {
    const err = new Error('Comment not found');
    err.status = 404;
    throw err;
  }

  await verifyModerator(moderatorId, comment.post.community);

  comment.isRemoved = true;
  comment.removedReason = reason || 'Removed by moderator';
  comment.removedBy = moderatorId;
  await comment.save();

  await ModerationLog.create({
    community: comment.post.community,
    moderator: moderatorId,
    action: 'remove_comment',
    targetId: comment._id,
    targetType: 'Comment',
    reason,
  });

  return comment;
}

/**
 * Bans a user from a community
 */
export async function banMember(moderatorId, communityId, targetUserId, reason = '') {
  await verifyModerator(moderatorId, communityId);

  // Prevent banning self
  if (moderatorId.toString() === targetUserId.toString()) {
    const err = new Error('Cannot ban yourself');
    err.status = 400;
    throw err;
  }

  let membership = await CommunityMember.findOne({ community: communityId, user: targetUserId });
  if (!membership) {
    membership = new CommunityMember({
      community: communityId,
      user: targetUserId,
      role: 'member',
    });
  }

  membership.isBanned = true;
  membership.bannedAt = new Date();
  membership.banReason = reason;
  await membership.save();

  await ModerationLog.create({
    community: communityId,
    moderator: moderatorId,
    action: 'ban_user',
    targetId: targetUserId,
    targetType: 'User',
    reason,
  });

  return membership;
}

/**
 * Unbans a user from a community
 */
export async function unbanMember(moderatorId, communityId, targetUserId) {
  await verifyModerator(moderatorId, communityId);

  const membership = await CommunityMember.findOne({ community: communityId, user: targetUserId });
  if (membership) {
    membership.isBanned = false;
    membership.bannedAt = null;
    membership.banReason = '';
    await membership.save();
  }

  await ModerationLog.create({
    community: communityId,
    moderator: moderatorId,
    action: 'unban_user',
    targetId: targetUserId,
    targetType: 'User',
  });

  return membership;
}

/**
 * Resolves or dismisses a report
 */
export async function resolveReport(moderatorId, reportId, status, resolutionNotes = '') {
  const report = await Report.findById(reportId);
  if (!report) {
    const err = new Error('Report not found');
    err.status = 404;
    throw err;
  }

  if (report.community) {
    await verifyModerator(moderatorId, report.community);
  }

  report.status = status;
  report.resolvedBy = moderatorId;
  report.resolutionNotes = resolutionNotes;
  await report.save();

  if (report.community) {
    await ModerationLog.create({
      community: report.community,
      moderator: moderatorId,
      action: status === 'dismissed' ? 'dismiss_report' : 'resolve_report',
      targetId: report._id,
      targetType: 'Report',
      reason: resolutionNotes,
    });
  }

  return report;
}
