import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { SocketProvider } from './context/SocketContext';
import { MainLayout } from './components/layout/MainLayout';

import { HomePage } from './pages/HomePage';
import { CommunityPage } from './pages/CommunityPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { SavedPostsPage } from './pages/SavedPostsPage';
import { SearchPage } from './pages/SearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { ModQueuePage } from './pages/ModQueuePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BrowserRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/r/:slug" element={<CommunityPage />} />
              <Route path="/r/:slug/mod" element={<ModQueuePage />} />
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/create-post" element={<CreatePostPage />} />
              <Route path="/saved" element={<SavedPostsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/u/:username" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
