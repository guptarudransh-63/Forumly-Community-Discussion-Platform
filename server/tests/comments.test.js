import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, Community, Post, Comment } from '../src/models/index.js';
import { createComment, getCommentsTree } from '../src/services/commentService.js';

describe('Comment Tree System', () => {
  let user, community, post, otherPost;

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
      Post.deleteMany({}),
      Comment.deleteMany({}),
    ]);

    user = await User.create({
      username: 'thread_author',
      email: 'thread@test.com',
      passwordHash: 'secret123',
    });

    community = await Community.create({
      name: 'Discussion Community',
      slug: 'discuss',
      creator: user._id,
    });

    post = await Post.create({
      title: 'Main Discussion Post',
      community: community._id,
      author: user._id,
    });

    otherPost = await Post.create({
      title: 'Other Post',
      community: community._id,
      author: user._id,
    });
  });

  it('creates top-level comment and increments post commentCount', async () => {
    const comment = await createComment({
      postId: post._id,
      authorId: user._id,
      content: 'This is a top-level comment.',
    });

    expect(comment.depth).toBe(0);
    expect(comment.parentComment).toBeNull();

    const updatedPost = await Post.findById(post._id);
    expect(updatedPost.commentCount).toBe(1);
  });

  it('creates nested replies and sets depth correctly', async () => {
    const parent = await createComment({
      postId: post._id,
      authorId: user._id,
      content: 'Parent comment',
    });

    const reply = await createComment({
      postId: post._id,
      authorId: user._id,
      content: 'Nested reply',
      parentCommentId: parent._id,
    });

    expect(reply.depth).toBe(1);
    expect(reply.parentComment.toString()).toBe(parent._id.toString());

    const tree = await getCommentsTree(post._id);
    expect(tree.length).toBe(1);
    expect(tree[0]._id.toString()).toBe(parent._id.toString());
    expect(tree[0].replies.length).toBe(1);
    expect(tree[0].replies[0]._id.toString()).toBe(reply._id.toString());
  });

  it('rejects a reply when the parentComment belongs to a different post', async () => {
    const foreignComment = await createComment({
      postId: otherPost._id,
      authorId: user._id,
      content: 'Comment on other post',
    });

    await expect(
      createComment({
        postId: post._id,
        authorId: user._id,
        content: 'Illegal cross-post reply',
        parentCommentId: foreignComment._id,
      })
    ).rejects.toThrow('Parent comment belongs to a different post');
  });

  it('preserves child replies when parent comment is marked as deleted/removed', async () => {
    const parent = await createComment({
      postId: post._id,
      authorId: user._id,
      content: 'Will be deleted soon',
    });

    const child = await createComment({
      postId: post._id,
      authorId: user._id,
      content: 'Child remains visible',
      parentCommentId: parent._id,
    });

    // Mark parent as removed
    parent.isRemoved = true;
    parent.removedReason = 'Deleted by user';
    await parent.save();

    const tree = await getCommentsTree(post._id);
    expect(tree.length).toBe(1);
    expect(tree[0].content).toContain('[removed: Deleted by user]');
    expect(tree[0].author.username).toBe('[deleted]');
    expect(tree[0].replies.length).toBe(1);
    expect(tree[0].replies[0].content).toBe('Child remains visible');
  });

  it('enforces locked discussion constraints on comment creation', async () => {
    post.isLocked = true;
    await post.save();

    await expect(
      createComment({
        postId: post._id,
        authorId: user._id,
        content: 'Attempting to reply to locked thread',
      })
    ).rejects.toThrow('This discussion is locked');
  });
});
