import { apiClient } from './api';
import { QuestionCategory, MilitaryBranch, ALL_ASVAB_CATEGORIES, AFQT_CATEGORIES } from '@asvab-prep/shared';

export interface DashboardData {
  greeting: string;
  afqtScore: number;
  readinessPercentage: number;
  categoryPerformance: CategoryPerformance[];
  dailyOrders: DailyOrder[];
  studyStreak: StudyStreakData;
  quickStats: QuickStats;
  recentActivity: ActivityItem[];
}

export interface CategoryPerformance {
  category: QuestionCategory;
  displayName: string;
  score: number;
  questionsAnswered: number;
  accuracy: number;
  level: 'EXCELLENT' | 'GOOD' | 'NEEDS_WORK' | 'CRITICAL';
  color: string;
  isAFQT: boolean;
}

export interface DailyOrder {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category?: QuestionCategory;
  completed: boolean;
  dueTime?: string;
  points: number;
}

export interface StudyStreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  streakActive: boolean;
  nextMilestone: number;
}

export interface QuickStats {
  totalQuestions: number;
  correctAnswers: number;
  avgScore: number;
  hoursStudied: number;
  quizzesCompleted: number;
  rank: string;
}

export interface ActivityItem {
  id: string;
  type: 'QUESTION' | 'QUIZ' | 'ACHIEVEMENT' | 'STREAK';
  title: string;
  description: string;
  timestamp: string;
  category?: QuestionCategory;
  score?: number;
}

export interface ProgressExport {
  format: 'PDF' | 'CSV';
  data: ExportData;
}

export interface ExportData {
  userInfo: {
    name: string;
    branch: MilitaryBranch;
    exportDate: string;
    studyPeriod: string;
  };
  afqtScore: number;
  categoryScores: {
    category: string;
    score: number;
    questionsAnswered: number;
    accuracy: number;
  }[];
  recommendations: string[];
  readinessAssessment: string;
}

class DashboardService {
  // Calculate AFQT score using official formula
  calculateAFQT(categoryScores: Record<QuestionCategory, number>): number {
    const afqtCategories = AFQT_CATEGORIES;
    let totalScore = 0;
    let categoryCount = 0;

    // AFQT uses weighted scoring: 2 × VE + AR + MK
    // VE (Verbal Expression) = WK + PC
    const wordKnowledge = categoryScores[QuestionCategory.WORD_KNOWLEDGE] || 0;
    const paragraphComp = categoryScores[QuestionCategory.PARAGRAPH_COMPREHENSION] || 0;
    const arithmeticReasoning = categoryScores[QuestionCategory.ARITHMETIC_REASONING] || 0;
    const mathKnowledge = categoryScores[QuestionCategory.MATHEMATICS_KNOWLEDGE] || 0;

    const verbalExpression = (wordKnowledge + paragraphComp) / 2;
    const afqtRaw = (2 * verbalExpression) + arithmeticReasoning + mathKnowledge;
    
    // Convert to percentile (simplified approximation)
    return Math.min(99, Math.max(1, Math.round(afqtRaw / 4)));
  }

  // Calculate overall readiness percentage
  calculateReadiness(categoryPerformance: CategoryPerformance[], afqtScore: number): number {
    const afqtWeight = 0.6; // AFQT accounts for 60% of readiness
    const categoryWeight = 0.4; // Other categories account for 40%

    const afqtReadiness = Math.min(100, afqtScore * 1.2); // Scale AFQT to 0-100
    
    const avgCategoryScore = categoryPerformance.length > 0
      ? categoryPerformance.reduce((sum, cat) => sum + cat.score, 0) / categoryPerformance.length
      : 0;

    return Math.round((afqtReadiness * afqtWeight) + (avgCategoryScore * categoryWeight));
  }

  // Get performance level based on score
  getPerformanceLevel(score: number): CategoryPerformance['level'] {
    if (score >= 85) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'NEEDS_WORK';
    return 'CRITICAL';
  }

