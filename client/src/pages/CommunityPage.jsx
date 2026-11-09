import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { PostCard } from '../components/post/PostCard';
import { SortBar } from '../components/post/SortBar';
import { RightSidebar } from '../components/layout/RightSidebar';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../context/SocketContext';
import { Plus, Shield, Globe, Lock, EyeOff } from 'lucide-react';

export const CommunityPage = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, addJoinedCommunity, removeJoinedCommunity } = useAuthStore();
  const socket = useSocket();

  const [sort, setSort] = useState('hot');
  const [timeWindow, setTimeWindow] = useState('all');
  const [isJoinLoading, setIsJoinLoading] = useState(false);

  // Subscribe to community room for real-time posts
  useEffect(() => {
    if (!socket || !slug) return;

    socket.emit('join:community', slug);

    const handleNewPost = () => {
      refetchPosts();
    };

    socket.on('post:new', handleNewPost);

    return () => {
      socket.emit('leave:community', slug);
      socket.off('post:new', handleNewPost);
    };
  }, [socket, slug]);

  // Fetch Community Details & Member Status
  const {
    data: communityData,
    isLoading: isCommunityLoading,
    isError: isCommunityError,
    error: communityError,
    refetch: refetchCommunity,
  } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api.get(`/communities/${slug}`);
      return res.data;
    },
  });

  // Fetch Community Posts with Cursor Pagination
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isPostsLoading,
    refetch: refetchPosts,
  } = useInfiniteQuery({
    queryKey: ['community-posts', slug, sort, timeWindow],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({
        feedType: 'community',
        communitySlug: slug,
        sort,
        timeWindow,
        limit: '15',
      });
      if (pageParam) params.set('cursor', pageParam);

      const res = await api.get(`/feeds?${params.toString()}`);
      return res.data;
    },
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    initialPageParam: null,
    enabled: Boolean(communityData?.community),
  });

  const community = communityData?.community;
  const userMembership = communityData?.userMembership;
  const moderators = communityData?.moderators || [];
  const isJoined = Boolean(userMembership && !userMembership.isBanned);
  const isModerator = Boolean(userMembership && ['owner', 'moderator'].includes(userMembership.role));

  const handleJoinToggle = async () => {
    if (!isAuthenticated) {
      alert('Sign in to join communities');
      return;
    }

    setIsJoinLoading(true);
    try {
      if (isJoined) {
        await api.post(`/communities/${slug}/leave`);
        removeJoinedCommunity(slug);
      } else {
        const res = await api.post(`/communities/${slug}/join`);
        addJoinedCommunity(res.data.membership.community || community);
      }
      refetchCommunity();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsJoinLoading(false);
    }
  };

  if (isCommunityLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
      </div>
    );
  }

  if (isCommunityError) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-8 text-center text-red-600 dark:text-red-400 space-y-2">
        <h3 className="font-bold text-sm">Community Unavailable</h3>
        <p className="text-xs">{communityError.message}</p>
        <Link to="/" className="inline-block mt-2 text-xs font-semibold text-brand-500 hover:underline">
          Return to Home Feed
        </Link>
      </div>
    );
  }

  const posts = postsData?.pages?.flatMap((page) => page.posts) || [];

  return (
    <div className="space-y-6">
      {/* Header Banner & Metadata */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-36 sm:h-48 w-full bg-gradient-to-r from-brand-500 to-amber-500 relative">
          {community.bannerUrl && (
            <img
              src={community.bannerUrl}
              alt={community.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Info Strip */}
        <div className="px-6 pb-6 pt-3 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-4">
            <div className="flex items-end gap-4">
              <Avatar
                src={community.iconUrl}
                name={community.name}
                size="xl"
                className="ring-4 ring-white dark:ring-slate-900 bg-white"
              />
              <div className="pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {community.name}
                  </h1>
                  {community.privacyType === 'private' ? (
                    <Badge variant="warning" className="gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </Badge>
                  ) : community.privacyType === 'restricted' ? (
                    <Badge variant="default" className="gap-1">
                      <EyeOff className="w-3 h-3" /> Restricted
                    </Badge>
                  ) : (
                    <Badge variant="brand" className="gap-1">
                      <Globe className="w-3 h-3" /> Public
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-500">r/{community.slug}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <Link to={`/create-post?community=${community._id}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Create Post
                </Button>
              </Link>

              {userMembership?.role !== 'owner' && (
                <Button
                  variant={isJoined ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleJoinToggle}
                  isLoading={isJoinLoading}
                >
                  {isJoined ? 'Joined' : 'Join Community'}
                </Button>
              )}

              {isModerator && (
                <Link to={`/r/${community.slug}/mod`}>
                  <Button variant="secondary" size="sm" className="gap-1.5">
                    <Shield className="w-4 h-4 text-brand-500" /> Mod Queue
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stream with RightSidebar */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <SortBar
            sort={sort}
            setSort={setSort}
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
          />

          {isPostsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm animate-pulse space-y-3"
                >
                  <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No posts in r/{community.slug} yet
              </h3>
              <p className="text-xs text-slate-500">
                Be the first to share a discussion or article with the community!
              </p>
              <Link to={`/create-post?community=${community._id}`}>
                <Button variant="primary" size="sm" className="mt-2">
                  Create First Post
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  isModerator={isModerator}
                  onPostDelete={() => refetchPosts()}
                  onPostUpdate={() => refetchPosts()}
                />
              ))}

              {hasNextPage && (
                <div className="py-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    isLoading={isFetchingNextPage}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <RightSidebar
          community={community}
          userMembership={userMembership}
          moderators={moderators}
        />
      </div>
    </div>
  );
};
