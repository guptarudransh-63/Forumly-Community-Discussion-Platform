import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import api from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Globe, Lock, EyeOff } from 'lucide-react';

export const CreateCommunityModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addJoinedCommunity } = useAuthStore();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [privacyType, setPrivacyType] = useState('public');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate clean slug
    const cleanSlug = val.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
    setSlug(cleanSlug);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/communities', {
        name,
        slug,
        description,
        privacyType,
      });

      addJoinedCommunity(res.data.community);
      onClose();
      navigate(`/r/${res.data.community.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a Community" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Input
          label="Community Name"
          placeholder="e.g. Mechanical Keyboards"
          value={name}
          onChange={handleNameChange}
          required
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Community URL
          </label>
          <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-500">
            <span>forumly.io/r/</span>
            <input
              type="text"
              className="ml-1 flex-1 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Description
          </label>
          <textarea
            className="w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Tell prospective members what your community is all about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            Community Type
          </label>
          <div className="space-y-2">
            <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
              privacyType === 'public'
                ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="radio"
                name="privacyType"
                value="public"
                checked={privacyType === 'public'}
                onChange={() => setPrivacyType('public')}
                className="mt-1 text-brand-500 focus:ring-brand-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                  <Globe className="w-3.5 h-3.5 text-slate-500" /> Public
                </div>
                <div className="text-xs text-slate-500">Anyone can view, post, and comment to this community.</div>
              </div>
            </label>

            <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
              privacyType === 'restricted'
                ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="radio"
                name="privacyType"
                value="restricted"
                checked={privacyType === 'restricted'}
                onChange={() => setPrivacyType('restricted')}
                className="mt-1 text-brand-500 focus:ring-brand-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" /> Restricted
                </div>
                <div className="text-xs text-slate-500">Anyone can view this community, but only approved users can post.</div>
              </div>
            </label>

            <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
              privacyType === 'private'
                ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-950/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="radio"
                name="privacyType"
                value="private"
                checked={privacyType === 'private'}
                onChange={() => setPrivacyType('private')}
                className="mt-1 text-brand-500 focus:ring-brand-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                  <Lock className="w-3.5 h-3.5 text-slate-500" /> Private
                </div>
                <div className="text-xs text-slate-500">Only approved members can view and submit to this community.</div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Community
          </Button>
        </div>
      </form>
    </Modal>
  );
};
