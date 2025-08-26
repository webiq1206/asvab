import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MilitaryBranch, SubscriptionTier, QuestionCategory, FitnessType } from '@prisma/client';

export interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    premium: number;
    byBranch: Record<MilitaryBranch, number>;
    newThisMonth: number;
    churnRate: number;
  };
  content: {
    totalQuestions: number;
    totalFlashcards: number;
    totalMilitaryJobs: number;
    contentByCategory: Record<QuestionCategory, number>;
  };
  engagement: {
    dailyActiveUsers: number;
    averageSessionTime: number;
    quizzesCompleted: number;
    studyGroupsActive: number;
    fitnessEntriesLogged: number;
  };
  revenue: {
    monthlyRevenue: number;
    totalRevenue: number;
    averageRevenuePerUser: number;
    subscriptionConversionRate: number;
  };
  system: {
    serverUptime: number;
    databaseConnections: number;
    errorRate: number;
    responseTime: number;
  };
}

export interface UserManagementData {
  users: Array<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    selectedBranch: MilitaryBranch;
    subscriptionTier: SubscriptionTier;
    trialEndsAt?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    isActive: boolean;
    totalQuizzes: number;
    averageScore: number;
    studyStreak: number;
  }>;
  total: number;
  hasMore: boolean;
}

