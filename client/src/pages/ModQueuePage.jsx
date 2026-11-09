import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { Shield, Check, XCircle, Trash2, UserX, Clock, ChevronLeft } from 'lucide-react';

export const ModQueuePage = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('queue');
  const [statusFilter, setStatusFilter] = useState('open');

  // Fetch Reports
  const {
    data: queueData,
    isLoading: isQueueLoading,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['mod-queue', slug, statusFilter],
    queryFn: async () => {
      const res = await api.get(`/moderation/communities/${slug}/queue?status=${statusFilter}`);
      return res.data.reports || [];
    },
    enabled: activeTab === 'queue',
  });

  // Fetch Audit Logs
  const {
    data: logsData,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['mod-logs', slug],
    queryFn: async () => {
      const res = await api.get(`/moderation/communities/${slug}/logs`);
      return res.data.logs || [];
    },
    enabled: activeTab === 'logs',
  });

  const reports = queueData || [];
  const logs = logsData || [];

  const handleResolveReport = async (reportId, status) => {
    const notes = prompt(`Resolution notes for marking report as ${status}:`) || '';
    try {
      await api.patch(`/moderation/reports/${reportId}`, {
        status,
        resolutionNotes: notes,
      });
      refetchQueue();
      refetchLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveContent = async (report) => {
    const reason = prompt('Reason for removing content:', report.reason) || report.reason;
    try {
      if (report.targetType === 'Post') {
        await api.post(`/moderation/posts/${report.targetId}/remove`, { reason });
      } else if (report.targetType === 'Comment') {
        await api.post(`/moderation/comments/${report.targetId}/remove`, { reason });
      }
      // Automatically resolve report
      await api.patch(`/moderation/reports/${report._id}`, {
        status: 'resolved',
        resolutionNotes: `Content removed: ${reason}`,
      });
      refetchQueue();
      refetchLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBanAuthor = async (targetUser) => {
    if (!targetUser) return;
    const reason = prompt(`Reason for banning u/${targetUser.username}:`) || 'Violated community guidelines';
    try {
      await api.post(`/moderation/communities/${slug}/ban`, {
        targetUserId: targetUser._id || targetUser,
        reason,
      });
      alert(`User u/${targetUser.username} has been banned from r/${slug}`);
      refetchLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/r/${slug}`}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-500" />
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Moderation Center
              </h1>
            </div>
            <div className="text-xs text-slate-500 font-semibold">r/{slug}</div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'queue' ? 'bg-white dark:bg-slate-900 text-brand-500 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Report Queue
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'logs' ? 'bg-white dark:bg-slate-900 text-brand-500 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Audit Log
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex items-center gap-2">
            {['open', 'resolved', 'dismissed', 'all'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-brand-500 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {isQueueLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm space-y-2">
              <Check className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Queue is clean!
              </h3>
              <p className="text-xs text-slate-500">
                There are no {statusFilter !== 'all' ? statusFilter : ''} reports awaiting moderation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const targetAuthor = report.targetPreview?.author;
                return (
                  <div
                    key={report._id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="danger" className="uppercase font-bold">
                            {report.reason.replace('_', ' ')}
                          </Badge>
                          <Badge variant={report.status === 'open' ? 'warning' : 'default'}>
                            {report.status}
                          </Badge>
                          <span className="text-slate-400 text-xs">
                            Reported {new Date(report.createdAt).toLocaleDateString()} by u/{report.reporter?.username || 'anonymous'}
                          </span>
                        </div>
                        {report.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                            "{report.description}"
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      {report.status === 'open' && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolveReport(report._id, 'resolved')}
                            className="text-xs"
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveReport(report._id, 'dismissed')}
                            className="text-xs"
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Target Content Preview */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Reported {report.targetType}:
                        </span>
                        {targetAuthor && <span>Author: u/{targetAuthor.username}</span>}
                      </div>

                      {report.targetPreview ? (
                        <>
                          {report.targetPreview.title && (
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {report.targetPreview.title}
                            </div>
                          )}
                          <div className="text-slate-600 dark:text-slate-400 line-clamp-3">
                            {report.targetPreview.body || report.targetPreview.content || 'Content empty or unavailable'}
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-400 italic">[Content was deleted]</div>
                      )}
                    </div>

                    {/* Moderator Quick Enforcement Toolbar */}
                    {report.status === 'open' && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveContent(report)}
                          className="gap-1 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Content
                        </Button>
                        {targetAuthor && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBanAuthor(targetAuthor)}
                            className="gap-1 text-xs text-red-600 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <UserX className="w-3.5 h-3.5" /> Ban u/{targetAuthor.username}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Audit Logs Tab */
        <div className="space-y-4">
          {isLogsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500">
              No moderation actions recorded for r/{slug} yet.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500">
                  <tr>
                    <th className="p-3">Action</th>
                    <th className="p-3">Moderator</th>
                    <th className="p-3">Reason / Details</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {log.action.replace('_', ' ')}
                      </td>
                      <td className="p-3 text-brand-600 dark:text-brand-400">
                        u/{log.moderator?.username || 'admin'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {log.reason || '-'}
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
