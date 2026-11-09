import React from 'react';
import { Flame, Sparkles, Trophy, ChevronDown } from 'lucide-react';

export const SortBar = ({ sort = 'hot', setSort, timeWindow = 'all', setTimeWindow }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 mb-4 shadow-sm flex items-center justify-between text-xs">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSort('hot')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-colors ${
            sort === 'hot'
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> Hot
        </button>

        <button
          onClick={() => setSort('new')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-colors ${
            sort === 'new'
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> New
        </button>

        <button
          onClick={() => setSort('top')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-colors ${
            sort === 'top'
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" /> Top
        </button>
      </div>

      {sort === 'top' && (
        <div className="flex items-center gap-1 text-slate-500">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg border-none text-xs focus:ring-1 focus:ring-brand-500 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      )}
    </div>
  );
};