  // Get performance color
  getPerformanceColor(level: CategoryPerformance['level'], branchColor: string): string {
    switch (level) {
      case 'EXCELLENT': return '#228B22'; // Green
      case 'GOOD': return branchColor;
      case 'NEEDS_WORK': return '#FF8C00'; // Orange
      case 'CRITICAL': return '#DC143C'; // Red
      default: return '#BDB76B'; // Khaki
    }
  }

  // Generate military greeting based on branch and performance
  generateGreeting(branch: MilitaryBranch, readinessPercentage: number): string {
    const timeOfDay = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (timeOfDay >= 12 && timeOfDay < 17) timeGreeting = 'Good afternoon';
    if (timeOfDay >= 17 || timeOfDay < 6) timeGreeting = 'Good evening';

    const branchGreetings = {
      ARMY: {
        excellent: `${timeGreeting}, Soldier! Outstanding ASVAB readiness! HOOAH!`,
        good: `${timeGreeting}, Soldier! Solid progress on your ASVAB prep! HOOAH!`,
        fair: `${timeGreeting}, Soldier! Keep pushing, victory is within reach! HOOAH!`,
        poor: `Listen up, Soldier! Time to double down on that ASVAB training! HOOAH!`,
      },
      NAVY: {
        excellent: `${timeGreeting}, Sailor! Ship-shape ASVAB performance! HOOYAH!`,
        good: `${timeGreeting}, Sailor! Steady progress on your ASVAB journey! HOOYAH!`,
        fair: `${timeGreeting}, Sailor! Stay the course, smooth sailing ahead! HOOYAH!`,
        poor: `Attention, Sailor! All hands on deck for ASVAB training! HOOYAH!`,
      },
      AIR_FORCE: {
        excellent: `${timeGreeting}, Airman! Sky-high ASVAB readiness! HOORAH!`,
        good: `${timeGreeting}, Airman! Flying high on your ASVAB prep! HOORAH!`,
        fair: `${timeGreeting}, Airman! Clear skies ahead with more training! HOORAH!`,
        poor: `${timeGreeting}, Airman! Time to elevate that ASVAB game! HOORAH!`,
      },
      MARINES: {
        excellent: `${timeGreeting}, Marine! Semper Fi dedication to ASVAB excellence! OORAH!`,
        good: `${timeGreeting}, Marine! Motivated ASVAB progress! OORAH!`,
        fair: `${timeGreeting}, Marine! Adapt, improvise, overcome that ASVAB! OORAH!`,
        poor: `Listen up, Marine! ASVAB training is your mission priority! OORAH!`,
      },
      COAST_GUARD: {
        excellent: `${timeGreeting}, Coastie! Semper Paratus for ASVAB success! HOOYAH!`,
        good: `${timeGreeting}, Coastie! Ready and steady ASVAB progress! HOOYAH!`,
        fair: `${timeGreeting}, Coastie! Always ready to improve that score! HOOYAH!`,
        poor: `${timeGreeting}, Coastie! Time to rescue your ASVAB score! HOOYAH!`,
      },
      SPACE_FORCE: {
        excellent: `${timeGreeting}, Guardian! Semper Supra ASVAB excellence! HOORAH!`,
        good: `${timeGreeting}, Guardian! Stellar ASVAB preparation! HOORAH!`,
        fair: `${timeGreeting}, Guardian! Launch sequence for ASVAB improvement! HOORAH!`,
        poor: `${timeGreeting}, Guardian! Mission critical ASVAB training required! HOORAH!`,
      },
    };

    const greetingLevel = readinessPercentage >= 85 ? 'excellent' 
      : readinessPercentage >= 70 ? 'good'
      : readinessPercentage >= 50 ? 'fair' : 'poor';

    return branchGreetings[branch][greetingLevel];
  }

