import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MilitaryBranch, QuestionCategory, SubscriptionTier } from '@prisma/client';

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

@Injectable()
export class AICoachingService {
  private readonly logger = new Logger(AICoachingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generatePersonalizedCoaching(userId: string): Promise<PersonalizedCoaching> {
    try {
      // Get user profile and performance data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          quizzes: {
            orderBy: { completedAt: 'desc' },
            take: 20,
            include: {
              questions: {
                select: {
                  category: true,
                  difficulty: true,
                  isCorrect: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Analyze performance patterns
      const performanceAnalysis = await this.analyzePerformance(user);
      
      // Generate military branch-specific greeting
      const greetingMessage = this.generateMilitaryGreeting(user.selectedBranch, user.firstName);
      
      // Calculate daily goals based on subscription tier and performance
      const dailyGoal = this.calculateDailyGoals(user, performanceAnalysis);
      
      // Generate motivational message
      const motivationalMessage = this.generateMotivationalMessage(
        user.selectedBranch,
        performanceAnalysis,
        user.profile?.studyStreak || 0
      );

      // Create study recommendations
      const recommendations = await this.generateStudyRecommendations(user, performanceAnalysis);

      // Calculate next milestone
      const nextMilestone = this.calculateNextMilestone(user, performanceAnalysis);

      return {
        greetingMessage,
        dailyGoal,
        motivationalMessage,
        studyStreak: {
          current: user.profile?.studyStreak || 0,
          target: this.calculateStreakTarget(user.profile?.studyStreak || 0),
          encouragement: this.generateStreakEncouragement(user.selectedBranch, user.profile?.studyStreak || 0),
        },
        recommendations,
        nextMilestone,
      };
    } catch (error) {
      this.logger.error(`Failed to generate personalized coaching for user ${userId}:`, error);
      throw new Error('Failed to generate personalized coaching');
    }
  }

  async getAdaptiveDifficultyAdjustment(userId: string, category: QuestionCategory): Promise<AdaptiveDifficultyAdjustment> {
    try {
      // Get recent performance in the category
      const recentQuizzes = await this.prisma.quiz.findMany({
        where: {
          userId,
          category,
          completedAt: { not: null },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
        include: {
          questions: {
            select: {
              difficulty: true,
              isCorrect: true,
            },
          },
        },
      });

      if (recentQuizzes.length === 0) {
        return {
          currentLevel: 5, // Default middle level
          suggestedAdjustment: 'MAINTAIN',
          reasoning: 'Insufficient data for adjustment. Continue with current difficulty.',
          confidenceScore: 0.1,
        };
      }

      // Calculate performance metrics
      const totalQuestions = recentQuizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
      const correctAnswers = recentQuizzes.reduce(
        (sum, quiz) => sum + quiz.questions.filter(q => q.isCorrect).length,
        0
      );
      const accuracyRate = correctAnswers / totalQuestions;

      // Analyze difficulty distribution
      const difficultyDistribution = this.analyzeDifficultyDistribution(recentQuizzes);
      const averageDifficulty = difficultyDistribution.average;

      // Determine adjustment
      let suggestedAdjustment: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
      let reasoning: string;
      let confidenceScore: number;

      if (accuracyRate >= 0.85 && averageDifficulty < 8) {
        suggestedAdjustment = 'INCREASE';
        reasoning = `High accuracy rate (${Math.round(accuracyRate * 100)}%). Ready for more challenging questions.`;
        confidenceScore = Math.min(0.9, (accuracyRate - 0.8) * 2);
      } else if (accuracyRate <= 0.6 && averageDifficulty > 3) {
        suggestedAdjustment = 'DECREASE';
        reasoning = `Low accuracy rate (${Math.round(accuracyRate * 100)}%). Need foundational reinforcement.`;
        confidenceScore = Math.min(0.9, (0.7 - accuracyRate) * 2);
      } else {
        suggestedAdjustment = 'MAINTAIN';
        reasoning = `Performance is balanced (${Math.round(accuracyRate * 100)}% accuracy). Continue current difficulty.`;
        confidenceScore = 0.7;
      }

      return {
        currentLevel: Math.round(averageDifficulty),
        suggestedAdjustment,
        reasoning,
        confidenceScore,
      };
    } catch (error) {
      this.logger.error(`Failed to get adaptive difficulty adjustment:`, error);
      throw new Error('Failed to calculate difficulty adjustment');
    }
  }

  private async analyzePerformance(user: any) {
    const quizzes = user.quizzes;
    
    if (quizzes.length === 0) {
      return {
        overallAccuracy: 0,
        categoryPerformance: {},
        improvementTrend: 'STABLE',
        weakAreas: [],
        strongAreas: [],
      };
    }

    // Calculate overall accuracy
    const totalQuestions = quizzes.reduce((sum: number, quiz: any) => sum + quiz.questions.length, 0);
    const correctAnswers = quizzes.reduce(
      (sum: number, quiz: any) => sum + quiz.questions.filter((q: any) => q.isCorrect).length,
      0
    );
    const overallAccuracy = correctAnswers / totalQuestions;

    // Analyze by category
    const categoryPerformance: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    quizzes.forEach((quiz: any) => {
      quiz.questions.forEach((question: any) => {
        const category = question.category;
        if (!categoryPerformance[category]) {
          categoryPerformance[category] = 0;
          categoryCounts[category] = 0;
        }
        if (question.isCorrect) {
          categoryPerformance[category]++;
        }
        categoryCounts[category]++;
      });
    });

    // Calculate category accuracy rates
    Object.keys(categoryPerformance).forEach(category => {
      categoryPerformance[category] = categoryPerformance[category] / categoryCounts[category];
    });

    // Determine improvement trend
    const recentQuizzes = quizzes.slice(0, 5);
    const olderQuizzes = quizzes.slice(5, 10);
    
    let improvementTrend = 'STABLE';
    if (recentQuizzes.length > 0 && olderQuizzes.length > 0) {
      const recentAccuracy = this.calculateQuizAccuracy(recentQuizzes);
      const olderAccuracy = this.calculateQuizAccuracy(olderQuizzes);
      
      if (recentAccuracy > olderAccuracy + 0.1) {
        improvementTrend = 'IMPROVING';
      } else if (recentAccuracy < olderAccuracy - 0.1) {
        improvementTrend = 'DECLINING';
      }
    }

    // Identify weak and strong areas
    const sortedCategories = Object.entries(categoryPerformance).sort(([,a], [,b]) => b - a);
    const strongAreas = sortedCategories.slice(0, 3).map(([category]) => category);
    const weakAreas = sortedCategories.slice(-3).map(([category]) => category);

    return {
      overallAccuracy,
      categoryPerformance,
      improvementTrend,
      weakAreas,
      strongAreas,
    };
  }

  private calculateQuizAccuracy(quizzes: any[]): number {
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    const correctAnswers = quizzes.reduce(
      (sum, quiz) => sum + quiz.questions.filter((q: any) => q.isCorrect).length,
      0
    );
    return totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  }

  private generateMilitaryGreeting(branch: MilitaryBranch, firstName?: string): string {
    const name = firstName ? `, ${firstName}` : '';
    
    const greetings = {
      [MilitaryBranch.ARMY]: `Hooah, Soldier${name}! Ready to dominate today's mission?`,
      [MilitaryBranch.NAVY]: `Good morning, Sailor${name}! Anchors aweigh to ASVAB success!`,
      [MilitaryBranch.AIR_FORCE]: `Aim high, Airman${name}! Time to soar through today's challenges!`,
      [MilitaryBranch.MARINES]: `Oorah, Marine${name}! Semper Fi dedication starts now!`,
      [MilitaryBranch.COAST_GUARD]: `Semper Paratus, Coastie${name}! Always ready to excel!`,
      [MilitaryBranch.SPACE_FORCE]: `Semper Supra, Guardian${name}! Reach for the stars today!`,
    };

    return greetings[branch] || `Ready for today's training${name}!`;
  }

  private calculateDailyGoals(user: any, performanceAnalysis: any) {
    const baseQuestions = user.subscriptionTier === SubscriptionTier.PREMIUM ? 25 : 10;
    const baseTime = user.subscriptionTier === SubscriptionTier.PREMIUM ? 30 : 15;

    // Adjust based on performance
    let questionMultiplier = 1;
    if (performanceAnalysis.improvementTrend === 'IMPROVING') {
      questionMultiplier = 1.2;
    } else if (performanceAnalysis.improvementTrend === 'DECLINING') {
      questionMultiplier = 0.8;
    }

    return {
      questionsToComplete: Math.round(baseQuestions * questionMultiplier),
      timeToSpend: Math.round(baseTime * questionMultiplier),
      focusAreas: performanceAnalysis.weakAreas.slice(0, 2),
    };
  }

  private generateMotivationalMessage(branch: MilitaryBranch, performanceAnalysis: any, studyStreak: number): string {
    const branchMotivation = {
      [MilitaryBranch.ARMY]: 'Army Strong means never giving up!',
      [MilitaryBranch.NAVY]: 'Navigate through challenges like a true Sailor!',
      [MilitaryBranch.AIR_FORCE]: 'Fly high and push your limits!',
      [MilitaryBranch.MARINES]: 'Marines never quit - Semper Fi!',
      [MilitaryBranch.COAST_GUARD]: 'Stay ready, stay sharp, Coastie!',
      [MilitaryBranch.SPACE_FORCE]: 'Guardian, the sky is not the limit!',
    };

    if (performanceAnalysis.improvementTrend === 'IMPROVING') {
      return `Outstanding progress! ${branchMotivation[branch]} Keep up this momentum!`;
    } else if (studyStreak >= 7) {
      return `${studyStreak}-day streak! ${branchMotivation[branch]} You're building unstoppable habits!`;
    } else {
      return `Every great soldier starts with discipline. ${branchMotivation[branch]}`;
    }
  }

  private async generateStudyRecommendations(user: any, performanceAnalysis: any): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    // Focus on weak areas first
    for (const category of performanceAnalysis.weakAreas.slice(0, 2)) {
      recommendations.push({
        category: category as QuestionCategory,
        priority: 'HIGH',
        reason: `Low performance area (${Math.round(performanceAnalysis.categoryPerformance[category] * 100)}% accuracy)`,
        estimatedStudyTime: 20,
        difficulty: 'EASY',
        militaryContext: this.getMilitaryContext(user.selectedBranch, category),
      });
    }

    // Add medium priority recommendations
    const allCategories = Object.values(QuestionCategory);
    const mediumPriorityCategories = allCategories.filter(
      cat => !performanceAnalysis.weakAreas.includes(cat) && !performanceAnalysis.strongAreas.includes(cat)
    );

    if (mediumPriorityCategories.length > 0) {
      recommendations.push({
        category: mediumPriorityCategories[0],
        priority: 'MEDIUM',
        reason: 'Balanced performance - good for skill reinforcement',
        estimatedStudyTime: 15,
        difficulty: 'MEDIUM',
        militaryContext: this.getMilitaryContext(user.selectedBranch, mediumPriorityCategories[0]),
      });
    }

    return recommendations;
  }

  private getMilitaryContext(branch: MilitaryBranch, category: QuestionCategory): string {
    const contexts = {
      [QuestionCategory.ARITHMETIC_REASONING]: {
        [MilitaryBranch.ARMY]: 'Critical for supply calculations and mission planning',
        [MilitaryBranch.NAVY]: 'Essential for navigation and logistics operations',
        [MilitaryBranch.AIR_FORCE]: 'Vital for flight calculations and mission parameters',
        [MilitaryBranch.MARINES]: 'Key for tactical planning and resource allocation',
        [MilitaryBranch.COAST_GUARD]: 'Important for search and rescue calculations',
        [MilitaryBranch.SPACE_FORCE]: 'Critical for orbital mechanics and mission planning',
      },
      [QuestionCategory.MATHEMATICS_KNOWLEDGE]: {
        [MilitaryBranch.ARMY]: 'Foundation for engineering and technical roles',
        [MilitaryBranch.NAVY]: 'Required for nuclear and technical ratings',
        [MilitaryBranch.AIR_FORCE]: 'Essential for aerospace and technical careers',
        [MilitaryBranch.MARINES]: 'Important for technical military occupational specialties',
        [MilitaryBranch.COAST_GUARD]: 'Needed for technical and engineering positions',
        [MilitaryBranch.SPACE_FORCE]: 'Fundamental for all space operations roles',
      },
    };

    return contexts[category]?.[branch] || 'Important for military technical roles';
  }

  private calculateNextMilestone(user: any, performanceAnalysis: any) {
    const totalQuizzes = user.quizzes.length;
    const accuracy = performanceAnalysis.overallAccuracy;

    if (totalQuizzes < 10) {
      return {
        description: 'Complete 10 practice quizzes',
        progress: (totalQuizzes / 10) * 100,
        reward: 'Unlock advanced study features',
      };
    } else if (accuracy < 0.8) {
      return {
        description: 'Achieve 80% overall accuracy',
        progress: (accuracy / 0.8) * 100,
        reward: 'Earn Sharpshooter badge',
      };
    } else {
      return {
        description: 'Maintain excellence streak',
        progress: Math.min(100, (user.profile?.studyStreak || 0) * 10),
        reward: 'Elite Soldier recognition',
      };
    }
  }

  private calculateStreakTarget(currentStreak: number): number {
    if (currentStreak < 7) return 7;
    if (currentStreak < 30) return 30;
    return Math.ceil(currentStreak / 10) * 10;
  }

  private generateStreakEncouragement(branch: MilitaryBranch, streak: number): string {
    if (streak === 0) {
      return 'Start your first day of consistent training!';
    } else if (streak < 7) {
      return `${streak} days strong! Build that military discipline!`;
    } else if (streak < 30) {
      return `${streak}-day streak! You're developing elite habits!`;
    } else {
      return `${streak} days of dedication! You're a true military professional!`;
    }
  }

  private analyzeDifficultyDistribution(quizzes: any[]) {
    const difficulties = quizzes.flatMap(quiz => 
      quiz.questions.map((q: any) => {
        switch (q.difficulty) {
          case 'EASY': return 3;
          case 'MEDIUM': return 6;
          case 'HARD': return 9;
          default: return 5;
        }
      })
    );

    const average = difficulties.reduce((sum, diff) => sum + diff, 0) / difficulties.length;
    
    return {
      average: average || 5,
      distribution: difficulties,
    };
  }
}