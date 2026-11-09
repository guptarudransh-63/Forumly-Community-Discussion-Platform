import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, MoreHorizontal, Trash2, Flag, Shield, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { VoteControl } from '../post/VoteControl';
import { CommentComposer } from './CommentComposer';
import { ReportModal } from '../modals/ReportModal';
import { useAuthStore } from '../../stores/authStore';
import api from '../../api/client';

export const CommentItem = ({
  comment,
  postId,
  isPostLocked = false,
  isModerator = false,
  onCommentAdded,
  onCommentDeleted,
}) => {
  const { user, isAuthenticated } = useAuthStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [currentContent, setCurrentContent] = useState(comment.content);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentContent(comment.content);
    setEditContent(comment.content);
  }, [comment.content]);

  const isAuthor = Boolean(
    user?._id &&
    comment?.author &&
    user._id.toString() === (comment.author._id || comment.author).toString()
  );

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/comments/${comment._id}`);
      if (onCommentDeleted) onCommentDeleted(comment._id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleModRemove = async () => {
    setIsMenuOpen(false);
    const reason = prompt('Reason for removing comment:');
    if (reason === null) return;
    try {
      await api.post(`/moderation/comments/${comment._id}/remove`, { reason });
      if (onCommentDeleted) onCommentDeleted(comment._id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      const res = await api.patch(`/comments/${comment._id}`, { content: editContent.trim() });
      setCurrentContent(res.data.comment.content);
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="relative group/thread mt-3 text-xs">
      <div className="flex gap-2">
        {/* Thread Guide Line */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {!isCollapsed && (
            <div
              onClick={() => setIsCollapsed(true)}
              className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 group-hover/thread:bg-brand-400 dark:group-hover/thread:bg-brand-500 cursor-pointer transition-colors my-1 rounded-full"
              title="Click to collapse thread"
            />
          )}
        </div>

        {/* Comment Body */}
        <div className="flex-1 min-w-0 pb-1">
          {/* Header */}
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Avatar
              src={comment.author?.avatarUrl}
              name={comment.author?.displayName || comment.author?.username}
              size="sm"
            />
            {comment.author?.username ? (
              <Link
                to={`/u/${comment.author.username}`}
                className="font-bold text-slate-800 dark:text-slate-200 hover:underline"
              >
                u/{comment.author.username}
              </Link>
            ) : (
              <span className="font-semibold text-slate-400">[deleted]</span>
            )}
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{timeAgo(comment.createdAt)}</span>
          </div>

          {!isCollapsed && (
            <>
              {/* Content */}
              {isEditing ? (
                <div className="my-2 space-y-2">
                  <textarea
                    rows={2}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-brand-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-2.5 py-1 bg-brand-500 text-white rounded-md text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words my-1">
                  {currentContent}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center gap-3 text-slate-500 pt-1 font-semibold">
                <VoteControl
                  targetType="Comment"
                  targetId={comment._id}
                  initialScore={comment.score || 0}
                  initialUserVote={comment.userVote || 0}
                  orientation="horizontal"
                />

                {!isPostLocked && (
                  <button
                    onClick={() => {
                      if (!isAuthenticated) alert('Sign in to reply');
                      else setIsReplying(!isReplying);
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                )}

                {/* More options menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute left-0 mt-1 w-36 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-30">
                      {isAuthor && !comment.isRemoved && (
                        <>
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsEditing(true);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={handleDelete}
                            className="w-full px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </>
                      )}
                      {isModerator && (
                        <button
                          onClick={handleModRemove}
                          className="w-full px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                        >
                          <Shield className="w-3 h-3" /> Remove Mod
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (!isAuthenticated) alert('Sign in to report');
                          else setIsReportOpen(true);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Flag className="w-3 h-3" /> Report
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Reply Composer */}
              {isReplying && (
                <div className="ml-2 mt-2">
                  <CommentComposer
                    postId={postId}
                    parentCommentId={comment._id}
                    placeholder={`Replying to u/${comment.author?.username || 'user'}...`}
                    onCommentCreated={(newReply) => {
                      setIsReplying(false);
                      if (onCommentAdded) onCommentAdded(newReply);
                    }}
                    onCancel={() => setIsReplying(false)}
                  />
                </div>
              )}

              {/* Recursive Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-1 space-y-1">
                  {comment.replies.map((child) => (
                    <CommentItem
                      key={child._id}
                      comment={child}
                      postId={postId}
                      isPostLocked={isPostLocked}
                      isModerator={isModerator}
                      onCommentAdded={onCommentAdded}
                      onCommentDeleted={onCommentDeleted}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="Comment"
        targetId={comment._id}
      />
    </div>
  );
};
