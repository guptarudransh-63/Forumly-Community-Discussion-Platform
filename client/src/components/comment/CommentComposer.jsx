import React, { useState } from 'react';
import { Button } from '../common/Button';
import { useAuthStore } from '../../stores/authStore';
import api from '../../api/client';

export const CommentComposer = ({
  postId,
  parentCommentId = null,
  onCommentCreated,
  onCancel,
  placeholder = 'What are your thoughts?',
}) => {
  const { isAuthenticated } = useAuthStore();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Sign in to leave a comment');
      return;
    }

    if (!content.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/comments', {
        postId,
        content: content.trim(),
        parentCommentId,
      });

      setContent('');
      if (onCommentCreated) {
        onCommentCreated(res.data.comment);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="my-3 space-y-2">
      {error && (
        <div className="p-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/40 rounded-lg">
          {error}
        </div>
      )}

      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all overflow-hidden shadow-sm">
        <textarea
          rows={parentCommentId ? 2 : 3}
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-3 text-xs sm:text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none"
        />

        <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400">Markdown supported</span>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={!content.trim()}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
