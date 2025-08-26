import { apiService } from './api';
import {
  Question,
  QuestionCategory,
  QuestionDifficulty,
  UserProgress,
} from '@asvab-prep/shared';

export interface QuestionsResponse {
  questions: Question[];
  totalCount: number;
  hasMore: boolean;
  remainingQuestions: number; // -1 for unlimited
}

export interface CategoryResponse {
  category: QuestionCategory;
  questionCount: number;
}

export interface QuestionDetailResponse extends Question {
  correctAnswer: number;
  explanation: string;
  isPremiumExplanation: boolean;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  attemptId: string;
}

export interface QuestionSession {
  id: string;
  userId: string;
  questionIds: string[];
  currentQuestionIndex: number;
  startedAt: string;
  completedAt?: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  sessionType: string;
}

export interface ResumeSessionResponse {
  session: QuestionSession;
  remainingQuestions: string[];
  answeredCount: number;
  totalCount: number;
}

class QuestionsService {
  async getQuestions(params?: {
    category?: QuestionCategory;
    difficulty?: QuestionDifficulty;
    limit?: number;
    offset?: number;
  }): Promise<QuestionsResponse> {
    return apiService.get<QuestionsResponse>('/questions', { params });
  }

  async getCategories(): Promise<CategoryResponse[]> {
    return apiService.get<CategoryResponse[]>('/questions/categories');
  }

  async getQuestionById(questionId: string): Promise<QuestionDetailResponse> {
    return apiService.get<QuestionDetailResponse>(`/questions/${questionId}`);
  }

  async submitAnswer(questionId: string, userAnswer: number): Promise<SubmitAnswerResponse> {
    return apiService.post<SubmitAnswerResponse>(`/questions/${questionId}/answer`, {
      userAnswer,
    });
  }

  async getUserProgress(): Promise<UserProgress[]> {
    return apiService.get<UserProgress[]>('/questions/progress');
  }

  async getRandomQuestions(params?: {
    count?: number;
    category?: QuestionCategory;
    difficulty?: QuestionDifficulty;
  }): Promise<Question[]> {
    return apiService.get<Question[]>('/questions/random', { params });
  }

  async searchQuestions(searchTerm: string, limit = 10): Promise<Question[]> {
    return apiService.get<Question[]>('/questions/search', {
      params: { searchTerm, limit },
    });
  }

  async getQuestionSession(): Promise<QuestionSession | null> {
    try {
      return await apiService.get<QuestionSession>('/questions/session');
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async resumeQuestionSession(sessionId: string): Promise<ResumeSessionResponse> {
    return apiService.get<ResumeSessionResponse>(`/questions/session/${sessionId}/resume`);
  }

  async importQuestions(): Promise<{ imported: number; total: number }> {
    return apiService.post<{ imported: number; total: number }>('/questions/import');
  }
}

export const questionsService = new QuestionsService();