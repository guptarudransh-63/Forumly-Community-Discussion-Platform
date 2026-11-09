import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, Community, Post, Vote } from '../src/models/index.js';
import { castVote } from '../src/services/votingService.js';

describe('Voting System Integrity', () => {
  let author, voter1, voter2, community, post;

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
      Vote.deleteMany({}),
    ]);

    author = await User.create({
      username: 'post_author',
      email: 'author@test.com',
      passwordHash: 'secret123',
    });

    voter1 = await User.create({
      username: 'voter_one',
      email: 'voter1@test.com',
      passwordHash: 'secret123',
    });

    voter2 = await User.create({
      username: 'voter_two',
      email: 'voter2@test.com',
      passwordHash: 'secret123',
    });

    community = await Community.create({
      name: 'Tech Test',
      slug: 'tech_test',
      creator: author._id,
    });

    post = await Post.create({
      title: 'Initial Post for Voting Test',
      body: 'Testing voting system integrity',
      community: community._id,
      author: author._id,
    });
  });

  it('registers a first upvote correctly and updates author post karma', async () => {
    const res = await castVote(voter1._id, 'Post', post._id, 1);
    expect(res.userVote).toBe(1);
    expect(res.score).toBe(1);
    expect(res.upvoteCount).toBe(1);
    expect(res.downvoteCount).toBe(0);

    const updatedPost = await Post.findById(post._id);
    expect(updatedPost.score).toBe(1);
    expect(updatedPost.upvoteCount).toBe(1);

    const updatedAuthor = await User.findById(author._id);
    expect(updatedAuthor.postKarma).toBe(1);

    const voteDoc = await Vote.findOne({ user: voter1._id, targetType: 'Post', targetId: post._id });
    expect(voteDoc).not.toBeNull();
    expect(voteDoc.value).toBe(1);
  });

  it('handles repeated upvotes idempotently without incrementing score again', async () => {
    await castVote(voter1._id, 'Post', post._id, 1);
    const res2 = await castVote(voter1._id, 'Post', post._id, 1);

    expect(res2.score).toBe(1);
    expect(res2.upvoteCount).toBe(1);

    const updatedPost = await Post.findById(post._id);
    expect(updatedPost.score).toBe(1);

    const updatedAuthor = await User.findById(author._id);
    expect(updatedAuthor.postKarma).toBe(1);
  });

  it('correctly flips vote from upvote to downvote (-2 score delta)', async () => {
    await castVote(voter1._id, 'Post', post._id, 1);
    const flipRes = await castVote(voter1._id, 'Post', post._id, -1);

    expect(flipRes.userVote).toBe(-1);
    expect(flipRes.score).toBe(-1);
    expect(flipRes.upvoteCount).toBe(0);
    expect(flipRes.downvoteCount).toBe(1);

    const updatedPost = await Post.findById(post._id);
    expect(updatedPost.score).toBe(-1);

    const updatedAuthor = await User.findById(author._id);
    expect(updatedAuthor.postKarma).toBe(-1);
  });

  it('removes vote cleanly when requested with value 0', async () => {
    await castVote(voter1._id, 'Post', post._id, 1);
    const removeRes = await castVote(voter1._id, 'Post', post._id, 0);

    expect(removeRes.userVote).toBe(0);
    expect(removeRes.score).toBe(0);
    expect(removeRes.upvoteCount).toBe(0);

    const voteRecord = await Vote.findOne({ user: voter1._id, targetType: 'Post', targetId: post._id });
    expect(voteRecord).toBeNull();

    const updatedAuthor = await User.findById(author._id);
    expect(updatedAuthor.postKarma).toBe(0);
  });

  it('aggregates votes from multiple distinct users accurately', async () => {
    await castVote(voter1._id, 'Post', post._id, 1);
    const res = await castVote(voter2._id, 'Post', post._id, 1);

    expect(res.score).toBe(2);
    expect(res.upvoteCount).toBe(2);

    const updatedAuthor = await User.findById(author._id);
    expect(updatedAuthor.postKarma).toBe(2);
  });

  it('rejects voting on a removed post', async () => {
    post.isRemoved = true;
    await post.save();

    await expect(castVote(voter1._id, 'Post', post._id, 1)).rejects.toThrow('Cannot vote on removed post');
  });
});
