import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set, get) => ({
  user: null,
  joinedCommunities: [],
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/auth/me');
      if (res.data.user) {
        set({
          user: res.data.user,
          joinedCommunities: res.data.joinedCommunities || [],
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          joinedCommunities: [],
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      set({
        user: null,
        joinedCommunities: [],
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  login: async (login, password) => {
    const res = await api.post('/auth/login', { login, password });
    set({
      user: res.data.user,
      isAuthenticated: true,
    });
    // refresh joined communities
    get().checkAuth();
    return res.data.user;
  },

  register: async (username, email, password, displayName) => {
    const res = await api.post('/auth/register', { username, email, password, displayName });
    set({
      user: res.data.user,
      isAuthenticated: true,
    });
    get().checkAuth();
    return res.data.user;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({
        user: null,
        joinedCommunities: [],
        isAuthenticated: false,
      });
    }
  },

  updateProfile: async (data) => {
    const res = await api.patch('/users/profile', data);
    set((state) => ({
      user: { ...state.user, ...res.data.user },
    }));
    return res.data.user;
  },

  addJoinedCommunity: (community) => {
    set((state) => ({
      joinedCommunities: [...state.joinedCommunities, community],
    }));
  },

  removeJoinedCommunity: (slug) => {
    set((state) => ({
      joinedCommunities: state.joinedCommunities.filter((c) => c.slug !== slug),
    }));
  },
}));
