import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, Community, CommunityMember, Post } from '../src/models/index.js';
import { getFeed } from '../src/services/feedService.js';
import { calculateHotScore } from '../src/services/rankingService.js';

describe('Feeds and Ranking System', () => {
  let user, member, community, privateCommunity;

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
    ]);

    user = await User.create({
      username: 'feed_tester',
      email: 'feed@test.com',
      passwordHash: 'secret123',
    });

    member = await User.create({
      username: 'private_member',
      email: 'priv@test.com',
      passwordHash: 'secret123',
    });

    community = await Community.create({
      name: 'Public Space',
      slug: 'public_space',
      creator: user._id,
      privacyType: 'public',
    });

    privateCommunity = await Community.create({
      name: 'Secret Space',
      slug: 'secret_space',
      creator: member._id,
      privacyType: 'private',
    });

    await CommunityMember.create({
      community: privateCommunity._id,
      user: member._id,
      role: 'owner',
    });
  });

  it('correctly sorts posts by New (createdAt desc)', async () => {
    const postOld = await Post.create({
      title: 'Older Post',
      community: community._id,
      author: user._id,
      createdAt: new Date(Date.now() - 10000),
    });

    const postNew = await Post.create({
      title: 'Newer Post',
      community: community._id,
      author: user._id,
      createdAt: new Date(Date.now()),
    });

    const feed = await getFeed({ sort: 'new' });
    expect(feed.posts.length).toBe(2);
    expect(feed.posts[0]._id.toString()).toBe(postNew._id.toString());
    expect(feed.posts[1]._id.toString()).toBe(postOld._id.toString());
  });

  it('paginates cursor-based feeds cleanly without duplicating items', async () => {
    // Create 5 posts with distinct timestamps
    for (let i = 1; i <= 5; i++) {
      await Post.create({
        title: `Post ${i}`,
        community: community._id,
        author: user._id,
        createdAt: new Date(Date.now() - (6 - i) * 1000),
      });
    }

    // Page 1: limit 2
    const page1 = await getFeed({ sort: 'new', limit: 2 });
    expect(page1.posts.length).toBe(2);
    expect(page1.hasNextPage).toBe(true);
    expect(page1.nextCursor).not.toBeNull();

    // Page 2: limit 2 with cursor
    const page2 = await getFeed({ sort: 'new', limit: 2, cursor: page1.nextCursor });
    expect(page2.posts.length).toBe(2);
    expect(page2.hasNextPage).toBe(true);

    // Verify no duplicates between pages
    const page1Ids = page1.posts.map((p) => p._id.toString());
    const page2Ids = page2.posts.map((p) => p._id.toString());
    const intersection = page1Ids.filter((id) => page2Ids.includes(id));
    expect(intersection.length).toBe(0);

    // Page 3: remaining items
    const page3 = await getFeed({ sort: 'new', limit: 2, cursor: page2.nextCursor });
    expect(page3.posts.length).toBe(1);
    expect(page3.hasNextPage).toBe(false);
  });

  it('respects private community boundaries and hides private posts from unauthorized users', async () => {
    await Post.create({
      title: 'Secret Blueprint',
      community: privateCommunity._id,
      author: member._id,
    });

    await Post.create({
      title: 'Public News',
      community: community._id,
      author: user._id,
    });

    // Anonymous visitor feed
    const guestFeed = await getFeed({ feedType: 'popular' });
    expect(guestFeed.posts.length).toBe(1);
    expect(guestFeed.posts[0].title).toBe('Public News');

    // Unauthorized user feed
    const userFeed = await getFeed({ feedType: 'popular', userId: user._id });
    expect(userFeed.posts.length).toBe(1);
    expect(userFeed.posts[0].title).toBe('Public News');

    // Authorized private member feed
    const memberFeed = await getFeed({ feedType: 'popular', userId: member._id });
    expect(memberFeed.posts.length).toBe(2);
    const titles = memberFeed.posts.map((p) => p.title);
    expect(titles).toContain('Secret Blueprint');
    expect(titles).toContain('Public News');
  });
});
