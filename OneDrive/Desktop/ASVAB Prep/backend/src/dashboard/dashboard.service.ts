import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch, QuestionCategory } from '@prisma/client';
import { ALL_ASVAB_CATEGORIES, AFQT_CATEGORIES } from '@asvab-prep/shared';

interface DashboardData {
  greeting: string;
  afqtScore: number;
  readinessPercentage: number;
  categoryPerformance: CategoryPerformance[];
  dailyOrders: DailyOrder[];
  studyStreak: StudyStreakData;
  quickStats: QuickStats;
  recentActivity: ActivityItem[];
}

interface CategoryPerformance {
  category: QuestionCategory;
  displayName: string;
  score: number;
  questionsAnswered: number;
  accuracy: number;
  level: 'EXCELLENT' | 'GOOD' | 'NEEDS_WORK' | 'CRITICAL';
  color: string;
  isAFQT: boolean;
}

interface DailyOrder {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category?: QuestionCategory;
  completed: boolean;
  dueTime?: string;
  points: number;
}

interface StudyStreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  streakActive: boolean;
  nextMilestone: number;
}

interface QuickStats {
  totalQuestions: number;
  correctAnswers: number;
  avgScore: number;
  hoursStudied: number;
  quizzesCompleted: number;
  rank: string;
}

