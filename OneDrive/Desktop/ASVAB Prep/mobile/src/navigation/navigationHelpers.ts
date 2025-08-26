import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from './AppNavigator';

export type NavigationProps = NavigationProp<RootStackParamList>;

// Navigation helper functions for easy access to new features
export const navigationHelpers = {
  // AI Coaching
  navigateToAICoaching: (navigation: NavigationProps) => {
    navigation.navigate('AICoaching');
  },

  // Analytics
  navigateToAdvancedAnalytics: (navigation: NavigationProps) => {
    navigation.navigate('AdvancedAnalytics');
  },

  // Gamification
  navigateToGamificationDashboard: (navigation: NavigationProps) => {
    navigation.navigate('GamificationDashboard');
  },

  navigateToAchievements: (navigation: NavigationProps) => {
    navigation.navigate('Achievements');
  },

  navigateToLeaderboard: (navigation: NavigationProps) => {
    navigation.navigate('Leaderboard');
  },

  // MEPS Preparation
  navigateToMEPSPreparation: (navigation: NavigationProps) => {
    navigation.navigate('MEPSPreparation');
  },

  navigateToMEPSDocuments: (navigation: NavigationProps) => {
    navigation.navigate('MEPSDocuments');
  },

  navigateToMEPSMedicalGuide: (navigation: NavigationProps) => {
    navigation.navigate('MEPSMedicalGuide');
  },

  // Fitness
  navigateToPTTest: (navigation: NavigationProps) => {
    navigation.navigate('PTTest');
  },

  // Study Features
  navigateToFlashcardStudy: (navigation: NavigationProps, deckId?: string) => {
    navigation.navigate('FlashcardStudy', { deckId });
  },

  // Military Jobs
  navigateToJobDetail: (navigation: NavigationProps, jobId: string) => {
    navigation.navigate('JobDetail', { jobId });
  },

  // Settings
  navigateToNotificationSettings: (navigation: NavigationProps) => {
    navigation.navigate('NotificationSettings');
  },

  // Quick access combinations
  navigateToStudyFeatures: {
    aiCoaching: (navigation: NavigationProps) => navigation.navigate('AICoaching'),
    flashcards: (navigation: NavigationProps, deckId?: string) => 
      navigation.navigate('FlashcardStudy', { deckId }),
    analytics: (navigation: NavigationProps) => navigation.navigate('AdvancedAnalytics'),
  },

  navigateToMilitary: {
    jobs: (navigation: NavigationProps, jobId: string) => 
      navigation.navigate('JobDetail', { jobId }),
    fitness: (navigation: NavigationProps) => navigation.navigate('PTTest'),
    mepsPrep: (navigation: NavigationProps) => navigation.navigate('MEPSPreparation'),
  },

  navigateToGaming: {
    dashboard: (navigation: NavigationProps) => navigation.navigate('GamificationDashboard'),
    achievements: (navigation: NavigationProps) => navigation.navigate('Achievements'),
    leaderboard: (navigation: NavigationProps) => navigation.navigate('Leaderboard'),
  },
};

// Screen names for easy reference
export const ScreenNames = {
  // Existing screens
  MAIN_TABS: 'MainTabs' as const,
  QUIZ_TAKING: 'QuizTaking' as const,
  QUIZ_RESULTS: 'QuizResults' as const,
  
  // New feature screens
  AI_COACHING: 'AICoaching' as const,
  ADVANCED_ANALYTICS: 'AdvancedAnalytics' as const,
  GAMIFICATION_DASHBOARD: 'GamificationDashboard' as const,
  ACHIEVEMENTS: 'Achievements' as const,
  LEADERBOARD: 'Leaderboard' as const,
  MEPS_PREPARATION: 'MEPSPreparation' as const,
  MEPS_DOCUMENTS: 'MEPSDocuments' as const,
  MEPS_MEDICAL_GUIDE: 'MEPSMedicalGuide' as const,
  PT_TEST: 'PTTest' as const,
  FLASHCARD_STUDY: 'FlashcardStudy' as const,
  JOB_DETAIL: 'JobDetail' as const,
  NOTIFICATION_SETTINGS: 'NotificationSettings' as const,
} as const;

// Type-safe navigation parameters
export type ScreenParams = {
  [ScreenNames.MAIN_TABS]: undefined;
  [ScreenNames.QUIZ_TAKING]: { quizId: string; questionIds: string[] };
  [ScreenNames.QUIZ_RESULTS]: { quizId: string; score: number; totalQuestions: number };
  [ScreenNames.AI_COACHING]: undefined;
  [ScreenNames.ADVANCED_ANALYTICS]: undefined;
  [ScreenNames.GAMIFICATION_DASHBOARD]: undefined;
  [ScreenNames.ACHIEVEMENTS]: undefined;
  [ScreenNames.LEADERBOARD]: undefined;
  [ScreenNames.MEPS_PREPARATION]: undefined;
  [ScreenNames.MEPS_DOCUMENTS]: undefined;
  [ScreenNames.MEPS_MEDICAL_GUIDE]: undefined;
  [ScreenNames.PT_TEST]: undefined;
  [ScreenNames.FLASHCARD_STUDY]: { deckId?: string };
  [ScreenNames.JOB_DETAIL]: { jobId: string };
  [ScreenNames.NOTIFICATION_SETTINGS]: undefined;
};