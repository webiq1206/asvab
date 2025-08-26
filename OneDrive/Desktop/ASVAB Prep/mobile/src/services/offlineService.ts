import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Question, QuestionCategory, Quiz } from '@asvab-prep/shared';
import { apiService } from './api';

interface OfflineQuiz extends Quiz {
  questions: Question[];
  downloadedAt: Date;
  expiresAt: Date;
}

interface OfflineData {
  questions: Question[];
  quizzes: OfflineQuiz[];
  lastSync: Date;
  categories: QuestionCategory[];
}

interface SyncQueueItem {
  id: string;
  type: 'quiz_result' | 'bookmark' | 'progress';
  data: any;
  timestamp: Date;
  retryCount: number;
}

const STORAGE_KEYS = {
  OFFLINE_DATA: '@asvab_offline_data',
  SYNC_QUEUE: '@asvab_sync_queue',
  OFFLINE_SETTINGS: '@asvab_offline_settings',
};

const DEFAULT_OFFLINE_SETTINGS = {
  autoDownload: true,
  maxQuizzes: 10,
  maxQuestionsPerCategory: 50,
  syncInterval: 24 * 60 * 60 * 1000, // 24 hours
  retentionDays: 7,
};

class OfflineService {
  private isOnline = true;
  private syncInProgress = false;
  private netInfoSubscription: any = null;

  async initialize(): Promise<void> {
    try {
      // Set up network connectivity monitoring
      this.netInfoSubscription = NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;
        
        if (!wasOnline && this.isOnline) {
          // Just came back online, sync data
          this.syncWithServer();
        }
      });

      // Get initial network state
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;

      // Clean up expired data
      await this.cleanupExpiredData();

