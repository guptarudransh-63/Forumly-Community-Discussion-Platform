import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import api from '../../api/client';
import { Flag, CheckCircle } from 'lucide-react';

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or unsolicited promotion' },
  { id: 'harassment', label: 'Harassment or personal attacks' },
  { id: 'hate_speech', label: 'Hate speech or discrimination' },
  { id: 'misinformation', label: 'Misinformation or misleading claims' },
  { id: 'rule_violation', label: 'Breaks community specific rules' },
  { id: 'inappropriate', label: 'Inappropriate or harmful content' },
  { id: 'other', label: 'Other violation' },
];

export const ReportModal = ({ isOpen, onClose, targetType, targetId, communityId }) => {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/moderation/report', {
        targetType,
        targetId,
        communityId,
        reason,
        description,
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setDescription('');
    setReason('spam');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit a Report">
      {isSubmitted ? (
        <div className="py-6 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Thank you for helping keep Forumly safe
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your report has been submitted to community moderators for immediate review.
          </p>
          <Button variant="primary" onClick={handleClose} className="mt-4">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Help moderators understand the issue. Reports are reviewed by community moderators and platform staff.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-center p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  reason === r.id
                    ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 text-brand-600 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="text-brand-500 focus:ring-brand-500 mr-2.5"
                />
                {r.label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Additional Details (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={2}
              placeholder="Provide any additional context for moderators..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isLoading} className="gap-1.5">
              <Flag className="w-3.5 h-3.5" /> Submit Report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