export interface ContentStats {
  questions: {
    total: number;
    byCategory: Record<QuestionCategory, number>;
    byDifficulty: Record<string, number>;
    needsReview: number;
  };
  flashcards: {
    total: number;
    public: number;
    private: number;
    byCategory: Record<QuestionCategory, number>;
  };
  militaryJobs: {
    total: number;
    byBranch: Record<MilitaryBranch, number>;
    active: number;
  };
  studyGroups: {
    total: number;
    active: number;
    byBranch: Record<MilitaryBranch, number>;
    averageSize: number;
  };
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    queryTime: number;
    storage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  server: {
    uptime: number;
    cpu: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      errorsLast24h: number;
      averageResponseTime: number;
    };
  };
  services: {
    auth: boolean;
    subscriptions: boolean;
    notifications: boolean;
    fileStorage: boolean;
  };
}

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async validateAdminAccess(userId: string): Promise<boolean> {
    // In a real implementation, this would check admin roles
    // For now, we'll assume admin validation is handled by auth guards
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Simple admin check - in production this would be more sophisticated
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    return user?.email ? adminEmails.includes(user.email) : false;
  }

  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User metrics
    const [
      totalUsers,
      activeUsers,
      premiumUsers,
      newUsersThisMonth,
      usersByBranch,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: {
          isActive: true,
          lastLoginAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptionTier: SubscriptionTier.PREMIUM,
          isActive: true,
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: firstOfMonth },
          isActive: true,
        },
      }),
      this.getUsersByBranch(),
    ]);

    // Content metrics
    const [
      totalQuestions,
      totalFlashcards,
      totalMilitaryJobs,
      contentByCategory,
    ] = await Promise.all([
      this.prisma.question.count({ where: { isActive: true } }),
      this.prisma.flashcard.count({ where: { isActive: true } }),
      this.prisma.militaryJob.count({ where: { isActive: true } }),
      this.getContentByCategory(),
    ]);

    // Engagement metrics
    const [
      dailyActiveUsers,
      quizzesCompleted,
      studyGroupsActive,
      fitnessEntriesLogged,
    ] = await Promise.all([
      this.getDailyActiveUsers(),
      this.getQuizzesCompleted(),
      this.getActiveStudyGroups(),
      this.getFitnessEntriesCount(),
    ]);

    // Calculate churn rate (simplified)
    const churnRate = await this.calculateChurnRate();

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        premium: premiumUsers,
        byBranch: usersByBranch,
        newThisMonth: newUsersThisMonth,
        churnRate,
      },
      content: {
        totalQuestions,
        totalFlashcards,
        totalMilitaryJobs,
        contentByCategory,
      },
      engagement: {
        dailyActiveUsers,
        averageSessionTime: 0, // Would calculate from session logs
        quizzesCompleted,
        studyGroupsActive,
        fitnessEntriesLogged,
      },
      revenue: {
        monthlyRevenue: 0, // Would integrate with billing system
        totalRevenue: 0,
        averageRevenuePerUser: 0,
        subscriptionConversionRate: 0,
      },
      system: {
        serverUptime: process.uptime(),
        databaseConnections: 0, // Would get from DB monitoring
        errorRate: 0,
        responseTime: 0,
      },
    };
  }

  async getUserManagementData(
    limit = 50,
    offset = 0,
    search?: string,
    branch?: MilitaryBranch,
    subscriptionTier?: SubscriptionTier,
  ): Promise<UserManagementData> {
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (branch) where.selectedBranch = branch;
    if (subscriptionTier) where.subscriptionTier = subscriptionTier;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          selectedBranch: true,
          subscriptionTier: true,
          trialEndsAt: true,
          lastLoginAt: true,
          createdAt: true,
          isActive: true,
          profile: {
            select: {
              studyStreak: true,
            },
          },
          quizzes: {
            select: {
              score: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const usersWithStats = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      selectedBranch: user.selectedBranch,
      subscriptionTier: user.subscriptionTier,
      trialEndsAt: user.trialEndsAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      isActive: user.isActive,
      totalQuizzes: user.quizzes.length,
      averageScore: user.quizzes.length > 0
        ? user.quizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0) / user.quizzes.length
        : 0,
      studyStreak: user.profile?.studyStreak || 0,
    }));

    return {
      users: usersWithStats,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getContentStats(): Promise<ContentStats> {
    const [
      totalQuestions,
      questionsByCategory,
      questionsByDifficulty,
      totalFlashcards,
      publicFlashcards,
      flashcardsByCategory,
      totalMilitaryJobs,
      militaryJobsByBranch,
      activeMilitaryJobs,
      totalStudyGroups,
      activeStudyGroups,
      studyGroupsByBranch,
    ] = await Promise.all([
      this.prisma.question.count({ where: { isActive: true } }),
      this.getQuestionsByCategory(),
      this.getQuestionsByDifficulty(),
      this.prisma.flashcard.count({ where: { isActive: true } }),
      this.prisma.flashcard.count({ where: { isActive: true, isPublic: true } }),
      this.getFlashcardsByCategory(),
      this.prisma.militaryJob.count(),
      this.getMilitaryJobsByBranch(),
      this.prisma.militaryJob.count({ where: { isActive: true } }),
      this.prisma.studyGroup.count(),
      this.getActiveStudyGroups(),
      this.getStudyGroupsByBranch(),
    ]);

    const averageGroupSize = totalStudyGroups > 0
      ? await this.getAverageStudyGroupSize()
      : 0;

    return {
      questions: {
        total: totalQuestions,
        byCategory: questionsByCategory,
        byDifficulty: questionsByDifficulty,
        needsReview: 0, // Would track questions flagged for review
      },
      flashcards: {
        total: totalFlashcards,
        public: publicFlashcards,
        private: totalFlashcards - publicFlashcards,
        byCategory: flashcardsByCategory,
      },
      militaryJobs: {
        total: totalMilitaryJobs,
        byBranch: militaryJobsByBranch,
        active: activeMilitaryJobs,
      },
      studyGroups: {
        total: totalStudyGroups,
        active: activeStudyGroups,
        byBranch: studyGroupsByBranch,
        averageSize: averageGroupSize,
      },
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    // This would integrate with actual monitoring tools in production
    const now = Date.now();
    
    try {
      // Test database connectivity
      const startTime = Date.now();
      await this.prisma.user.count({ take: 1 });
      const queryTime = Date.now() - startTime;

      return {
        database: {
          status: queryTime < 100 ? 'healthy' : queryTime < 500 ? 'warning' : 'error',
          connections: 0, // Would get from DB pool
          queryTime,
          storage: {
            used: 0,
            total: 0,
            percentage: 0,
          },
        },
        server: {
          uptime: process.uptime(),
          cpu: 0, // Would get from system monitoring
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
          },
          requests: {
            total: 0,
            errorsLast24h: 0,
            averageResponseTime: 0,
          },
        },
        services: {
          auth: true, // Would ping auth service
          subscriptions: true, // Would ping billing service
          notifications: true, // Would ping notification service
          fileStorage: true, // Would ping file storage
        },
      };
    } catch (error) {
      return {
        database: {
          status: 'error',
          connections: 0,
          queryTime: 0,
          storage: { used: 0, total: 0, percentage: 0 },
        },
        server: {
          uptime: process.uptime(),
          cpu: 0,
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            percentage: 100,
          },
          requests: { total: 0, errorsLast24h: 1, averageResponseTime: 0 },
        },
        services: {
          auth: false,
          subscriptions: false,
          notifications: false,
          fileStorage: false,
        },
      };
    }
  }

  // Helper methods
  private async getUsersByBranch(): Promise<Record<MilitaryBranch, number>> {
    const results = await this.prisma.user.groupBy({
      by: ['selectedBranch'],
      where: { isActive: true },
      _count: true,
    });

    const byBranch = {} as Record<MilitaryBranch, number>;
    Object.values(MilitaryBranch).forEach(branch => {
      byBranch[branch] = 0;
    });

    results.forEach(result => {
      byBranch[result.selectedBranch] = result._count;
    });

    return byBranch;
  }

  private async getContentByCategory(): Promise<Record<QuestionCategory, number>> {
    const results = await this.prisma.question.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true,
    });

    const byCategory = {} as Record<QuestionCategory, number>;
    Object.values(QuestionCategory).forEach(category => {
      byCategory[category] = 0;
    });

    results.forEach(result => {
      byCategory[result.category] = result._count;
    });

    return byCategory;
  }

  private async getDailyActiveUsers(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.prisma.user.count({
      where: {
        lastLoginAt: { gte: yesterday },
        isActive: true,
      },
    });
  }

  private async getQuizzesCompleted(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.quiz.count({
      where: {
        completedAt: {
          not: null,
          gte: thirtyDaysAgo,
        },
      },
    });
  }

  private async getActiveStudyGroups(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.studyGroup.count({
      where: {
        updatedAt: { gte: thirtyDaysAgo },
      },
    });
  }

  private async getFitnessEntriesCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.fitnessEntry.count({
      where: {
        recordedAt: { gte: thirtyDaysAgo },
      },
    });
  }

  private async calculateChurnRate(): Promise<number> {
    // Simplified churn calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalUsersThirtyDaysAgo = await this.prisma.user.count({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        isActive: true,
      },
    });

    const usersStillActive = await this.prisma.user.count({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        lastLoginAt: { gte: thirtyDaysAgo },
        isActive: true,
      },
    });

    return totalUsersThirtyDaysAgo > 0
      ? ((totalUsersThirtyDaysAgo - usersStillActive) / totalUsersThirtyDaysAgo) * 100
      : 0;
  }

  private async getQuestionsByCategory(): Promise<Record<QuestionCategory, number>> {
    return this.getContentByCategory();
  }

  private async getQuestionsByDifficulty(): Promise<Record<string, number>> {
    const results = await this.prisma.question.groupBy({
      by: ['difficulty'],
      where: { isActive: true },
      _count: true,
    });

    const byDifficulty: Record<string, number> = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    };

    results.forEach(result => {
      byDifficulty[result.difficulty] = result._count;
    });

    return byDifficulty;
  }

  private async getFlashcardsByCategory(): Promise<Record<QuestionCategory, number>> {
    const results = await this.prisma.flashcard.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true,
    });

    const byCategory = {} as Record<QuestionCategory, number>;
    Object.values(QuestionCategory).forEach(category => {
      byCategory[category] = 0;
    });

    results.forEach(result => {
      byCategory[result.category] = result._count;
    });

    return byCategory;
  }

  private async getMilitaryJobsByBranch(): Promise<Record<MilitaryBranch, number>> {
    const results = await this.prisma.militaryJob.groupBy({
      by: ['branch'],
      _count: true,
    });

    const byBranch = {} as Record<MilitaryBranch, number>;
    Object.values(MilitaryBranch).forEach(branch => {
      byBranch[branch] = 0;
    });

    results.forEach(result => {
      byBranch[result.branch] = result._count;
    });

    return byBranch;
  }

  private async getStudyGroupsByBranch(): Promise<Record<MilitaryBranch, number>> {
    const results = await this.prisma.studyGroup.groupBy({
      by: ['branch'],
      _count: true,
    });

    const byBranch = {} as Record<MilitaryBranch, number>;
    Object.values(MilitaryBranch).forEach(branch => {
      byBranch[branch] = 0;
    });

    results.forEach(result => {
      byBranch[result.branch] = result._count;
    });

    return byBranch;
  }

  private async getAverageStudyGroupSize(): Promise<number> {
    const result = await this.prisma.studyGroupMember.aggregate({
      _avg: {
        userId: true, // This is a simplified calculation
      },
    });

    // Would do a proper calculation in production
    return 5; // Placeholder average
  }

  // User management operations
  async suspendUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      
      // Log admin action
      await this.logAdminAction('SUSPEND_USER', userId);
      
      return { success: true, message: 'User suspended successfully' };
    } catch (error) {
      throw new Error('Failed to suspend user');
    }
  }

  async activateUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });
      
      // Log admin action
      await this.logAdminAction('ACTIVATE_USER', userId);
      
      return { success: true, message: 'User activated successfully' };
    } catch (error) {
      throw new Error('Failed to activate user');
    }
  }

  async updateUserSubscription(
    userId: string,
    updateData: {
      subscriptionTier: SubscriptionTier;
      trialEndsAt?: Date;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: updateData.subscriptionTier,
          trialEndsAt: updateData.trialEndsAt,
        },
      });
      
      // Log admin action
      await this.logAdminAction('UPDATE_SUBSCRIPTION', userId, updateData);
      
      return { success: true, message: 'Subscription updated successfully' };
    } catch (error) {
      throw new Error('Failed to update subscription');
    }
  }

  async getUserDetails(userId: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          quizzes: {
            orderBy: { completedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              category: true,
              score: true,
              completedAt: true,
              timeSpent: true,
            },
          },
          flashcards: {
            where: { isActive: true },
            take: 5,
          },
          studyGroupMemberships: {
            include: {
              studyGroup: {
                select: {
                  id: true,
                  name: true,
                  branch: true,
                },
              },
            },
          },
          fitnessEntries: {
            orderBy: { recordedAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate performance metrics
      const averageScore = user.quizzes.length > 0
        ? user.quizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0) / user.quizzes.length
        : 0;

      const totalStudyTime = user.quizzes.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);

      return {
        id: user.id,
        profile: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          selectedBranch: user.selectedBranch,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isActive: user.isActive,
          studyStreak: user.profile?.studyStreak || 0,
        },
        subscription: {
          tier: user.subscriptionTier,
          trialEndsAt: user.trialEndsAt,
          isTrialActive: user.trialEndsAt ? new Date() < user.trialEndsAt : false,
        },
        activity: {
          totalQuizzes: user.quizzes.length,
          averageScore: Math.round(averageScore * 100) / 100,
          totalStudyTime,
          recentQuizzes: user.quizzes,
        },
        progress: {
          flashcardsCreated: user.flashcards.length,
          studyGroups: user.studyGroupMemberships.length,
          fitnessEntries: user.fitnessEntries.length,
        },
        support: {
          // Would include support tickets in production
          tickets: [],
          totalTickets: 0,
        },
      };
    } catch (error) {
      throw new Error('Failed to get user details');
    }
  }

  private async logAdminAction(action: string, targetId: string, metadata?: any): Promise<void> {
    // In production, this would log to an audit table
    console.log(`Admin action: ${action} on ${targetId}`, metadata);
  }
}