import React from 'react';
import { TopNav } from './TopNav';
import { LeftSidebar } from './LeftSidebar';

export const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <TopNav />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex gap-6">
        <LeftSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
