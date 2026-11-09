import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Bookmark,
  Share2,
  Flag,
  Pin,
  Lock,
  ExternalLink,
  Shield,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { VoteControl } from './VoteControl';
import { PollWidget } from './PollWidget';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { ReportModal } from '../modals/ReportModal';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export const PostCard = ({
  post,
  isDetail = false,
  isModerator = false,
  onPostUpdate,
  onPostDelete,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isModMenuOpen, setIsModMenuOpen] = useState(false);

  const handleSaveToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Sign in to save posts');
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      if (nextState) {
        await api.post(`/saved-posts/${post._id}`);
      } else {
        await api.delete(`/saved-posts/${post._id}`);
      }
    } catch {
      setIsSaved(!nextState);
    }
  };

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModAction = async (action) => {
    setIsModMenuOpen(false);
    try {
      if (action === 'remove') {
        const reason = prompt('Reason for removing post:');
        if (reason === null) return;
        await api.post(`/moderation/posts/${post._id}/remove`, { reason });
        if (onPostDelete) onPostDelete(post._id);
      } else if (action === 'lock') {
        const res = await api.post(`/moderation/posts/${post._id}/lock`, { isLocked: !post.isLocked });
        if (onPostUpdate) onPostUpdate(res.data.post);
      } else if (action === 'pin') {
        const res = await api.post(`/moderation/posts/${post._id}/pin`, { isPinned: !post.isPinned });
        if (onPostUpdate) onPostUpdate(res.data.post);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const isAuthor = Boolean(
    user?._id &&
    post?.author &&
    user._id.toString() === (post.author._id || post.author).toString()
  );

  const handleDeleteOwnPost = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      if (onPostDelete) onPostDelete(post._id);
      else navigate('/');
    } catch (err) {
      alert(err.message);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <>
      <article
        onClick={() => !isDetail && navigate(`/post/${post._id}`)}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden ${
          !isDetail ? 'cursor-pointer mb-3' : 'mb-6'
        }`}
      >
        <div className="flex">
          {/* Vote Bar */}
          <div className="p-3 pr-0 hidden sm:block">
            <VoteControl
              targetType="Post"
              targetId={post._id}
              initialScore={post.score || 0}
              initialUserVote={post.userVote || 0}
            />
          </div>

          {/* Main Card Content */}
          <div className="flex-1 p-4 min-w-0">
            {/* Header Metadata */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {post.community && (
                  <Link
                    to={`/r/${post.community.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 hover:text-brand-500 hover:underline"
                  >
                    <Avatar src={post.community.iconUrl} name={post.community.name} size="sm" />
                    <span>r/{post.community.slug}</span>
                  </Link>
                )}

                <span className="text-slate-300 dark:text-slate-700">•</span>

                {post.author?.username ? (
                  <Link
                    to={`/u/${post.author.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    u/{post.author.username}
                  </Link>
                ) : (
                  <span>[deleted]</span>
                )}

                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>{timeAgo(post.createdAt)}</span>

                {/* Status Badges */}
                {post.isPinned && (
                  <Badge variant="brand" className="gap-1">
                    <Pin className="w-3 h-3" /> Pinned
                  </Badge>
                )}
                {post.isLocked && (
                  <Badge variant="warning" className="gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </Badge>
                )}
                {post.flair?.text && (
                  <Badge variant="default">{post.flair.text}</Badge>
                )}
              </div>

              {/* Mod / Owner Actions */}
              {(isModerator || isAuthor) && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModMenuOpen((prev) => !prev);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {isModMenuOpen && (
                    <div
                      className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-30 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isModerator && (
                        <>
                          <button
                            onClick={() => handleModAction('pin')}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Pin className="w-3.5 h-3.5" /> {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                          </button>
                          <button
                            onClick={() => handleModAction('lock')}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Lock className="w-3.5 h-3.5" /> {post.isLocked ? 'Unlock Comments' : 'Lock Comments'}
                          </button>
                          <button
                            onClick={() => handleModAction('remove')}
                            className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                          >
                            <Shield className="w-3.5 h-3.5" /> Remove as Mod
                          </button>
                        </>
                      )}
                      {isAuthor && !isModerator && (
                        <button
                          onClick={handleDeleteOwnPost}
                          className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Post
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post Title */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2 hover:text-brand-600 transition-colors">
              {post.title}
            </h2>

            {/* Post Body / Media / Poll */}
            {post.body && (
              <div
                className={`text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-line mb-3 ${
                  !isDetail ? 'line-clamp-4' : ''
                }`}
              >
                {post.body}
              </div>
            )}

            {/* Link Preview */}
            {post.postType === 'link' && post.externalUrl && (
              <a
                href={post.externalUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900 px-3 py-1.5 rounded-xl hover:underline mb-3"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {post.externalUrl}
              </a>
            )}

            {/* Image Preview */}
            {post.postType === 'image' && post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="my-3 rounded-xl overflow-hidden bg-slate-950 max-h-[500px] flex items-center justify-center">
                <img
                  src={post.mediaUrls[0]}
                  alt={post.title}
                  className="w-full h-auto max-h-[500px] object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {/* Poll Widget */}
            {post.postType === 'poll' && post.pollData && (
              <div onClick={(e) => e.stopPropagation()}>
                <PollWidget postId={post._id} pollData={post.pollData} />
              </div>
            )}

            {/* Mobile Vote Controls + Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-semibold">
              <div className="flex items-center gap-2">
                {/* Mobile Vote Buttons */}
                <div className="sm:hidden" onClick={(e) => e.stopPropagation()}>
                  <VoteControl
                    targetType="Post"
                    targetId={post._id}
                    initialScore={post.score || 0}
                    initialUserVote={post.userVote || 0}
                    orientation="horizontal"
                  />
                </div>

                {/* Comment Counter */}
                <Link
                  to={`/post/${post._id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentCount || 0} comments</span>
                </Link>

                {/* Save Bookmark */}
                <button
                  onClick={handleSaveToggle}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    isSaved ? 'text-brand-500 font-bold' : ''
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{copied ? 'Copied Link!' : 'Share'}</span>
                </button>
              </div>

              {/* Report Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAuthenticated) alert('Sign in to report content');
                  else setIsReportOpen(true);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                title="Report Post"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </article>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="Post"
        targetId={post._id}
        communityId={post.community?._id}
      />
    </>
  );
};
