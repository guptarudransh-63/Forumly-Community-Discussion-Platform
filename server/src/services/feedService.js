import { Post, Community, CommunityMember, Vote, SavedPost } from '../models/index.js';
import { encodeCursor, decodeCursor, buildCursorQuery } from './rankingService.js';

/**
 * Resolves list of accessible community IDs for a user based on community privacy settings
 * @param {string|null} userId
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
export async function getAccessibleCommunityIds(userId) {
  // Public communities are accessible to everyone
  const publicCommunities = await Community.find({ privacyType: { $in: ['public', 'restricted'] }, isArchived: false }).select('_id');
  const accessibleIds = publicCommunities.map((c) => c._id);

  if (userId) {
    // If authenticated, also include private communities where the user is an active, non-banned member
    const privateMemberships = await CommunityMember.find({
      user: userId,
      isBanned: false,
    }).populate('community', 'privacyType isArchived');

    privateMemberships.forEach((m) => {
      if (m.community && m.community.privacyType === 'private' && !m.community.isArchived) {
        accessibleIds.push(m.community._id);
      }
    });
  }

  return accessibleIds;
}

/**
 * Builds and executes cursor-paginated feed queries
 */
export async function getFeed({
  feedType = 'popular',
  sort = 'hot',
  timeWindow = 'all',
  communitySlug = null,
  userId = null,
  cursor = null,
  limit = 20,
}) {
  const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const baseQuery = { isRemoved: false };

  // 1. Determine community scope
  if (communitySlug) {
    const community = await Community.findOne({ slug: communitySlug });
    if (!community) {
      const err = new Error('Community not found');
      err.status = 404;
      throw err;
    }

    if (community.privacyType === 'private') {
      if (!userId) {
        const err = new Error('Authentication required for private community');
        err.status = 401;
        throw err;
      }
      const member = await CommunityMember.findOne({ community: community._id, user: userId, isBanned: false });
      if (!member) {
        const err = new Error('You do not have access to this private community');
        err.status = 403;
        throw err;
      }
    }

    baseQuery.community = community._id;
  } else if (feedType === 'following' || feedType === 'home') {
    if (userId) {
      const joined = await CommunityMember.find({ user: userId, isBanned: false }).select('community');
      const joinedIds = joined.map((j) => j.community);

      if (joinedIds.length > 0) {
        baseQuery.community = { $in: joinedIds };
      } else if (feedType === 'home') {
        // Fallback for home feed if no joined communities: popular public posts
        const accessible = await getAccessibleCommunityIds(userId);
        baseQuery.community = { $in: accessible };
      } else {
        // Following feed with 0 joined communities returns empty list
        return { posts: [], nextCursor: null, hasNextPage: false };
      }
    } else {
      // Guest on home feed views popular public posts
      const accessible = await getAccessibleCommunityIds(null);
      baseQuery.community = { $in: accessible };
    }
  } else {
    // Popular or Latest
    const accessible = await getAccessibleCommunityIds(userId);
    baseQuery.community = { $in: accessible };
  }

  // 2. Apply Time Window for 'top' sort
  if (sort === 'top' && timeWindow !== 'all') {
    const now = new Date();
    let startDate = new Date();
    if (timeWindow === 'today') {
      startDate.setHours(now.getHours() - 24);
    } else if (timeWindow === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeWindow === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeWindow === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    baseQuery.createdAt = { $gte: startDate };
  }

  // 3. Determine sort configuration
  let sortField = 'hotRankScore';
  let sortObj = { hotRankScore: -1, _id: -1 };

  if (sort === 'new') {
    sortField = 'createdAt';
    sortObj = { createdAt: -1, _id: -1 };
  } else if (sort === 'top') {
    sortField = 'score';
    sortObj = { score: -1, _id: -1 };
  }

  // 4. Cursor query
  const cursorClause = buildCursorQuery(sortField, 'desc', cursor);
  const finalQuery = { ...baseQuery, ...cursorClause };

  // 5. Execute query (fetching limit + 1 to detect next page)
  const posts = await Post.find(finalQuery)
    .sort(sortObj)
    .limit(pageLimit + 1)
    .populate('author', 'username displayName avatarUrl')
    .populate('community', 'name slug iconUrl privacyType')
    .lean();

  const hasNextPage = posts.length > pageLimit;
  const items = hasNextPage ? posts.slice(0, pageLimit) : posts;

  // 6. Enrich with user vote & saved state if authenticated
  let userVotesMap = {};
  let savedPostsMap = {};

  if (userId && items.length > 0) {
    const postIds = items.map((p) => p._id);

    const [votes, saved] = await Promise.all([
      Vote.find({ user: userId, targetType: 'Post', targetId: { $in: postIds } }).lean(),
      SavedPost.find({ user: userId, post: { $in: postIds } }).lean(),
    ]);

    userVotesMap = votes.reduce((acc, v) => {
      acc[v.targetId.toString()] = v.value;
      return acc;
    }, {});

    savedPostsMap = saved.reduce((acc, s) => {
      acc[s.post.toString()] = true;
      return acc;
    }, {});
  }

  const enrichedPosts = items.map((post) => ({
    ...post,
    userVote: userVotesMap[post._id.toString()] || 0,
    isSaved: Boolean(savedPostsMap[post._id.toString()]),
  }));

  // 7. Compute next cursor
  let nextCursor = null;
  if (hasNextPage && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = encodeCursor(lastItem[sortField], lastItem._id);
  }

  return {
    posts: enrichedPosts,
    nextCursor,
    hasNextPage,
  };
}
