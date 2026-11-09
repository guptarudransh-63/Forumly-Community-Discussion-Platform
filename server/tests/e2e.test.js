import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, Community, CommunityMember, Post, Comment, Vote, SavedPost, Report, ModerationLog } from '../src/models/index.js';

describe('Forumly E2E Complete User Journey', () => {
  let app;
  let user1Cookie, user2Cookie;
  let user1, user2;
  let communitySlug, communityId;
  let postId;
  let commentId, replyId;
  let reportId;

  beforeAll(async () => {
    await connectDB();
    app = createApp();

    await Promise.all([
      User.deleteMany({}),
      Community.deleteMany({}),
      CommunityMember.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Vote.deleteMany({}),
      SavedPost.deleteMany({}),
      Report.deleteMany({}),
      ModerationLog.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('Step 1: User 1 and User 2 register successfully', async () => {
    const res1 = await request(app).post('/api/v1/auth/register').send({
      username: 'alice_creator',
      email: 'alice@journey.com',
      password: 'Password123!',
      displayName: 'Alice C.',
    });
    expect(res1.status).toBe(201);
    expect(res1.body.user.username).toBe('alice_creator');
    user1 = res1.body.user;
    user1Cookie = res1.headers['set-cookie'];

    const res2 = await request(app).post('/api/v1/auth/register').send({
      username: 'bob_member',
      email: 'bob@journey.com',
      password: 'Password123!',
      displayName: 'Bob M.',
    });
    expect(res2.status).toBe(201);
    expect(res2.body.user.username).toBe('bob_member');
    user2 = res2.body.user;
    user2Cookie = res2.headers['set-cookie'];
  });

  it('Step 2: User 1 creates a community', async () => {
    const res = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', user1Cookie)
      .send({
        name: 'Space Science',
        slug: 'spacescience',
        description: 'Deep discussions on astrophysics, telescopes, and rocketry.',
        privacyType: 'public',
        postingPermission: 'members_only',
      });

    expect(res.status).toBe(201);
    expect(res.body.community.slug).toBe('spacescience');
    communitySlug = res.body.community.slug;
    communityId = res.body.community._id;
  });

  it('Step 3: User 2 joins the community', async () => {
    const res = await request(app)
      .post(`/api/v1/communities/${communitySlug}/join`)
      .set('Cookie', user2Cookie);

    expect(res.status).toBe(201);
    expect(res.body.membership.role).toBe('member');
  });

  it('Step 4: User 2 creates a text post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Cookie', user2Cookie)
      .send({
        title: 'JWST Discovers Earliest Massive Galaxies in the Cosmic Dawn',
        body: 'Spectroscopic analysis confirms these galaxies formed only 350 million years after the Big Bang.',
        postType: 'text',
        communityId: communityId,
      });

    expect(res.status).toBe(201);
    expect(res.body.post.title).toContain('JWST Discovers');
    postId = res.body.post._id;
  });

  it('Step 5 & 6 & 7: Upvoting, vote flipping, and score integrity', async () => {
    // 5. User 1 upvotes the post
    const upRes = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', user1Cookie)
      .send({
        targetType: 'Post',
        targetId: postId,
        value: 1,
      });
    expect(upRes.status).toBe(200);
    expect(upRes.body.score).toBe(1);
    expect(upRes.body.userVote).toBe(1);

    // 6. User 1 flips their vote to downvote (-1)
    const downRes = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', user1Cookie)
      .send({
        targetType: 'Post',
        targetId: postId,
        value: -1,
      });
    expect(downRes.status).toBe(200);

    // 7. Score remains correct (-1)
    expect(downRes.body.score).toBe(-1);
    expect(downRes.body.userVote).toBe(-1);
    expect(downRes.body.upvoteCount).toBe(0);
    expect(downRes.body.downvoteCount).toBe(1);

    // Change back to upvote for subsequent steps
    await request(app)
      .post('/api/v1/votes')
      .set('Cookie', user1Cookie)
      .send({ targetType: 'Post', targetId: postId, value: 1 });
  });

  it('Step 8: Nested threaded comments creation', async () => {
    // Top-level comment by User 1
    const res1 = await request(app)
      .post('/api/v1/comments')
      .set('Cookie', user1Cookie)
      .send({
        postId: postId,
        content: 'Fascinating spectroscopic observations. Do we have confirmation of the metallicity?',
      });
    expect(res1.status).toBe(201);
    commentId = res1.body.comment._id;

    // Nested reply by User 2
    const res2 = await request(app)
      .post('/api/v1/comments')
      .set('Cookie', user2Cookie)
      .send({
        postId: postId,
        parentCommentId: commentId,
        content: 'Yes! The NIRSpec prism shows extremely low metallicity (Pop III candidate stars).',
      });
    expect(res2.status).toBe(201);
    expect(res2.body.comment.depth).toBe(1);
    replyId = res2.body.comment._id;

    // Fetch tree
    const treeRes = await request(app).get(`/api/v1/comments/post/${postId}`);
    expect(treeRes.status).toBe(200);
    expect(treeRes.body.comments.length).toBe(1);
    expect(treeRes.body.comments[0].replies.length).toBe(1);
  });

  it('Step 9 & 10: Saving post and viewing in saved posts page', async () => {
    // Save post as User 1
    const saveRes = await request(app)
      .post(`/api/v1/saved-posts/${postId}`)
      .set('Cookie', user1Cookie);
    expect(saveRes.status).toBe(201);

    // View saved posts
    const listRes = await request(app)
      .get('/api/v1/saved-posts')
      .set('Cookie', user1Cookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.posts.length).toBe(1);
    expect(listRes.body.posts[0]._id.toString()).toBe(postId.toString());
  });

  it('Step 11, 12, 13: Reporting, moderator resolution, and audit history', async () => {
    // 11. User 1 reports comment
    const reportRes = await request(app)
      .post('/api/v1/moderation/report')
      .set('Cookie', user1Cookie)
      .send({
        targetType: 'Comment',
        targetId: replyId,
        communityId: communityId,
        reason: 'rule_violation',
        description: 'Testing comment moderation workflow',
      });
    expect(reportRes.status).toBe(201);
    reportId = reportRes.body.report._id;

    // 12. Community Owner (Alice) reviews and resolves report
    const resolveRes = await request(app)
      .patch(`/api/v1/moderation/reports/${reportId}`)
      .set('Cookie', user1Cookie)
      .send({
        status: 'resolved',
        resolutionNotes: 'Reviewed and confirmed compliant with community rules',
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.report.status).toBe('resolved');

    // 13. Audit log contains resolution
    const logRes = await request(app)
      .get(`/api/v1/moderation/communities/${communitySlug}/logs`)
      .set('Cookie', user1Cookie);
    expect(logRes.status).toBe(200);
    expect(logRes.body.logs.length).toBeGreaterThan(0);
  });

  it('Step 14 & 15: Post appears in feeds and global search', async () => {
    // 14. Feed
    const feedRes = await request(app).get('/api/v1/feeds?feedType=popular&sort=new');
    expect(feedRes.status).toBe(200);
    const postIds = feedRes.body.posts.map((p) => p._id.toString());
    expect(postIds).toContain(postId.toString());

    // 15. Search
    const searchRes = await request(app).get('/api/v1/search?q=JWST&type=posts');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.posts.length).toBeGreaterThan(0);
    expect(searchRes.body.posts[0].title).toContain('JWST');
  });

  it('Step 16 & 17: Private community privacy and cursor pagination', async () => {
    // Create private community by Alice
    const privRes = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', user1Cookie)
      .send({
        name: 'Classified Mission',
        slug: 'classifiedmission',
        privacyType: 'private',
      });
    const privSlug = privRes.body.community.slug;

    // Unauthorized Bob attempts to view private community
    const forbiddenRes = await request(app)
      .get(`/api/v1/communities/${privSlug}`)
      .set('Cookie', user2Cookie);
    expect(forbiddenRes.status).toBe(403);

    // 17. Stable pagination without duplicates
    const p1 = await request(app).get('/api/v1/feeds?limit=1');
    expect(p1.status).toBe(200);
    expect(p1.body.posts.length).toBe(1);

    if (p1.body.nextCursor) {
      const p2 = await request(app).get(`/api/v1/feeds?limit=1&cursor=${p1.body.nextCursor}`);
      expect(p2.status).toBe(200);
      if (p2.body.posts.length > 0) {
        expect(p2.body.posts[0]._id).not.toBe(p1.body.posts[0]._id);
      }
    }
  });
});
