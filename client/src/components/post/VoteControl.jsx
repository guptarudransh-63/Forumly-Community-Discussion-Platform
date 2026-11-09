import React, { useState, useEffect } from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export const VoteControl = ({
  targetType = 'Post',
  targetId,
  initialScore = 0,
  initialUserVote = 0,
  orientation = 'vertical',
  onVoteChange,
}) => {
  const { isAuthenticated } = useAuthStore();
  const [userVote, setUserVote] = useState(initialUserVote);
  const [score, setScore] = useState(initialScore);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    setUserVote(initialUserVote);
    setScore(initialScore);
  }, [initialUserVote, initialScore]);

  const handleVote = async (e, value) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Please sign in to vote.');
      return;
    }

    if (isVoting) return;

    // Toggle: if clicking active vote, remove vote (0)
    const targetValue = userVote === value ? 0 : value;

    // Optimistic state calculation
    const prevVote = userVote;
    const prevScore = score;
    let delta = 0;

    if (prevVote === 0) {
      delta = targetValue;
    } else if (prevVote === 1) {
      delta = targetValue === -1 ? -2 : -1;
    } else if (prevVote === -1) {
      delta = targetValue === 1 ? 2 : 1;
    }

    setUserVote(targetValue);
    setScore((s) => s + delta);
    setIsVoting(true);

    try {
      const res = await api.post('/votes', {
        targetType,
        targetId,
        value: targetValue,
      });

      setUserVote(res.data.userVote);
      setScore(res.data.score);
      if (onVoteChange) {
        onVoteChange(res.data);
      }
    } catch {
      // Revert on error
      setUserVote(prevVote);
      setScore(prevScore);
    } finally {
      setIsVoting(false);
    }
  };

  const isVertical = orientation === 'vertical';

  return (
    <div
      className={`flex items-center justify-center ${
        isVertical
          ? 'flex-col bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800/80 w-10 flex-shrink-0'
          : 'flex-row gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full'
      }`}
    >
      <button
        onClick={(e) => handleVote(e, 1)}
        className={`p-1 rounded-lg transition-colors ${
          userVote === 1
            ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/40'
            : 'text-slate-400 hover:text-brand-500 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title="Upvote"
      >
        <ArrowBigUp className={`w-5 h-5 ${userVote === 1 ? 'fill-current' : ''}`} />
      </button>

      <span
        className={`text-xs font-bold select-none ${
          isVertical ? 'my-0.5' : 'mx-1'
        } ${
          userVote === 1
            ? 'text-brand-500'
            : userVote === -1
            ? 'text-blue-500'
            : 'text-slate-700 dark:text-slate-300'
        }`}
      >
        {score}
      </span>

      <button
        onClick={(e) => handleVote(e, -1)}
        className={`p-1 rounded-lg transition-colors ${
          userVote === -1
            ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/40'
            : 'text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title="Downvote"
      >
        <ArrowBigDown className={`w-5 h-5 ${userVote === -1 ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};
