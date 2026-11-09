import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Avatar } from '../common/Avatar';
import { Shield, Sparkles, HelpCircle } from 'lucide-react';

export const RightSidebar = ({ community, userMembership, moderators }) => {
  const { data: popularData } = useQuery({
    queryKey: ['popular-communities-sidebar'],
    queryFn: async () => {
      const res = await api.get('/communities?limit=5');
      return res.data.communities || [];
    },
    enabled: !community,
  });

  return (
    <aside className="w-80 flex-shrink-0 hidden lg:block">
      <div className="sticky top-20 space-y-4">
        {community ? (
          /* Community Page Right Sidebar */
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">About Community</h3>
                {userMembership && ['owner', 'moderator'].includes(userMembership.role) && (
                  <Link
                    to={`/r/${community.slug}/mod`}
                    className="text-xs font-semibold text-brand-500 hover:underline flex items-center gap-1"
                  >
                    <Shield className="w-3.5 h-3.5" /> Mod Queue
                  </Link>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {community.description || 'Welcome to r/' + community.slug}
              </p>

              <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-center">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {community.memberCount || 1}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Members</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {new Date(community.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Created</div>
                </div>
              </div>
            </div>

            {/* Community Rules */}
            {community.rules && community.rules.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  r/{community.slug} Rules
                </h4>
                <div className="space-y-2 text-xs">
                  {community.rules.map((rule, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {idx + 1}. {rule.title}
                      </div>
                      {rule.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{rule.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community Moderators */}
            {moderators && moderators.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Moderators
                </h4>
                <div className="space-y-2">
                  {moderators.filter((m) => m && m.user).map((m, idx) => (
                    <Link
                      key={idx}
                      to={`/u/${m.user.username}`}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:text-brand-500 transition-colors"
                    >
                      <Avatar src={m.user.avatarUrl} name={m.user.displayName || m.user.username} size="sm" />
                      <span className="font-medium">u/{m.user.username}</span>
                      {m.role === 'owner' && (
                        <span className="text-[10px] text-amber-500 font-bold ml-auto">Owner</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* General Right Sidebar */
          <>
            {/* Trending Communities */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Discover Communities
              </h3>
              <div className="space-y-2">
                {(popularData || []).map((c) => (
                  <Link
                    key={c._id}
                    to={`/r/${c.slug}`}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={c.iconUrl} name={c.name} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-500">
                          r/{c.slug}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.memberCount || 1} members
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Platform Announcements */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <HelpCircle className="w-3.5 h-3.5 text-brand-500" /> Platform Architecture
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Forumly runs on cursor-paginated feeds, atomic vote integrity checks, and server-side RBAC moderation.
              </p>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
