import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { PostCard } from '../components/post/PostCard';
import { CommentItem } from '../components/comment/CommentItem';
import { CommentComposer } from '../components/comment/CommentComposer';
import { RightSidebar } from '../components/layout/RightSidebar';
import { useSocket } from '../context/SocketContext';
import { Lock, MessageSquare } from 'lucide-react';

export const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [commentSort, setCommentSort] = useState('top');

  // Real-time vote updates
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join:post', id);

    const handleVoteUpdate = (data) => {
      if (data.postId === id) {
        refetchPost();
      }
    };

    socket.on('post:voteUpdate', handleVoteUpdate);

    return () => {
      socket.emit('leave:post', id);
      socket.off('post:voteUpdate', handleVoteUpdate);
    };
  }, [socket, id]);

  // Fetch full post details
  const {
    data: postData,
    isLoading: isPostLoading,
    isError: isPostError,
    error: postError,
    refetch: refetchPost,
  } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await api.get(`/posts/${id}`);
      return res.data.post;
    },
  });

  // Fetch comment tree
  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ['comments', id, commentSort],
    queryFn: async () => {
      const res = await api.get(`/comments/post/${id}?sort=${commentSort}`);
      return res.data.comments || [];
    },
  });

  if (isPostLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6" />
        <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6" />
      </div>
    );
  }

  if (isPostError) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-8 text-center text-red-600 dark:text-red-400 space-y-2">
        <h3 className="font-bold text-sm">Post Unavailable</h3>
        <p className="text-xs">{postError.message || 'The requested post could not be loaded.'}</p>
        <Link to="/" className="inline-block mt-2 text-xs font-semibold text-brand-500 hover:underline">
          Return to Feeds
        </Link>
      </div>
    );
  }

  const post = postData;
  const comments = commentsData || [];

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <PostCard
          post={post}
          isDetail={true}
          onPostUpdate={() => refetchPost()}
          onPostDelete={() => navigate('/')}
        />

        {/* Comment Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          {post.isLocked ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Comments are locked on this post. New replies cannot be added.</span>
            </div>
          ) : (
            <div className="mb-6">
              <CommentComposer
                postId={post._id}
                onCommentCreated={() => {
                  refetchComments();
                  refetchPost();
                }}
              />
            </div>
          )}

          {/* Comments Header & Sorting */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-brand-500" />
              <span>{post.commentCount || 0} Comments</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <span>Sort by:</span>
              <button
                onClick={() => setCommentSort('top')}
                className={`px-2 py-1 rounded font-bold transition-colors ${
                  commentSort === 'top' ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'hover:text-slate-700'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => setCommentSort('new')}
                className={`px-2 py-1 rounded font-bold transition-colors ${
                  commentSort === 'new' ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'hover:text-slate-700'
                }`}
              >
                New
              </button>
            </div>
          </div>

          {/* Comment Tree */}
          <div className="pt-2">
            {isCommentsLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading discussion...</div>
            ) : comments.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="text-xs text-slate-400">No comments yet</div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Be the first to share your perspective!
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    postId={post._id}
                    isPostLocked={post.isLocked}
                    onCommentAdded={() => {
                      refetchComments();
                      refetchPost();
                    }}
                    onCommentDeleted={() => {
                      refetchComments();
                      refetchPost();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RightSidebar community={post.community} />
    </div>
  );
};
