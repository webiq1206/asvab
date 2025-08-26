import { apiClient } from './api';
import { QuestionCategory, QuestionDifficulty } from '@asvab-prep/shared';

export interface CreateQuizRequest {
  title: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  questionCount: number;
  isASVABReplica?: boolean;
  targetScore?: number;
}

export interface Quiz {
  id: string;
  title: string;
  category?: QuestionCategory;
  isASVABReplica: boolean;
  totalQuestions: number;
  correctAnswers: number;
  score?: number;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  questions: QuizQuestion[];
  sections?: QuizSection[];
}

export interface QuizQuestion {
  id: string;
  questionId: string;
  userAnswer?: number;
  isCorrect?: boolean;
  timeSpent?: number;
  orderIndex: number;
  question: {
    id: string;
    content: string;
    options: string[];
    category: QuestionCategory;
    difficulty: QuestionDifficulty;
    tags: string[];
    correctAnswer?: number;
    explanationBasic?: string;
  };
}

export interface QuizSection {
  id: string;
  category: QuestionCategory;
  timeLimit: number;
  timeSpent?: number;
  startedAt?: string;
  completedAt?: string;
  orderIndex: number;
}

export interface SubmitQuizAnswerRequest {
  questionId: string;
  userAnswer: number;
  timeSpent?: number;
}

export interface CompleteQuizRequest {
  timeSpent: number;
}

export interface QuizResult {
  quiz: Quiz;
  performanceMessage: string;
  recommendations: string[];
}

export interface QuizHistoryResponse {
  quizzes: QuizHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface QuizHistoryItem {
  id: string;
  title: string;
  category?: QuestionCategory;
  isASVABReplica: boolean;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: string;
}

class QuizService {
  async createQuiz(request: CreateQuizRequest): Promise<Quiz> {
    const response = await apiClient.post('/quizzes', request);
    return response.data;
  }

  async createASVABReplica(title: string, targetScore?: number): Promise<Quiz> {
    const response = await apiClient.post('/quizzes/asvab-replica', {
      title,
      targetScore,
    });
    return response.data;
  }

  async getQuiz(quizId: string): Promise<Quiz> {
    const response = await apiClient.get(`/quizzes/${quizId}`);
    return response.data;
  }

  async submitQuizAnswer(
    quizId: string,
    request: SubmitQuizAnswerRequest
  ): Promise<{ isCorrect: boolean; correctAnswer: number }> {
    const response = await apiClient.post(`/quizzes/${quizId}/answers`, request);
    return response.data;
  }

  async completeQuiz(quizId: string, request: CompleteQuizRequest): Promise<QuizResult> {
    const response = await apiClient.post(`/quizzes/${quizId}/complete`, request);
    return response.data;
  }

  async getQuizHistory(page = 1, limit = 10): Promise<QuizHistoryResponse> {
    const response = await apiClient.get('/quizzes/history', {
      params: { page, limit },
    });
    return response.data;
  }

  // Utility functions
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  calculateTimeRemaining(timeLimit: number, timeSpent: number): number {
    return Math.max(0, timeLimit - timeSpent);
  }

  getScoreColor(score: number): string {
    if (score >= 90) return '#228B22'; // Success green
    if (score >= 80) return '#FFD700'; // Warning yellow
    if (score >= 70) return '#FF8C00'; // Tactical orange
    return '#DC143C'; // Danger red
  }

  getPerformanceLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  }
}

export const quizService = new QuizService();