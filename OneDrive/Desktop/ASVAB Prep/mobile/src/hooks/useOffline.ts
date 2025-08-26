import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '@/services/offlineService';
import { QuestionCategory } from '@asvab-prep/shared';

export interface OfflineHookReturn {
  isOnline: boolean;
  questionsCount: number;
  quizzesCount: number;
  lastSync: Date | null;
  pendingSyncItems: number;
  loading: boolean;
  downloadQuestions: (categories: QuestionCategory[], count?: number) => Promise<boolean>;
  createOfflineQuiz: (title: string, category: QuestionCategory, questionCount: number) => Promise<any>;
  syncWithServer: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

export const useOffline = (): OfflineHookReturn => {
  const [status, setStatus] = useState({
    isOnline: true,
    questionsCount: 0,
    quizzesCount: 0,
    lastSync: null as Date | null,
    pendingSyncItems: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const offlineStatus = await offlineService.getOfflineStatus();
      setStatus(offlineStatus);
    } catch (error) {
      console.error('Failed to load offline status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const downloadQuestions = useCallback(async (categories: QuestionCategory[], count = 50): Promise<boolean> => {
    try {
      const success = await offlineService.downloadQuestionsForOffline(categories, count);
      if (success) {
        await loadStatus(); // Refresh status after download
      }
      return success;
    } catch (error) {
      console.error('Failed to download questions:', error);
      return false;
    }
  }, [loadStatus]);

  const createOfflineQuiz = useCallback(async (title: string, category: QuestionCategory, questionCount: number) => {
    try {
      return await offlineService.createOfflineQuiz(title, category, questionCount);
    } catch (error) {
      console.error('Failed to create offline quiz:', error);
      return null;
    }
  }, []);

  const syncWithServer = useCallback(async (): Promise<boolean> => {
    try {
      const success = await offlineService.syncWithServer();
      if (success) {
        await loadStatus(); // Refresh status after sync
      }
      return success;
    } catch (error) {
      console.error('Failed to sync with server:', error);
      return false;
    }
  }, [loadStatus]);

  const refreshStatus = useCallback(async () => {
    await loadStatus();
  }, [loadStatus]);

  return {
    ...status,
    loading,
    downloadQuestions,
    createOfflineQuiz,
    syncWithServer,
    refreshStatus,
  };
};