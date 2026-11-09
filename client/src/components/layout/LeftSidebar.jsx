import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Home,
  Flame,
  Clock,
  Compass,
  Bookmark,
  Plus,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../common/Avatar';
import { CreateCommunityModal } from '../modals/CreateCommunityModal';

export const LeftSidebar = () => {
  const { user, joinedCommunities, isAuthenticated } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 font-bold'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <>
      <aside className="w-56 flex-shrink-0 hidden md:block">
        <div className="sticky top-20 space-y-6">
          {/* Main Feeds */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Feeds
            </div>
            <nav className="space-y-0.5">
              <NavLink to="/" end className={navItemClass}>
                <Home className="w-4 h-4 text-slate-500" />
                <span>Home</span>
              </NavLink>
              <NavLink to="/?feed=popular" className={navItemClass}>
                <Flame className="w-4 h-4 text-slate-500" />
                <span>Popular</span>
              </NavLink>
              <NavLink to="/?feed=latest" className={navItemClass}>
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Latest</span>
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/?feed=following" className={navItemClass}>
                  <Compass className="w-4 h-4 text-slate-500" />
                  <span>Following</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Saved Posts */}
          {isAuthenticated && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Personal
              </div>
              <nav className="space-y-0.5">
                <NavLink to="/saved" className={navItemClass}>
                  <Bookmark className="w-4 h-4 text-slate-500" />
                  <span>Saved Posts</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Communities */}
          <div>
            <div className="flex items-center justify-between px-3 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Communities
              </span>
              {isAuthenticated && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 hover:text-brand-500 transition-colors"
                  title="Create Community"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="mt-1 space-y-0.5 max-h-60 overflow-y-auto">
              {joinedCommunities.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-slate-400">
                  {isAuthenticated ? 'No communities joined yet' : 'Sign in to follow communities'}
                </div>
              ) : (
                joinedCommunities.map((c) => (
                  <Link
                    key={c._id}
                    to={`/r/${c.slug}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <Avatar src={c.iconUrl} name={c.name} size="sm" />
                    <span className="truncate group-hover:text-brand-500">r/{c.slug}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      <CreateCommunityModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </>
  );
};