interface ActivityItem {
  id: string;
  type: 'QUESTION' | 'QUIZ' | 'ACHIEVEMENT' | 'STREAK';
  title: string;
  description: string;
  timestamp: string;
  category?: QuestionCategory;
  score?: number;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(userId: string, userBranch: MilitaryBranch): Promise<DashboardData> {
    // Get user progress data
    const userProgress = await this.prisma.userProgress.findMany({
      where: { userId },
      orderBy: { category: 'asc' },
    });

    // Get recent activity
    const [recentQuizzes, recentAttempts] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          score: true,
          completedAt: true,
          category: true,
        },
      }),
      this.prisma.questionAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          question: {
            select: { category: true },
          },
        },
      }),
    ]);

    // Calculate category performance
    const categoryPerformance = this.calculateCategoryPerformance(userProgress, userBranch);
    
    // Calculate AFQT score
    const afqtScore = this.calculateAFQT(categoryPerformance);
    
    // Calculate readiness percentage
    const readinessPercentage = this.calculateReadiness(categoryPerformance, afqtScore);
    
    // Get study streak
    const studyStreak = await this.calculateStudyStreak(userId);
    
    // Generate daily orders
    const dailyOrders = this.generateDailyOrders(categoryPerformance, studyStreak.currentStreak);
    
    // Calculate quick stats
    const quickStats = await this.calculateQuickStats(userId, afqtScore, recentQuizzes, recentAttempts);
    
    // Generate greeting
    const greeting = this.generateGreeting(userBranch, readinessPercentage);
    
    // Format recent activity
    const recentActivity = this.formatRecentActivity(recentQuizzes, recentAttempts);

    return {
      greeting,
      afqtScore,
      readinessPercentage,
      categoryPerformance,
      dailyOrders,
      studyStreak,
      quickStats,
      recentActivity,
    };
  }

  private calculateCategoryPerformance(userProgress: any[], userBranch: MilitaryBranch): CategoryPerformance[] {
    const categoryDisplayNames = {
      [QuestionCategory.GENERAL_SCIENCE]: 'General Science',
      [QuestionCategory.ARITHMETIC_REASONING]: 'Arithmetic Reasoning',
      [QuestionCategory.WORD_KNOWLEDGE]: 'Word Knowledge',
      [QuestionCategory.PARAGRAPH_COMPREHENSION]: 'Paragraph Comprehension',
      [QuestionCategory.MATHEMATICS_KNOWLEDGE]: 'Mathematics Knowledge',
      [QuestionCategory.ELECTRONICS_INFORMATION]: 'Electronics Information',
      [QuestionCategory.AUTO_SHOP]: 'Auto & Shop Information',
      [QuestionCategory.MECHANICAL_COMPREHENSION]: 'Mechanical Comprehension',
      [QuestionCategory.ASSEMBLING_OBJECTS]: 'Assembling Objects',
    };

    // All ASVAB categories are now available to all branches
    return ALL_ASVAB_CATEGORIES.map(category => {
      const progress = userProgress.find(p => p.category === category);
      const score = progress?.averageScore || 0;
      const questionsAnswered = progress?.totalQuestions || 0;
      const accuracy = progress?.correctAnswers && progress?.totalQuestions 
        ? Math.round((progress.correctAnswers / progress.totalQuestions) * 100)
        : 0;

      return {
        category,
        displayName: categoryDisplayNames[category],
        score,
        questionsAnswered,
        accuracy,
        level: this.getPerformanceLevel(score),
        color: this.getPerformanceColor(this.getPerformanceLevel(score), userBranch),
        isAFQT: AFQT_CATEGORIES.includes(category),
      };
    });
  }

  private calculateAFQT(categoryPerformance: CategoryPerformance[]): number {
    // Get scores for AFQT categories
    const wordKnowledge = categoryPerformance.find(c => c.category === QuestionCategory.WORD_KNOWLEDGE)?.score || 0;
    const paragraphComp = categoryPerformance.find(c => c.category === QuestionCategory.PARAGRAPH_COMPREHENSION)?.score || 0;
    const arithmeticReasoning = categoryPerformance.find(c => c.category === QuestionCategory.ARITHMETIC_REASONING)?.score || 0;
    const mathKnowledge = categoryPerformance.find(c => c.category === QuestionCategory.MATHEMATICS_KNOWLEDGE)?.score || 0;

    // AFQT formula: 2 × VE + AR + MK (where VE = (WK + PC) / 2)
    const verbalExpression = (wordKnowledge + paragraphComp) / 2;
    const afqtRaw = (2 * verbalExpression) + arithmeticReasoning + mathKnowledge;
    
    // Convert to percentile (simplified approximation)
    return Math.min(99, Math.max(1, Math.round(afqtRaw / 4)));
  }

  private calculateReadiness(categoryPerformance: CategoryPerformance[], afqtScore: number): number {
    const afqtWeight = 0.6; // AFQT accounts for 60% of readiness
    const categoryWeight = 0.4; // Other categories account for 40%

    const afqtReadiness = Math.min(100, afqtScore * 1.2); // Scale AFQT to 0-100
    
    const avgCategoryScore = categoryPerformance.length > 0
      ? categoryPerformance.reduce((sum, cat) => sum + cat.score, 0) / categoryPerformance.length
      : 0;

    return Math.round((afqtReadiness * afqtWeight) + (avgCategoryScore * categoryWeight));
  }

  private getPerformanceLevel(score: number): CategoryPerformance['level'] {
    if (score >= 85) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'NEEDS_WORK';
    return 'CRITICAL';
  }

  private getPerformanceColor(level: CategoryPerformance['level'], branch: MilitaryBranch): string {
    const branchColors = {
      ARMY: '#FFD700',
      NAVY: '#000080',
      AIR_FORCE: '#00308F',
      MARINES: '#DC143C',
      COAST_GUARD: '#003366',
      SPACE_FORCE: '#C0C0C0',
    };

    switch (level) {
      case 'EXCELLENT': return '#228B22';
      case 'GOOD': return branchColors[branch];
      case 'NEEDS_WORK': return '#FF8C00';
      case 'CRITICAL': return '#DC143C';
      default: return '#BDB76B';
    }
  }

  private generateGreeting(branch: MilitaryBranch, readinessPercentage: number): string {
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

  private generateDailyOrders(categoryPerformance: CategoryPerformance[], studyStreak: number): DailyOrder[] {
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

  private async calculateStudyStreak(userId: string): Promise<StudyStreakData> {
    // Get user's last 30 days of activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await this.prisma.questionAttempt.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (activities.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: '',
        streakActive: false,
        nextMilestone: 3,
      };
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if user studied today or yesterday
    const lastActivity = activities[0];
    const lastStudyDate = new Date(lastActivity.createdAt);
    const daysSinceLastStudy = Math.floor((today.getTime() - lastStudyDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const streakActive = daysSinceLastStudy <= 1;

    if (streakActive) {
      // Calculate current streak
      const activityDates = new Set(
        activities.map(a => new Date(a.createdAt).toDateString())
      );

      let checkDate = new Date(today);
      if (daysSinceLastStudy === 1) {
        checkDate = new Date(yesterday);
      }

      while (activityDates.has(checkDate.toDateString())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate longest streak (simplified)
    longestStreak = Math.max(currentStreak, Math.floor(activities.length / 7));

    const nextMilestone = currentStreak < 3 ? 3 
      : currentStreak < 7 ? 7 
      : currentStreak < 14 ? 14 
      : currentStreak < 30 ? 30 
      : currentStreak + 10;

    return {
      currentStreak,
      longestStreak,
      lastStudyDate: lastActivity.createdAt.toISOString(),
      streakActive,
      nextMilestone,
    };
  }

  private async calculateQuickStats(userId: string, afqtScore: number, recentQuizzes: any[], recentAttempts: any[]): Promise<QuickStats> {
    // Get totals
    const [totalAttempts, totalQuizzes] = await Promise.all([
      this.prisma.questionAttempt.count({ where: { userId } }),
      this.prisma.quiz.count({ where: { userId, completedAt: { not: null } } }),
    ]);

    const correctAttempts = await this.prisma.questionAttempt.count({
      where: { userId, isCorrect: true },
    });

    const avgScore = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    // Calculate study time (simplified - based on quiz time)
    const totalQuizTime = recentQuizzes.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);
    const hoursStudied = Math.round(totalQuizTime / 3600 * 10) / 10; // Convert seconds to hours

    const rank = this.getRankFromScore(afqtScore);

    return {
      totalQuestions: totalAttempts,
      correctAnswers: correctAttempts,
      avgScore,
      hoursStudied,
      quizzesCompleted: totalQuizzes,
      rank,
    };
  }

  private getRankFromScore(afqtScore: number): string {
    if (afqtScore >= 93) return 'Category I (93-99)';
    if (afqtScore >= 65) return 'Category II (65-92)';
    if (afqtScore >= 50) return 'Category IIIA (50-64)';
    if (afqtScore >= 31) return 'Category IIIB (31-49)';
    if (afqtScore >= 21) return 'Category IVA (21-30)';
    if (afqtScore >= 16) return 'Category IVB (16-20)';
    if (afqtScore >= 10) return 'Category IVC (10-15)';
    return 'Category V (0-9)';
  }

  private formatRecentActivity(recentQuizzes: any[], recentAttempts: any[]): ActivityItem[] {
    const activities: ActivityItem[] = [];

    // Add quiz activities
    recentQuizzes.forEach(quiz => {
      activities.push({
        id: `quiz-${quiz.id}`,
        type: 'QUIZ',
        title: `Completed Quiz: ${quiz.title}`,
        description: `Score: ${quiz.score}%`,
        timestamp: quiz.completedAt,
        category: quiz.category,
        score: quiz.score,
      });
    });

    // Add recent question attempts (sample)
    const recentCorrect = recentAttempts.filter(a => a.isCorrect).slice(0, 3);
    recentCorrect.forEach(attempt => {
      activities.push({
        id: `attempt-${attempt.id}`,
        type: 'QUESTION',
        title: 'Correct Answer',
        description: `${attempt.question.category.replace('_', ' ')} question answered correctly`,
        timestamp: attempt.createdAt,
        category: attempt.question.category,
      });
    });

    // Sort by timestamp and return top 8
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }

  async updateStudyStreak(userId: string): Promise<StudyStreakData> {
    // This would be called when user completes any study activity
    // For now, return recalculated streak
    return this.calculateStudyStreak(userId);
  }

  async exportProgress(userId: string, userBranch: MilitaryBranch, format: 'PDF' | 'CSV'): Promise<string> {
    // This would generate and return a download URL for the progress report
    // For now, return a placeholder URL
    return `https://api.example.com/exports/${userId}-progress.${format.toLowerCase()}`;
  }
}