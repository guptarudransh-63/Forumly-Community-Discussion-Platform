import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { PostCard } from '../components/post/PostCard';
import { Button } from '../components/common/Button';
import { Bookmark } from 'lucide-react';

export const SavedPostsPage = () => {
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
    queryKey: ['saved-posts'],
    queryFn: async ({ pageParam = null }) => {
      const url = pageParam ? `/saved-posts?cursor=${pageParam}` : '/saved-posts';
      const res = await api.get(url);
      return res.data;
    },
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    initialPageParam: null,
  });

  const posts = data?.pages?.flatMap((page) => page.posts) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Bookmark className="w-5 h-5 text-brand-500" />
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Saved Posts
        </h1>
      </div>

      {isLoading ? (
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
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 text-xs">
          {error.message}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm space-y-2">
          <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">No saved posts</h3>
          <p className="text-xs text-slate-500">
            Posts you bookmark will appear here for easy reference.
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostUpdate={() => refetch()}
              onPostDelete={() => refetch()}
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
  );
};
