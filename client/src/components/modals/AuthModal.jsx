import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuthStore } from '../../stores/authStore';
import { Shield, Sparkles, UserCheck } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [tab, setTab] = useState(initialTab);
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuthStore();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(loginField, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(username, email, password, displayName);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (u, p) => {
    setError('');
    setIsLoading(true);
    try {
      await login(u, p);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tab === 'login' ? 'Welcome back to Forumly' : 'Join the Forumly Community'}>
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5">
        <button
          onClick={() => { setTab('login'); setError(''); }}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'login'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setTab('register'); setError(''); }}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'register'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Create Account
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Username or Email"
            placeholder="e.g. sarah_tech"
            value={loginField}
            onChange={(e) => setLoginField(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>

          {/* Instant 1-Click Demo Accounts */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Instant Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin', 'Password123!')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 text-left transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Admin</div>
                  <div className="text-[10px] text-slate-500">System admin</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sarah_tech', 'Password123!')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 text-left transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Sarah</div>
                  <div className="text-[10px] text-slate-500">r/technology mod</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('alex_frontend', 'Password123!')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 text-left transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Alex</div>
                  <div className="text-[10px] text-slate-500">r/webdev lead</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guest_user', 'Password123!')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 text-left transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Guest User</div>
                  <div className="text-[10px] text-slate-500">Casual reader</div>
                </div>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3.5">
          <Input
            label="Username"
            placeholder="e.g. dev_sarah"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="Display Name (optional)"
            placeholder="e.g. Sarah Connor"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
            Create Account
          </Button>
        </form>
      )}
    </Modal>
  );
};
