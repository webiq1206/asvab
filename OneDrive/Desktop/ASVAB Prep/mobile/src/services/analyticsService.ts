import { apiService } from './api';
import { MilitaryBranch } from '@asvab-prep/shared';

export interface AnalyticsTimeframe {
  label: string;
  value: '7d' | '30d' | '90d' | '1y';
  days: number;
}

export interface PerformanceMetrics {
  afqtScore: number;
  afqtTrend: number; // percentage change
  overallAccuracy: number;
  accuracyTrend: number;
  totalQuestions: number;
  questionsTrend: number;
  studyTime: number; // in seconds
  studyTimeTrend: number;
  averageSessionLength: number; // in seconds
  studyStreak: {
    current: number;
    longest: number;
    isActive: boolean;
    nextMilestone: number;
  };
}

export interface CategoryPerformance {
  category: string;
  displayName: string;
  score: number;
  accuracy: number;
  questionsAnswered: number;
  averageTime: number; // seconds per question
  trend: number; // percentage change
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_WORK';
  isAFQT: boolean;
  weakTopics: string[];
  strongTopics: string[];
}

export interface StudyPattern {
  bestStudyTimes: Array<{
    hour: number;
    accuracy: number;
    sessionCount: number;
  }>;
  studyDuration: {
    optimal: number; // minutes
    actual: number; // minutes
    recommendation: string;
  };
  sessionFrequency: {
    daily: number;
    weekly: number;
    recommendation: string;
  };
  difficulty: {
    preferredLevel: 'EASY' | 'MEDIUM' | 'HARD';
    successRate: number;
    recommendation: string;
  };
}

export interface ComparisonData {
  userRank: number;
  totalUsers: number;
  percentile: number;
  branchRank: number;
  branchUsers: number;
  branchPercentile: number;
  similarUsers: {
    afqtScore: number;
    accuracy: number;
    studyTime: number;
  };
}

export interface PredictiveInsights {
  estimatedAFQT: {
    current: number;
    projected30: number;
    projected90: number;
    confidence: number; // 0-1
  };
  readinessDate: {
    estimatedDate: string;
    daysRemaining: number;
    confidence: number;
  };
  riskFactors: Array<{
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: string;
    recommendation: string;
  }>;
  opportunities: Array<{
    area: string;
    potential: number; // points improvement
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    timeline: string;
  }>;
}

export interface LearningAnalytics {
  retentionRate: number;
  forgettingCurve: Array<{
    day: number;
    retention: number;
  }>;
  optimalReviewIntervals: {
    [category: string]: number; // days
  };
  learningVelocity: number; // questions mastered per hour
  cognitiveLoad: {
    current: number; // 0-100
    optimal: number;
    recommendation: string;
  };
}

export interface GoalTracking {
  targetAFQT: number;
  currentProgress: number; // 0-100%
  estimatedCompletion: string;
  milestones: Array<{
    id: string;
    title: string;
    target: number;
    current: number;
    completed: boolean;
    dueDate: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    impact: string;
  }>;
}

export interface AdvancedAnalytics {
  performance: PerformanceMetrics;
  categories: CategoryPerformance[];
  studyPatterns: StudyPattern;
  comparison: ComparisonData;
  predictions: PredictiveInsights;
  learning: LearningAnalytics;
  goals: GoalTracking;
}

class AnalyticsService {
  // Get comprehensive analytics data
  async getAdvancedAnalytics(timeframe: string = '30d'): Promise<AdvancedAnalytics> {
    return await apiService.get<AdvancedAnalytics>(`/analytics/advanced?timeframe=${timeframe}`);
  }

  // Get performance metrics with trends
  async getPerformanceMetrics(timeframe: string = '30d'): Promise<PerformanceMetrics> {
    return await apiService.get<PerformanceMetrics>(`/analytics/performance?timeframe=${timeframe}`);
  }

  // Get category-specific performance
  async getCategoryAnalytics(timeframe: string = '30d'): Promise<CategoryPerformance[]> {
    return await apiService.get<CategoryPerformance[]>(`/analytics/categories?timeframe=${timeframe}`);
  }

  // Get study patterns and recommendations
  async getStudyPatterns(timeframe: string = '30d'): Promise<StudyPattern> {
    return await apiService.get<StudyPattern>(`/analytics/study-patterns?timeframe=${timeframe}`);
  }

  // Get comparison with other users
  async getComparisonData(): Promise<ComparisonData> {
    return await apiService.get<ComparisonData>('/analytics/comparison');
  }

  // Get predictive insights
  async getPredictiveInsights(): Promise<PredictiveInsights> {
    return await apiService.get<PredictiveInsights>('/analytics/predictions');
  }

  // Get learning analytics
  async getLearningAnalytics(timeframe: string = '30d'): Promise<LearningAnalytics> {
    return await apiService.get<LearningAnalytics>(`/analytics/learning?timeframe=${timeframe}`);
  }

  // Get goal tracking
  async getGoalTracking(): Promise<GoalTracking> {
    return await apiService.get<GoalTracking>('/analytics/goals');
  }

