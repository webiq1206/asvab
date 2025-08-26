import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, MilitaryBranch, SubscriptionTier } from '@asvab-prep/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (data) =>
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors
export const useAuth = () => {
  const auth = useAuthStore();
  
  return {
    ...auth,
    isPremium: auth.user?.subscriptionTier === SubscriptionTier.PREMIUM,
    isTrialActive: auth.user?.trialEndsAt ? new Date() < new Date(auth.user.trialEndsAt) : false,
    selectedBranch: auth.user?.selectedBranch || null,
    hasAccess: (feature: 'premium' | 'trial') => {
      if (feature === 'premium') {
        return auth.user?.subscriptionTier === SubscriptionTier.PREMIUM;
      }
      if (feature === 'trial') {
        return auth.user?.trialEndsAt ? new Date() < new Date(auth.user.trialEndsAt) : false;
      }
      return false;
    },
  };
};