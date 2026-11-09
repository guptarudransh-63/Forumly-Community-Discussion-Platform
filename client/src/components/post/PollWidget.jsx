import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { CheckCircle2 } from 'lucide-react';

export const PollWidget = ({ postId, pollData: initialPollData }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [poll, setPoll] = useState(initialPollData);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPoll(initialPollData);
  }, [initialPollData]);

  if (!poll || !poll.options) return null;

  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);

  // Check if current user has already voted
  const userVotedOptionId = user
    ? poll.options.find((opt) =>
        opt.voters?.some((v) => {
          const voterId = (v?._id || v)?.toString();
          return voterId && user._id && voterId === user._id.toString();
        })
      )?._id
    : null;

  const hasVoted = Boolean(userVotedOptionId);

  const handleVote = async (optionId) => {
    if (!isAuthenticated) {
      alert('Sign in to vote on this poll');
      return;
    }
    if (hasVoted || isSubmitting) return;

    setIsSubmitting(true);
    setSelectedOption(optionId);

    try {
      const res = await api.post(`/posts/${postId}/poll-vote`, { optionId });
      setPoll(res.data.pollData);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-3 space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const voteCount = opt.voteCount || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isUserPick = userVotedOptionId === opt._id;

          return (
            <button
              key={opt._id}
              disabled={hasVoted || isSubmitting}
              onClick={() => handleVote(opt._id)}
              className={`relative w-full text-left p-3 rounded-xl border text-xs font-semibold overflow-hidden transition-all ${
                isUserPick
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                  : hasVoted
                  ? 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 cursor-default'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand-500 cursor-pointer'
              }`}
            >
              {/* Progress bar background */}
              {hasVoted && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-brand-100 dark:bg-brand-950/50 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between z-10">
                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  {isUserPick && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                  {opt.text}
                </span>
                {hasVoted && (
                  <span className="text-slate-500 font-bold ml-2">
                    {percentage}% ({voteCount})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-400 text-right pt-1 font-medium">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
      </div>
    </div>
  );
};