  // Get historical data for charts
  async getHistoricalData(
    timeframe: string = '30d',
    metrics: string[] = ['afqt', 'accuracy', 'studyTime']
  ): Promise<{
    dailyStats: Array<{
      date: string;
      afqtScore: number;
      accuracy: number;
      studyTime: number;
      questionsAnswered: number;
    }>;
    categoryTrends: Array<{
      category: string;
      data: Array<{
        date: string;
        score: number;
        accuracy: number;
      }>;
    }>;
    weeklyAverages: Array<{
      week: string;
      avgScore: number;
      avgAccuracy: number;
      totalTime: number;
    }>;
  }> {
    return await apiService.get(`/analytics/historical?timeframe=${timeframe}&metrics=${metrics.join(',')}`);
  }

  // Export analytics report
  async exportReport(
    format: 'PDF' | 'CSV' = 'PDF',
    timeframe: string = '30d',
    sections: string[] = ['performance', 'categories', 'predictions']
  ): Promise<{
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }> {
    return await apiService.post('/analytics/export', {
      format,
      timeframe,
      sections,
    });
  }

  // Update goal settings
  async updateGoals(goals: {
    targetAFQT: number;
    targetDate: string;
    studyTimeGoal: number; // minutes per day
    accuracyGoal: number; // percentage
  }): Promise<GoalTracking> {
    return await apiService.put('/analytics/goals', goals);
  }

  // Get real-time performance during quiz/study
  async getRealtimePerformance(sessionId: string): Promise<{
    currentAccuracy: number;
    questionsAnswered: number;
    avgResponseTime: number;
    strongAreas: string[];
    weakAreas: string[];
    recommendations: string[];
  }> {
    return await apiService.get(`/analytics/realtime/${sessionId}`);
  }

  // Track custom events for analytics
  async trackEvent(event: {
    type: 'STUDY_SESSION' | 'QUIZ_COMPLETION' | 'GOAL_SET' | 'MILESTONE_REACHED';
    category?: string;
    branch?: MilitaryBranch;
    properties: Record<string, any>;
  }): Promise<void> {
    await apiService.post('/analytics/events', event);
  }

  // Get branch-specific insights
  async getBranchInsights(branch: MilitaryBranch): Promise<{
    branchSpecificContent: {
      jobs: number;
      averageRequirements: {
        afqt: number;
        lineScores: Record<string, number>;
      };
    };
    peerComparison: {
      yourRank: number;
      totalPeers: number;
      averageScore: number;
      topPerformers: Array<{
        score: number;
        studyTime: number;
        categories: string[];
      }>;
    };
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      category?: string;
    }>;
  }> {
    return await apiService.get(`/analytics/branch/${branch}`);
  }

  // Available timeframes
  getTimeframes(): AnalyticsTimeframe[] {
    return [
      { label: '7 Days', value: '7d', days: 7 },
      { label: '30 Days', value: '30d', days: 30 },
      { label: '90 Days', value: '90d', days: 90 },
      { label: '1 Year', value: '1y', days: 365 },
    ];
  }

  // Format time duration
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Format trend percentage
  formatTrend(trend: number): { text: string; isPositive: boolean } {
    const isPositive = trend >= 0;
    const text = `${isPositive ? '+' : ''}${trend.toFixed(1)}%`;
    return { text, isPositive };
  }

  // Get performance level
  getPerformanceLevel(score: number): {
    level: string;
    color: string;
    icon: string;
    description: string;
  } {
    if (score >= 90) {
      return {
        level: 'EXCELLENT',
        color: '#10B981', // success green
        icon: 'trophy',
        description: 'Outstanding performance - mission ready!'
      };
    } else if (score >= 80) {
      return {
        level: 'GOOD',
        color: '#3B82F6', // primary blue
        icon: 'checkmark-circle',
        description: 'Good performance - keep up the momentum!'
      };
    } else if (score >= 70) {
      return {
        level: 'FAIR',
        color: '#F59E0B', // warning yellow
        icon: 'warning',
        description: 'Fair performance - room for improvement!'
      };
    } else {
      return {
        level: 'NEEDS_WORK',
        color: '#EF4444', // error red
        icon: 'alert-circle',
        description: 'Critical - intensive training required!'
      };
    }
  }

  // Calculate percentile from rank
  calculatePercentile(rank: number, total: number): number {
    return Math.round(((total - rank + 1) / total) * 100);
  }

  // Get AFQT category from score
  getAFQTCategory(score: number): {
    category: string;
    description: string;
    eligibility: string[];
  } {
    if (score >= 93) {
      return {
        category: 'Category I',
        description: 'Outstanding - Top 7% of test takers',
        eligibility: ['All Military Occupations', 'Officer Programs', 'Special Operations']
      };
    } else if (score >= 65) {
      return {
        category: 'Category II',
        description: 'Above Average - Top 35% of test takers',
        eligibility: ['Most Military Occupations', 'Technical Fields', 'Leadership Roles']
      };
    } else if (score >= 50) {
      return {
        category: 'Category IIIA',
        description: 'Average - 50th percentile',
        eligibility: ['Many Military Occupations', 'Support Roles', 'Basic Training']
      };
    } else if (score >= 31) {
      return {
        category: 'Category IIIB',
        description: 'Below Average - Limited options',
        eligibility: ['Limited Military Occupations', 'Entry-level Positions']
      };
    } else {
      return {
        category: 'Category IV-V',
        description: 'Needs Improvement',
        eligibility: ['Very Limited Options', 'Retesting Recommended']
      };
    }
  }
}

export const analyticsService = new AnalyticsService();