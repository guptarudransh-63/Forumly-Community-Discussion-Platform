import { Comment, Post, Vote, CommunityMember } from '../models/index.js';
import { createNotification } from './notificationService.js';

const MAX_DEPTH = 10;

/**
 * Creates a top-level or nested comment
 */
export async function createComment({ postId, authorId, content, parentCommentId = null }) {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  // Check if post is locked
  if (post.isLocked) {
    const membership = await CommunityMember.findOne({ community: post.community, user: authorId });
    const isMod = membership && ['owner', 'moderator'].includes(membership.role);
    if (!isMod) {
      const err = new Error('This discussion is locked');
      err.status = 403;
      throw err;
    }
  }

  let depth = 0;
  let parentComment = null;

  if (parentCommentId) {
    parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      const err = new Error('Parent comment not found');
      err.status = 404;
      throw err;
    }

    // Safety rule: Reply must belong to the exact same post
    if (parentComment.post.toString() !== postId.toString()) {
      const err = new Error('Parent comment belongs to a different post');
      err.status = 400;
      throw err;
    }

    if (parentComment.isLocked) {
      const err = new Error('This comment thread is locked');
      err.status = 403;
      throw err;
    }

    depth = Math.min((parentComment.depth || 0) + 1, MAX_DEPTH);
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    parentComment: parentCommentId,
    depth,
    content: content.trim(),
  });

  // Increment commentCount on post
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  // Notify parent author or post author
  if (parentComment && parentComment.author.toString() !== authorId.toString()) {
    await createNotification({
      recipient: parentComment.author,
      sender: authorId,
      type: 'comment_reply',
      entityId: comment._id,
      entityType: 'Comment',
      message: 'replied to your comment',
      link: `/post/${postId}?comment=${comment._id}`,
    });
  } else if (!parentComment && post.author.toString() !== authorId.toString()) {
    await createNotification({
      recipient: post.author,
      sender: authorId,
      type: 'post_reply',
      entityId: comment._id,
      entityType: 'Post',
      message: 'commented on your post',
      link: `/post/${postId}?comment=${comment._id}`,
    });
  }

  return comment.populate('author', 'username displayName avatarUrl');
}

/**
 * Retrieves nested comment tree for a post with votes and preserved thread integrity
 */
export async function getCommentsTree(postId, userId = null, sort = 'top') {
  const comments = await Comment.find({ post: postId })
    .populate('author', 'username displayName avatarUrl')
    .lean();

  let userVotesMap = {};
  if (userId && comments.length > 0) {
    const commentIds = comments.map((c) => c._id);
    const votes = await Vote.find({
      user: userId,
      targetType: 'Comment',
      targetId: { $in: commentIds },
    }).lean();

    userVotesMap = votes.reduce((acc, v) => {
      acc[v.targetId.toString()] = v.value;
      return acc;
    }, {});
  }

  // Sanitize removed comments while retaining thread structure
  const formattedList = comments.map((c) => {
    const isRemoved = c.isRemoved;
    return {
      _id: c._id,
      post: c.post,
      parentComment: c.parentComment ? c.parentComment.toString() : null,
      depth: c.depth,
      content: isRemoved ? (c.removedReason ? `[removed: ${c.removedReason}]` : '[deleted]') : c.content,
      score: c.score,
      upvoteCount: c.upvoteCount,
      downvoteCount: c.downvoteCount,
      author: isRemoved
        ? { username: '[deleted]', displayName: '[deleted]', avatarUrl: '' }
        : (c.author || { username: '[deleted]', displayName: '[deleted]', avatarUrl: '' }),
      isRemoved: c.isRemoved,
      isLocked: c.isLocked,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      userVote: userVotesMap[c._id.toString()] || 0,
      replies: [],
    };
  });

  // Build tree mapping
  const commentMap = {};
  formattedList.forEach((c) => {
    commentMap[c._id.toString()] = c;
  });

  const roots = [];

  formattedList.forEach((c) => {
    if (c.parentComment && commentMap[c.parentComment]) {
      commentMap[c.parentComment].replies.push(c);
    } else {
      roots.push(c);
    }
  });

  // Sort helper
  const sortComparator = (a, b) => {
    if (sort === 'new') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    // Default top sort
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  };

  const sortRepliesRecursively = (items) => {
    items.sort(sortComparator);
    items.forEach((item) => {
      if (item.replies && item.replies.length > 0) {
        sortRepliesRecursively(item.replies);
      }
    });
  };

  sortRepliesRecursively(roots);
  return roots;
}
