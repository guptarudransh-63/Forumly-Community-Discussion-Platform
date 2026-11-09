import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { PostCard } from '../components/post/PostCard';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { useAuthStore } from '../stores/authStore';
import { Sparkles, Edit2, Calendar, MessageSquare } from 'lucide-react';

export const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch User Info
  const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}`);
      return res.data.user;
    },
  });

  // Fetch User Posts
  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}/posts`);
      return res.data.posts || [];
    },
    enabled: activeTab === 'posts',
  });

  // Fetch User Comments
  const { data: commentsData, isLoading: isCommentsLoading } = useQuery({
    queryKey: ['user-comments', username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}/comments`);
      return res.data.comments || [];
    },
    enabled: activeTab === 'comments',
  });

  const isOwnProfile = currentUser && currentUser.username === username;
  const user = userData;

  const handleOpenEdit = () => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ displayName, bio, avatarUrl });
      refetchUser();
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-500">
        User u/{username} not found.
      </div>
    );
  }

  const posts = postsData || [];
  const comments = commentsData || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-r from-slate-700 to-slate-900" />
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <Avatar
                src={user.avatarUrl}
                name={user.displayName || user.username}
                size="xl"
                className="ring-4 ring-white dark:ring-slate-900 bg-white"
              />
              <div className="pt-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {user.displayName || user.username}
                </h1>
                <div className="text-xs font-semibold text-slate-500">u/{user.username}</div>
              </div>
            </div>

            {isOwnProfile && (
              <Button variant="outline" size="sm" onClick={handleOpenEdit} className="gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Edit Profile
              </Button>
            )}
          </div>

          {user.bio && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mb-4">
              {user.bio}
            </p>
          )}

          {/* Karma & Info Stats */}
          <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {(user.postKarma || 0) + (user.commentKarma || 0)}
              </div>
              <div className="text-slate-400 font-semibold text-[10px] uppercase">Total Karma</div>
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {user.postKarma || 0}
              </div>
              <div className="text-slate-400 font-semibold text-[10px] uppercase">Post Karma</div>
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                {user.commentKarma || 0}
              </div>
              <div className="text-slate-400 font-semibold text-[10px] uppercase">Comment Karma</div>
            </div>
            <div className="ml-auto text-slate-400 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'comments'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Comments
        </button>
      </div>

      {/* Content Stream */}
      <div>
        {activeTab === 'posts' ? (
          isPostsLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400">
              u/{username} has not posted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          )
        ) : isCommentsLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400">
            u/{username} has not commented yet.
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-xs space-y-2"
              >
                <div className="text-slate-400">
                  Commented on{' '}
                  <Link
                    to={`/post/${comment.post?._id}`}
                    className="font-bold text-slate-800 dark:text-slate-200 hover:text-brand-500 hover:underline"
                  >
                    {comment.post?.title || 'a discussion'}
                  </Link>{' '}
                  in r/{comment.post?.community?.slug || 'community'}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {comment.content}
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {comment.score || 0} points • {new Date(comment.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              About Bio
            </label>
            <textarea
              rows={3}
              className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A brief bio..."
            />
          </div>
          <Input
            label="Avatar Image URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