  // Generate daily orders (missions)
  generateDailyOrders(categoryPerformance: CategoryPerformance[], studyStreak: number): DailyOrder[] {
    const orders: DailyOrder[] = [];
    
    // Find weakest categories
    const weakCategories = categoryPerformance
      .filter(cat => cat.level === 'CRITICAL' || cat.level === 'NEEDS_WORK')
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);

    // Add category-specific orders
    weakCategories.forEach((category, index) => {
      orders.push({
        id: `category-${category.category}-${Date.now()}`,
        title: `TACTICAL DRILL: ${category.displayName}`,
        description: `Complete 10 ${category.displayName.toLowerCase()} questions to strengthen weak points. Current accuracy: ${category.accuracy}%`,
        priority: index === 0 ? 'HIGH' : 'MEDIUM',
        category: category.category,
        completed: false,
        points: 50,
      });
    });

    // Add streak maintenance order
    if (studyStreak > 0 && studyStreak < 7) {
      orders.push({
        id: `streak-${Date.now()}`,
        title: 'MAINTAIN BATTLE RHYTHM',
        description: `Keep your ${studyStreak}-day study streak alive! Complete any practice activity today.`,
        priority: 'MEDIUM',
        completed: false,
        points: 25,
      });
    }

    // Add daily practice order
    orders.push({
      id: `daily-practice-${Date.now()}`,
      title: 'DAILY READINESS DRILL',
      description: 'Complete a 5-question mixed practice session to maintain combat readiness.',
      priority: studyStreak === 0 ? 'HIGH' : 'LOW',
      completed: false,
      dueTime: '21:00',
      points: 30,
    });

    return orders.slice(0, 3); // Max 3 orders per day
  }

  // API methods
  async getDashboardData(): Promise<DashboardData> {
    const response = await apiClient.get('/dashboard');
    return response.data;
  }

  async updateStudyStreak(): Promise<StudyStreakData> {
    const response = await apiClient.post('/dashboard/study-streak');
    return response.data;
  }

  async completeDailyOrder(orderId: string): Promise<void> {
    await apiClient.post(`/dashboard/daily-orders/${orderId}/complete`);
  }

  async exportProgress(format: 'PDF' | 'CSV'): Promise<string> {
    const response = await apiClient.post('/dashboard/export', { format });
    return response.data.downloadUrl;
  }

  async getHistoricalData(days = 30): Promise<any> {
    const response = await apiClient.get(`/dashboard/history?days=${days}`);
    return response.data;
  }

  // Utility methods
  formatStudyTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  getRankFromScore(afqtScore: number): string {
    if (afqtScore >= 93) return 'Category I (93-99)';
    if (afqtScore >= 65) return 'Category II (65-92)';
    if (afqtScore >= 50) return 'Category IIIA (50-64)';
    if (afqtScore >= 31) return 'Category IIIB (31-49)';
    if (afqtScore >= 21) return 'Category IVA (21-30)';
    if (afqtScore >= 16) return 'Category IVB (16-20)';
    if (afqtScore >= 10) return 'Category IVC (10-15)';
    return 'Category V (0-9)';
  }

  getJobEligibility(afqtScore: number, branch: MilitaryBranch): string {
    const requirements = {
      ARMY: { min: 31, preferred: 50 },
      NAVY: { min: 35, preferred: 50 },
      AIR_FORCE: { min: 36, preferred: 65 },
      MARINES: { min: 32, preferred: 50 },
      COAST_GUARD: { min: 40, preferred: 65 },
      SPACE_FORCE: { min: 65, preferred: 75 },
    };

    const req = requirements[branch];
    
    if (afqtScore >= req.preferred) {
      return `Excellent! Qualifies for most ${branch} jobs including technical fields.`;
    } else if (afqtScore >= req.min) {
      return `Good! Meets minimum requirements for ${branch} with many job options available.`;
    } else {
      return `Below minimum. Need ${req.min - afqtScore} more points to qualify for ${branch}.`;
    }
  }
}

export const dashboardService = new DashboardService();