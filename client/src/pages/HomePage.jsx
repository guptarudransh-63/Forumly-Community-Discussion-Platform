import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { PostCard } from '../components/post/PostCard';
import { SortBar } from '../components/post/SortBar';
import { RightSidebar } from '../components/layout/RightSidebar';
import { Button } from '../components/common/Button';
import { MessageSquareOff } from 'lucide-react';

export const HomePage = () => {
  const [searchParams] = useSearchParams();
  const feedType = searchParams.get('feed') || 'popular';

  const [sort, setSort] = useState('hot');
  const [timeWindow, setTimeWindow] = useState('all');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', feedType, sort, timeWindow],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({
        feedType,
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
  });

  const posts = data?.pages?.flatMap((page) => page.posts) || [];

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <SortBar
          sort={sort}
          setSort={setSort}
          timeWindow={timeWindow}
          setTimeWindow={setTimeWindow}
        />

        {isLoading ? (
          /* Skeletons */
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm animate-pulse space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 text-xs">
            {error.message || 'Error loading feed'}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm space-y-3">
            <MessageSquareOff className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No posts in this feed yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {feedType === 'following'
                ? 'You have not joined any active communities yet. Browse popular communities and join to curate your personal feed.'
                : 'Be the first to publish a post and start the conversation!'}
            </p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onPostDelete={() => refetch()}
                onPostUpdate={() => refetch()}
              />
            ))}

            {hasNextPage && (
              <div className="py-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  isLoading={isFetchingNextPage}
                >
                  Load More Discussions
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <RightSidebar />
    </div>
  );
};
