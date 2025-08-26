import { apiService } from './api';
import { QuestionCategory } from '@asvab-prep/shared';

export interface StudyRecommendation {
  category: QuestionCategory;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  estimatedStudyTime: number; // minutes
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  militaryContext: string;
}

export interface PersonalizedCoaching {
  greetingMessage: string;
  dailyGoal: {
    questionsToComplete: number;
    timeToSpend: number; // minutes
    focusAreas: QuestionCategory[];
  };
  motivationalMessage: string;
  studyStreak: {
    current: number;
    target: number;
    encouragement: string;
  };
  recommendations: StudyRecommendation[];
  nextMilestone: {
    description: string;
    progress: number; // percentage
    reward: string;
  };
}

export interface AdaptiveDifficultyAdjustment {
  currentLevel: number; // 1-10 scale
  suggestedAdjustment: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
  reasoning: string;
  confidenceScore: number; // 0-1
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  category: QuestionCategory;
  targetQuestions: number;
  timeLimit: number; // minutes
  xpReward: number;
  isCompleted: boolean;
  progress: number; // 0-100
}

export interface CoachingInsight {
  type: 'strength' | 'weakness' | 'improvement' | 'milestone';
  title: string;
  message: string;
  actionable: boolean;
  suggestedAction?: string;
  category?: QuestionCategory;
}

class AICoachingService {
  async getPersonalizedCoaching(): Promise<PersonalizedCoaching> {
    return apiService.get<PersonalizedCoaching>('/ai/coaching/personalized');
  }

  async getDifficultyAdjustment(category: QuestionCategory): Promise<AdaptiveDifficultyAdjustment> {
    return apiService.get<AdaptiveDifficultyAdjustment>(`/ai/coaching/difficulty-adjustment/${category}`);
  }

  async getDailyMissions(): Promise<DailyMission[]> {
    return apiService.get<DailyMission[]>('/ai/coaching/daily-missions');
  }

  async completeMission(missionId: string, questionsCompleted: number): Promise<{ success: boolean; xpEarned: number }> {
    return apiService.post<{ success: boolean; xpEarned: number }>(`/ai/coaching/complete-mission/${missionId}`, {
      questionsCompleted,
    });
  }

  async getCoachingInsights(): Promise<CoachingInsight[]> {
    return apiService.get<CoachingInsight[]>('/ai/coaching/insights');
  }

  async getStudyPlan(targetScore: number, timeframe: number): Promise<{
    dailyPlan: Array<{
      day: number;
      categories: QuestionCategory[];
      questionsCount: number;
      estimatedTime: number;
    }>;
    milestones: Array<{
      week: number;
      goals: string[];
      targetAccuracy: number;
    }>;
  }> {
    return apiService.post('/ai/coaching/study-plan', { targetScore, timeframe });
  }

  async trackStudySession(sessionData: {
    category: QuestionCategory;
    questionsAttempted: number;
    correctAnswers: number;
    timeSpent: number;
    difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
  }): Promise<{ updatedRecommendations: StudyRecommendation[] }> {
    return apiService.post('/ai/coaching/track-session', sessionData);
  }

  async getPerformancePrediction(targetDate: string): Promise<{
    predictedScore: number;
    confidence: number;
    strengthAreas: QuestionCategory[];
    weaknessAreas: QuestionCategory[];
    recommendedStudyHours: number;
  }> {
    return apiService.get(`/ai/coaching/performance-prediction?targetDate=${targetDate}`);
  }
}

export const aiCoachingService = new AICoachingService();