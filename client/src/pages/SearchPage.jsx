import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { PostCard } from '../components/post/PostCard';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Search, Users, Layers, FileText } from 'lucide-react';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState('all');
  const [queryInput, setQueryInput] = useState(q);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, activeTab],
    queryFn: async () => {
      if (!q.trim()) return { posts: [], communities: [], users: [] };
      const res = await api.get(`/search?q=${encodeURIComponent(q)}&type=${activeTab}`);
      return res.data;
    },
    enabled: Boolean(q.trim()),
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (queryInput.trim()) {
      setSearchParams({ q: queryInput.trim() });
    }
  };

  const posts = data?.posts || [];
  const communities = data?.communities || [];
  const users = data?.users || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Search for posts, communities, or users..."
          className="w-full pl-12 pr-28 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-brand-500"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
        >
          Search
        </Button>
      </form>

      {/* Type Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'all', label: 'All Results' },
          { id: 'posts', label: 'Posts' },
          { id: 'communities', label: 'Communities' },
          { id: 'users', label: 'People' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Searching Forumly...</div>
      ) : !q.trim() ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Enter a keyword above to discover posts, communities, and creators.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Communities Results */}
          {(activeTab === 'all' || activeTab === 'communities') && communities.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-500" /> Communities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {communities.map((c) => (
                  <Link
                    key={c._id}
                    to={`/r/${c.slug}`}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-brand-500 transition-colors flex items-center gap-3"
                  >
                    <Avatar src={c.iconUrl} name={c.name} size="md" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        r/{c.slug}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.memberCount || 1} members</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users Results */}
          {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-500" /> People
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {users.map((u) => (
                  <Link
                    key={u._id}
                    to={`/u/${u.username}`}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-brand-500 transition-colors flex items-center gap-3"
                  >
                    <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="md" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        u/{u.username}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{u.displayName}</div>
                      <div className="text-[10px] text-brand-500">{(u.postKarma || 0) + (u.commentKarma || 0)} karma</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts Results */}
          {(activeTab === 'all' || activeTab === 'posts') && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-500" /> Discussions
              </h3>
              {posts.length === 0 ? (
                <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                  No post matches found for "{q}"
                </div>
              ) : (
                posts.map((post) => <PostCard key={post._id} post={post} />)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
