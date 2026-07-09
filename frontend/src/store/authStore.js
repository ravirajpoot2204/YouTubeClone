import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/axios';   // your Axios instance

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setAuth: (user, token) => {
        localStorage.setItem('token', token);   // optional, but keep for compatibility
        set({ user, token });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      // ✅ New: fetch user profile from backend
      fetchUser: async () => {
        const token = get().token;
        if (!token) return;

        try {
          const { data } = await api.get('/auth/me');   // adjust endpoint
          set({ user: data.user });
        } catch (error) {
          console.error('Failed to fetch user:', error);
          // Token invalid – logout
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,        // persist user to avoid re‑fetch on refresh
      }),
    }
  )
);