import { create } from 'zustand';
import { MilitaryBranch } from '@asvab-prep/shared';

interface UIState {
  // Theme
  isDarkMode: boolean;
  currentBranch: MilitaryBranch | null;
  
  // Navigation
  activeTab: string;
  
  // Modals and overlays
  isOnboardingVisible: boolean;
  isUpgradeModalVisible: boolean;
  isWhiteboardVisible: boolean;
  
  // Loading states
  globalLoading: boolean;
  
  // Notifications
  notificationBadgeCount: number;
  
  // Actions
  setDarkMode: (enabled: boolean) => void;
  setCurrentBranch: (branch: MilitaryBranch | null) => void;
  setActiveTab: (tab: string) => void;
  setOnboardingVisible: (visible: boolean) => void;
  setUpgradeModalVisible: (visible: boolean) => void;
  setWhiteboardVisible: (visible: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
  setNotificationBadgeCount: (count: number) => void;
  incrementNotificationBadge: () => void;
  clearNotificationBadge: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  // Initial state
  isDarkMode: false,
  currentBranch: null,
  activeTab: 'Dashboard',
  isOnboardingVisible: false,
  isUpgradeModalVisible: false,
  isWhiteboardVisible: false,
  globalLoading: false,
  notificationBadgeCount: 0,

  // Actions
  setDarkMode: (enabled) => set({ isDarkMode: enabled }),
  
  setCurrentBranch: (branch) => set({ currentBranch: branch }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setOnboardingVisible: (visible) => set({ isOnboardingVisible: visible }),
  
  setUpgradeModalVisible: (visible) => set({ isUpgradeModalVisible: visible }),
  
  setWhiteboardVisible: (visible) => set({ isWhiteboardVisible: visible }),
  
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  
  setNotificationBadgeCount: (count) => set({ notificationBadgeCount: count }),
  
  incrementNotificationBadge: () =>
    set((state) => ({ notificationBadgeCount: state.notificationBadgeCount + 1 })),
  
  clearNotificationBadge: () => set({ notificationBadgeCount: 0 }),
}));

// Selectors
export const useUI = () => useUIStore();
export const useTheme = () => {
  const { isDarkMode, currentBranch } = useUIStore();
  return { isDarkMode, currentBranch };
};
export const useModals = () => {
  const {
    isOnboardingVisible,
    isUpgradeModalVisible,
    isWhiteboardVisible,
    setOnboardingVisible,
    setUpgradeModalVisible,
    setWhiteboardVisible,
  } = useUIStore();
  
  return {
    isOnboardingVisible,
    isUpgradeModalVisible,
    isWhiteboardVisible,
    setOnboardingVisible,
    setUpgradeModalVisible,
    setWhiteboardVisible,
  };
};