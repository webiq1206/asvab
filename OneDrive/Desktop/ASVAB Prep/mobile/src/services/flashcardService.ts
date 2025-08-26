import { apiService } from './api';
import { 
  FlashcardDeck, 
  Flashcard, 
  FlashcardProgress,
  StudySession,
  FlashcardDifficulty,
  MilitaryBranch,
} from '@asvab-prep/shared';

// Local DTOs for API requests
interface CreateFlashcardDto {
  question: string;
  answer: string;
  category: string;
  difficulty: FlashcardDifficulty;
  type: string;
  explanation?: string;
  hint?: string;
  tags?: string[];
  choices?: string[];
  deckId?: string;
  branchRelevance?: string[];
  isPublic?: boolean;
}

interface UpdateFlashcardDto {
  question?: string;
  answer?: string;
  category?: string;
  difficulty?: FlashcardDifficulty;
  type?: string;
  explanation?: string;
  hint?: string;
  tags?: string[];
  choices?: string[];
  branchRelevance?: string[];
  isPublic?: boolean;
  isActive?: boolean;
}

interface CreateFlashcardDeckDto {
  name: string;
  description: string;
  category: string;
  branchRelevance?: string[];
  isPublic?: boolean;
  tags?: string[];
  colorTheme?: string;
  iconName?: string;
}

interface UpdateFlashcardDeckDto {
  name?: string;
  description?: string;
  category?: string;
  branchRelevance?: string[];
  isPublic?: boolean;
  isActive?: boolean;
  tags?: string[];
  colorTheme?: string;
  iconName?: string;
}

interface ReviewFlashcardDto {
  flashcardId: string;
  rating: number;
  timeSpent: number;
  wasCorrect?: boolean;
  userAnswer?: string;
  notes?: string;
}

interface StudySessionDto {
  deckId: string;
  maxCards?: number;
  timeLimit?: number;
  includeNew?: boolean;
  includeDue?: boolean;
  includeReview?: boolean;
  difficulties?: FlashcardDifficulty[];
  tags?: string[];
}

class FlashcardService {
  async createFlashcard(data: CreateFlashcardDto): Promise<Flashcard> {
    const response = await apiClient.post('/flashcards', data);
    return response.data;
  }

  async getUserFlashcards(deckId?: string): Promise<Flashcard[]> {
    const params = deckId ? { deckId } : {};
    const response = await apiClient.get('/flashcards', { params });
    return response.data;
  }

  async updateFlashcard(id: string, data: UpdateFlashcardDto): Promise<Flashcard> {
    const response = await apiClient.put(`/flashcards/${id}`, data);
    return response.data;
  }

  async deleteFlashcard(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/flashcards/${id}`);
    return response.data;
  }

  async reviewFlashcard(data: ReviewFlashcardDto): Promise<{
    review: any;
    nextReviewDate: Date;
    cardStatus: string;
    interval: number;
  }> {
    const response = await apiClient.post('/flashcards/review', data);
    return response.data;
  }

  async getDueFlashcards(deckId?: string): Promise<Flashcard[]> {
    const params = deckId ? { deckId } : {};
    const response = await apiClient.get('/flashcards/due', { params });
    return response.data;
  }

  async startStudySession(data: StudySessionDto): Promise<StudySession> {
    const response = await apiClient.post('/flashcards/study-session', data);
    return response.data;
  }

  async getFlashcardProgress(): Promise<FlashcardProgress> {
    const response = await apiClient.get('/flashcards/progress');
    return response.data;
  }

  // Deck Management
  async createDeck(data: CreateFlashcardDeckDto): Promise<FlashcardDeck> {
    const response = await apiClient.post('/flashcards/decks', data);
    return response.data;
  }

  async getUserDecks(): Promise<FlashcardDeck[]> {
    const response = await apiClient.get('/flashcards/decks');
    return response.data;
  }

  async updateDeck(id: string, data: UpdateFlashcardDeckDto): Promise<FlashcardDeck> {
    const response = await apiClient.put(`/flashcards/decks/${id}`, data);
    return response.data;
  }

  async deleteDeck(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/flashcards/decks/${id}`);
    return response.data;
  }

  async getPublicDecks(page = 1, limit = 20): Promise<{
    decks: FlashcardDeck[];
    pagination: {
      page: number;
      limit: number;
      hasNext: boolean;
    };
  }> {
    const response = await apiClient.get('/flashcards/decks/public', {
      params: { page, limit },
    });
    return response.data;
  }

  // Offline Support
  async syncOfflineReviews(reviews: ReviewFlashcardDto[]): Promise<void> {
    await apiClient.post('/flashcards/sync-reviews', { reviews });
  }

  // Statistics and Analytics
  async getStudyStatistics(timeframe: '7d' | '30d' | '90d' = '7d'): Promise<{
    totalReviews: number;
    averageRating: number;
    studyTime: number;
    retention: number;
    streakDays: number;
    dailyStats: Array<{
      date: string;
      reviews: number;
      timeSpent: number;
      accuracy: number;
    }>;
  }> {
    const response = await apiClient.get('/flashcards/statistics', {
      params: { timeframe },
    });
    return response.data;
  }

  // Premium Features
  async exportDeck(deckId: string, format: 'pdf' | 'csv' | 'json' = 'json'): Promise<Blob> {
    const response = await apiClient.get(`/flashcards/decks/${deckId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  async importDeck(file: File, format: 'csv' | 'json' = 'json'): Promise<FlashcardDeck> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    
    const response = await apiClient.post('/flashcards/decks/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // AI-Powered Features (Premium)
  async generateFlashcardsFromText(text: string, category: string): Promise<Flashcard[]> {
    const response = await apiClient.post('/flashcards/generate', {
      text,
      category,
    });
    return response.data;
  }

  async getPersonalizedRecommendations(): Promise<{
    weakAreas: string[];
    recommendedDecks: FlashcardDeck[];
    suggestedStudyTime: number;
    nextReviewTime: Date;
  }> {
    const response = await apiClient.get('/flashcards/recommendations');
    return response.data;
  }

  // Collaborative Features
  async shareDeck(deckId: string, shareWith: string[]): Promise<{ shareUrl: string }> {
    const response = await apiClient.post(`/flashcards/decks/${deckId}/share`, {
      shareWith,
    });
    return response.data;
  }

  async cloneDeck(deckId: string, name?: string): Promise<FlashcardDeck> {
    const response = await apiClient.post(`/flashcards/decks/${deckId}/clone`, {
      name,
    });
    return response.data;
  }

  // Advanced Search
  async searchFlashcards(query: {
    text?: string;
    category?: string;
    difficulty?: FlashcardDifficulty;
    tags?: string[];
    isPublic?: boolean;
    createdBy?: string;
  }): Promise<Flashcard[]> {
    const response = await apiClient.post('/flashcards/search', query);
    return response.data;
  }

  // Spaced Repetition Insights
  async getSpacedRepetitionInsights(): Promise<{
    averageEaseFactor: number;
    averageInterval: number;
    retentionByDifficulty: Record<string, number>;
    optimalStudyTime: {
      morning: number;
      afternoon: number;
      evening: number;
    };
    nextOptimalSession: Date;
  }> {
    const response = await apiClient.get('/flashcards/spaced-repetition/insights');
    return response.data;
  }
}

export const flashcardService = new FlashcardService();