      console.log('Offline service initialized');
    } catch (error) {
      console.error('Failed to initialize offline service:', error);
    }
  }

  async downloadQuestionsForOffline(categories: QuestionCategory[], count: number = 50): Promise<boolean> {
    if (!this.isOnline) {
      console.log('Cannot download questions while offline');
      return false;
    }

    try {
      const offlineData = await this.getOfflineData();
      const settings = await this.getOfflineSettings();

      for (const category of categories) {
        try {
          const questions = await apiService.get<Question[]>(`/questions?category=${category}&limit=${Math.min(count, settings.maxQuestionsPerCategory)}`);
          
          // Merge with existing questions, avoiding duplicates
          const existingQuestions = offlineData.questions.filter(q => q.category !== category);
          offlineData.questions = [...existingQuestions, ...questions];
        } catch (error) {
          console.error(`Failed to download questions for category ${category}:`, error);
        }
      }

      offlineData.lastSync = new Date();
      offlineData.categories = categories;
      
      await this.saveOfflineData(offlineData);
      console.log(`Downloaded questions for offline use: ${offlineData.questions.length} total questions`);
      
      return true;
    } catch (error) {
      console.error('Failed to download questions for offline:', error);
      return false;
    }
  }

  async downloadQuizForOffline(quizId: string): Promise<boolean> {
    if (!this.isOnline) {
      console.log('Cannot download quiz while offline');
      return false;
    }

    try {
      const quiz = await apiService.get<Quiz>(`/quizzes/${quizId}`);
      const questions = await apiService.get<Question[]>(`/quizzes/${quizId}/questions`);

      const offlineQuiz: OfflineQuiz = {
        ...quiz,
        questions,
        downloadedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      const offlineData = await this.getOfflineData();
      const existingIndex = offlineData.quizzes.findIndex(q => q.id === quizId);
      
      if (existingIndex >= 0) {
        offlineData.quizzes[existingIndex] = offlineQuiz;
      } else {
        offlineData.quizzes.push(offlineQuiz);
        
        // Limit number of offline quizzes
        const settings = await this.getOfflineSettings();
        if (offlineData.quizzes.length > settings.maxQuizzes) {
          offlineData.quizzes = offlineData.quizzes
            .sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime())
            .slice(0, settings.maxQuizzes);
        }
      }

      await this.saveOfflineData(offlineData);
      console.log(`Downloaded quiz for offline use: ${quiz.title}`);
      
      return true;
    } catch (error) {
      console.error('Failed to download quiz for offline:', error);
      return false;
    }
  }

  async getOfflineQuestions(category?: QuestionCategory, limit?: number): Promise<Question[]> {
    try {
      const offlineData = await this.getOfflineData();
      let questions = offlineData.questions;

      if (category) {
        questions = questions.filter(q => q.category === category);
      }

      if (limit) {
        questions = questions.slice(0, limit);
      }

      return questions;
    } catch (error) {
      console.error('Failed to get offline questions:', error);
      return [];
    }
  }

  async getOfflineQuiz(quizId: string): Promise<OfflineQuiz | null> {
    try {
      const offlineData = await this.getOfflineData();
      const quiz = offlineData.quizzes.find(q => q.id === quizId);
      
      if (quiz && quiz.expiresAt > new Date()) {
        return quiz;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get offline quiz:', error);
      return null;
    }
  }

  async createOfflineQuiz(title: string, category: QuestionCategory, questionCount: number): Promise<OfflineQuiz | null> {
    try {
      const questions = await this.getOfflineQuestions(category, questionCount);
      
      if (questions.length === 0) {
        console.log('No offline questions available for category:', category);
        return null;
      }

      // Shuffle questions
      const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

      const offlineQuiz: OfflineQuiz = {
        id: `offline_${Date.now()}`,
        title,
        description: `Offline ${category.replace(/_/g, ' ')} quiz`,
        category,
        difficulty: 'MEDIUM', // Default difficulty
        timeLimit: questionCount * 90, // 1.5 minutes per question
        questionsCount: shuffledQuestions.length,
        isActive: true,
        isOffline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: shuffledQuestions,
        downloadedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      } as OfflineQuiz;

      return offlineQuiz;
    } catch (error) {
      console.error('Failed to create offline quiz:', error);
      return null;
    }
  }

  async saveQuizResult(quizId: string, answers: any[], score: number, timeSpent: number): Promise<boolean> {
    const resultData = {
      quizId,
      answers,
      score,
      timeSpent,
      completedAt: new Date(),
      isOffline: !this.isOnline,
    };

    if (this.isOnline) {
      try {
        await apiService.post('/quiz-results', resultData);
        return true;
      } catch (error) {
        console.error('Failed to save quiz result online:', error);
        // Fall back to offline storage
      }
    }

    // Save to sync queue for later upload
    await this.addToSyncQueue('quiz_result', resultData);
    return true;
  }

  async saveBookmark(questionId: string, note?: string): Promise<boolean> {
    const bookmarkData = {
      questionId,
      note,
      bookmarkedAt: new Date(),
      isOffline: !this.isOnline,
    };

    if (this.isOnline) {
      try {
        await apiService.post('/bookmarks', bookmarkData);
        return true;
      } catch (error) {
        console.error('Failed to save bookmark online:', error);
      }
    }

    await this.addToSyncQueue('bookmark', bookmarkData);
    return true;
  }

  async syncWithServer(): Promise<boolean> {
    if (!this.isOnline || this.syncInProgress) {
      return false;
    }

    try {
      this.syncInProgress = true;
      console.log('Starting sync with server...');

      const syncQueue = await this.getSyncQueue();
      let successCount = 0;
      let failureCount = 0;

      for (const item of syncQueue) {
        try {
          let endpoint = '';
          
          switch (item.type) {
            case 'quiz_result':
              endpoint = '/quiz-results';
              break;
            case 'bookmark':
              endpoint = '/bookmarks';
              break;
            case 'progress':
              endpoint = '/progress';
              break;
          }

          await apiService.post(endpoint, item.data);
          await this.removeFromSyncQueue(item.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // Increment retry count
          item.retryCount++;
          
          // Remove items that have failed too many times
          if (item.retryCount >= 5) {
            await this.removeFromSyncQueue(item.id);
            console.log(`Removing failed sync item after 5 retries: ${item.id}`);
          } else {
            await this.updateSyncQueueItem(item);
          }
          
          failureCount++;
        }
      }

      console.log(`Sync completed: ${successCount} successful, ${failureCount} failed`);
      return successCount > 0;
    } catch (error) {
      console.error('Sync with server failed:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  async getOfflineStatus(): Promise<{
    isOnline: boolean;
    questionsCount: number;
    quizzesCount: number;
    lastSync: Date | null;
    pendingSyncItems: number;
  }> {
    try {
      const [offlineData, syncQueue] = await Promise.all([
        this.getOfflineData(),
        this.getSyncQueue(),
      ]);

      return {
        isOnline: this.isOnline,
        questionsCount: offlineData.questions.length,
        quizzesCount: offlineData.quizzes.length,
        lastSync: offlineData.lastSync,
        pendingSyncItems: syncQueue.length,
      };
    } catch (error) {
      console.error('Failed to get offline status:', error);
      return {
        isOnline: this.isOnline,
        questionsCount: 0,
        quizzesCount: 0,
        lastSync: null,
        pendingSyncItems: 0,
      };
    }
  }

  async clearOfflineData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_DATA);
      console.log('Offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }

  async updateOfflineSettings(settings: Partial<typeof DEFAULT_OFFLINE_SETTINGS>): Promise<void> {
    try {
      const currentSettings = await this.getOfflineSettings();
      const newSettings = { ...currentSettings, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to update offline settings:', error);
    }
  }

  private async getOfflineData(): Promise<OfflineData> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_DATA);
      if (data) {
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        parsed.lastSync = parsed.lastSync ? new Date(parsed.lastSync) : new Date();
        parsed.quizzes = parsed.quizzes.map((quiz: any) => ({
          ...quiz,
          downloadedAt: new Date(quiz.downloadedAt),
          expiresAt: new Date(quiz.expiresAt),
          createdAt: new Date(quiz.createdAt),
          updatedAt: new Date(quiz.updatedAt),
        }));
        return parsed;
      }
    } catch (error) {
      console.error('Failed to get offline data:', error);
    }

    return {
      questions: [],
      quizzes: [],
      lastSync: new Date(),
      categories: [],
    };
  }

  private async saveOfflineData(data: OfflineData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }

  private async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to get sync queue:', error);
    }
    return [];
  }

  private async saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private async addToSyncQueue(type: SyncQueueItem['type'], data: any): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const item: SyncQueueItem = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date(),
        retryCount: 0,
      };
      queue.push(item);
      await this.saveSyncQueue(queue);
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
    }
  }

  private async removeFromSyncQueue(itemId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const filteredQueue = queue.filter(item => item.id !== itemId);
      await this.saveSyncQueue(filteredQueue);
    } catch (error) {
      console.error('Failed to remove item from sync queue:', error);
    }
  }

  private async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const index = queue.findIndex(queueItem => queueItem.id === item.id);
      if (index >= 0) {
        queue[index] = item;
        await this.saveSyncQueue(queue);
      }
    } catch (error) {
      console.error('Failed to update sync queue item:', error);
    }
  }

  private async getOfflineSettings(): Promise<typeof DEFAULT_OFFLINE_SETTINGS> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_SETTINGS);
      if (data) {
        return { ...DEFAULT_OFFLINE_SETTINGS, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Failed to get offline settings:', error);
    }
    return DEFAULT_OFFLINE_SETTINGS;
  }

  private async cleanupExpiredData(): Promise<void> {
    try {
      const offlineData = await this.getOfflineData();
      const now = new Date();
      
      // Remove expired quizzes
      const validQuizzes = offlineData.quizzes.filter(quiz => quiz.expiresAt > now);
      
      if (validQuizzes.length !== offlineData.quizzes.length) {
        offlineData.quizzes = validQuizzes;
        await this.saveOfflineData(offlineData);
        console.log(`Cleaned up ${offlineData.quizzes.length - validQuizzes.length} expired quizzes`);
      }

      // Clean up old sync queue items
      const syncQueue = await this.getSyncQueue();
      const settings = await this.getOfflineSettings();
      const cutoffDate = new Date(now.getTime() - settings.retentionDays * 24 * 60 * 60 * 1000);
      
      const validSyncItems = syncQueue.filter(item => item.timestamp > cutoffDate);
      
      if (validSyncItems.length !== syncQueue.length) {
        await this.saveSyncQueue(validSyncItems);
        console.log(`Cleaned up ${syncQueue.length - validSyncItems.length} old sync items`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  dispose(): void {
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
      this.netInfoSubscription = null;
    }
  }
}

export const offlineService = new OfflineService();