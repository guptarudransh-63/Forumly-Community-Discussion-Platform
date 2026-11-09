import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Avatar } from '../components/common/Avatar';
import { FileText, Image as ImageIcon, Link as LinkIcon, BarChart2, Plus, X, Upload } from 'lucide-react';

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCommunityId = searchParams.get('community') || '';
  const { isAuthenticated } = useAuthStore();

  const [communityId, setCommunityId] = useState(preselectedCommunityId);
  const [postType, setPostType] = useState('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [mediaUrls, setMediaUrls] = useState([]);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [flairText, setFlairText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch available communities
  const { data: communitiesData } = useQuery({
    queryKey: ['communities-list-create'],
    queryFn: async () => {
      const res = await api.get('/communities?limit=50');
      return res.data.communities || [];
    },
  });

  const communities = communitiesData || [];

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);
    setError('');

    try {
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrls([res.data.url]);
    } catch (err) {
      setError(err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (idx) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx, val) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Sign in to publish posts');
      return;
    }

    if (!communityId) {
      setError('Please choose a community to publish in');
      return;
    }

    if (!title.trim()) {
      setError('Post title is required');
      return;
    }

    if (postType === 'link' && !externalUrl.trim()) {
      setError('Please specify a valid URL for your link post');
      return;
    }

    if (postType === 'image' && mediaUrls.length === 0) {
      setError('Please upload an image for your image post');
      return;
    }

    if (postType === 'poll') {
      const validOptions = pollOptions.filter((o) => o.trim().length > 0);
      if (validOptions.length < 2) {
        setError('Please provide at least 2 non-empty poll options');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        postType,
        communityId,
        flair: flairText ? { text: flairText } : undefined,
      };

      if (postType === 'link') payload.externalUrl = externalUrl.trim();
      if (postType === 'image') payload.mediaUrls = mediaUrls;
      if (postType === 'poll') payload.pollOptions = pollOptions.filter((o) => o.trim().length > 0);

      const res = await api.post('/posts', payload);
      navigate(`/post/${res.data.post._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
        Create a Post
      </h1>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Community Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Choose a Community
        </label>
        <select
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          className="w-full sm:w-80 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 cursor-pointer"
        >
          <option value="">Select a community...</option>
          {communities.map((c) => (
            <option key={c._id} value={c._id}>
              r/{c.slug} ({c.name})
            </option>
          ))}
        </select>
      </div>

      {/* Main Post Composer Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Post Type Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'text', label: 'Post', icon: FileText },
            { id: 'image', label: 'Images', icon: ImageIcon },
            { id: 'link', label: 'Link', icon: LinkIcon },
            { id: 'poll', label: 'Poll', icon: BarChart2 },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = postType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPostType(t.id)}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold border-b-2 transition-all ${
                  isActive
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/20 dark:bg-brand-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Input
            placeholder="Title (required)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
          />

          {/* Type specific fields */}
          {postType === 'text' && (
            <div>
              <textarea
                rows={8}
                placeholder="Text (optional)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
            </div>
          )}

          {postType === 'link' && (
            <div className="space-y-4">
              <Input
                label="External URL"
                type="url"
                placeholder="https://example.com/article"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                required
              />
              <textarea
                rows={4}
                placeholder="Add commentary (optional)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
            </div>
          )}

          {postType === 'image' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors">
                {mediaUrls.length > 0 ? (
                  <div className="relative inline-block">
                    <img
                      src={mediaUrls[0]}
                      alt="Upload preview"
                      className="max-h-64 rounded-xl object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaUrls([])}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isUploading ? 'Uploading image...' : 'Click to upload or drag and drop image'}
                    </div>
                    <div className="text-[10px] text-slate-400">PNG, JPG, GIF or WEBP up to 5MB</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <textarea
                rows={3}
                placeholder="Image caption or description (optional)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
            </div>
          )}

          {postType === 'poll' && (
            <div className="space-y-3">
              <textarea
                rows={2}
                placeholder="Poll description or question background..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Poll Options
              </label>

              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="p-2 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-xs font-bold text-brand-500 hover:underline flex items-center gap-1 pt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              )}
            </div>
          )}

          {/* Flair Tag */}
          <div className="pt-2">
            <Input
              label="Post Flair (optional)"
              placeholder="e.g. Discussion, News, Tutorial, Question"
              value={flairText}
              onChange={(e) => setFlairText(e.target.value)}
            />
          </div>

          {/* Submit Toolbar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isUploading}
            >
              Publish Post
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
