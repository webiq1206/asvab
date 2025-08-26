import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FitnessType, MilitaryBranch, Gender } from '@prisma/client';
import { FitnessStandardsService } from './fitness-standards.service';

export interface FitnessEntry {
  id: string;
  userId: string;
  type: FitnessType;
  value: number;
  recordedAt: Date;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  name: string;
  date: Date;
  duration: number; // minutes
  exercises: FitnessEntry[];
  notes?: string;
  caloriesEstimate?: number;
}

export interface FitnessGoal {
  id: string;
  userId: string;
  type: FitnessType;
  targetValue: number;
  currentValue: number;
  targetDate: Date;
  isCompleted: boolean;
  createdAt: Date;
}

export interface FitnessProgress {
  type: FitnessType;
  current: number;
  best: number;
  average: number;
  improvement: number; // percentage
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  lastRecorded: Date;
  totalEntries: number;
}

export interface FitnessAnalytics {
  userId: string;
  overallProgress: FitnessProgress[];
  weeklyStats: {
    week: string;
    workouts: number;
    totalTime: number;
    averageIntensity: number;
  }[];
  monthlyTrends: {
    month: string;
    [key in FitnessType]: number;
  }[];
  achievements: {
    personalRecords: number;
    consistencyStreak: number;
    goalsCompleted: number;
  };
  nextPTTest?: {
    daysRemaining: number;
    readinessScore: number;
    recommendedTraining: string[];
  };
}

export interface CreateFitnessEntryDto {
  type: FitnessType;
  value: number;
  recordedAt?: Date;
  notes?: string;
}

export interface CreateWorkoutSessionDto {
  name: string;
  date: Date;
  duration: number;
  exercises: CreateFitnessEntryDto[];
  notes?: string;
}

export interface CreateFitnessGoalDto {
  type: FitnessType;
  targetValue: number;
  targetDate: Date;
}

@Injectable()
export class FitnessTrackingService {
  constructor(
    private prisma: PrismaService,
    private fitnessStandardsService: FitnessStandardsService,
  ) {}

  async createFitnessEntry(
    userId: string,
    createDto: CreateFitnessEntryDto,
  ): Promise<FitnessEntry> {
    // Validate the fitness entry
    this.validateFitnessEntry(createDto);

    const entry = await this.prisma.fitnessEntry.create({
      data: {
        userId,
        type: createDto.type,
        value: createDto.value,
        recordedAt: createDto.recordedAt || new Date(),
        notes: createDto.notes,
      },
    });

    return entry;
  }

  async getUserFitnessEntries(
    userId: string,
    type?: FitnessType,
    limit = 50,
    offset = 0,
  ): Promise<{
    entries: FitnessEntry[];
    total: number;
    hasMore: boolean;
  }> {
    const where: any = { userId };
    if (type) where.type = type;

    const [entries, total] = await Promise.all([
      this.prisma.fitnessEntry.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.fitnessEntry.count({ where }),
    ]);

    return {
      entries,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getFitnessProgress(userId: string): Promise<FitnessProgress[]> {
    const progressData: FitnessProgress[] = [];

    for (const type of Object.values(FitnessType)) {
      const entries = await this.prisma.fitnessEntry.findMany({
        where: { userId, type },
        orderBy: { recordedAt: 'desc' },
        take: 30, // Last 30 entries for analysis
      });

      if (entries.length === 0) continue;

      const values = entries.map(e => e.value);
      const current = values[0];
      const best = this.getBestValue(type, values);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      // Calculate improvement over last 10 entries vs previous 10
      const improvement = this.calculateImprovement(type, values);
      const trend = this.analyzeTrend(type, values);

      progressData.push({
        type,
        current,
        best,
        average: Math.round(average * 100) / 100,
        improvement,
        trend,
        lastRecorded: entries[0].recordedAt,
        totalEntries: await this.prisma.fitnessEntry.count({
          where: { userId, type },
        }),
      });
    }

    return progressData;
  }

  async getFitnessAnalytics(
    userId: string,
    userBranch: MilitaryBranch,
    userGender: Gender,
    userAge: number,
  ): Promise<FitnessAnalytics> {
    const progress = await this.getFitnessProgress(userId);
    const weeklyStats = await this.getWeeklyStats(userId);
    const monthlyTrends = await this.getMonthlyTrends(userId);
    const achievements = await this.calculateAchievements(userId);
    const nextPTTest = await this.calculatePTReadiness(userId, userBranch, userGender, userAge);

    return {
      userId,
      overallProgress: progress,
      weeklyStats,
      monthlyTrends,
      achievements,
      nextPTTest,
    };
  }

  async createFitnessGoal(
    userId: string,
    createDto: CreateFitnessGoalDto,
  ): Promise<FitnessGoal> {
    if (createDto.targetDate < new Date()) {
      throw new BadRequestException('Target date must be in the future');
    }

    // Get current value for this fitness type
    const latestEntry = await this.prisma.fitnessEntry.findFirst({
      where: { userId, type: createDto.type },
      orderBy: { recordedAt: 'desc' },
    });

    const goal = await this.prisma.$transaction(async (prisma) => {
      // Deactivate any existing goals for this fitness type
      await prisma.fitnessGoal.updateMany({
        where: { userId, type: createDto.type, isCompleted: false },
        data: { isCompleted: true }, // Mark as completed to allow new goal
      });

      return prisma.fitnessGoal.create({
        data: {
          userId,
          type: createDto.type,
          targetValue: createDto.targetValue,
          currentValue: latestEntry?.value || 0,
          targetDate: createDto.targetDate,
          isCompleted: false,
        },
      });
    });

    return goal;
  }

  async updateFitnessGoalProgress(userId: string, goalId: string): Promise<FitnessGoal> {
    const goal = await this.prisma.fitnessGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.userId !== userId) {
      throw new NotFoundException('Fitness goal not found');
    }

    // Get latest entry for this fitness type
    const latestEntry = await this.prisma.fitnessEntry.findFirst({
      where: { userId, type: goal.type },
      orderBy: { recordedAt: 'desc' },
    });

    if (!latestEntry) {
      return goal; // No new entries to update with
    }

    const isGoalMet = this.isGoalMet(goal.type, latestEntry.value, goal.targetValue);

    const updatedGoal = await this.prisma.fitnessGoal.update({
      where: { id: goalId },
      data: {
        currentValue: latestEntry.value,
        isCompleted: isGoalMet,
      },
    });

    return updatedGoal;
  }

  async getUserFitnessGoals(
    userId: string,
    activeOnly = true,
  ): Promise<FitnessGoal[]> {
    const where: any = { userId };
    if (activeOnly) where.isCompleted = false;

    return this.prisma.fitnessGoal.findMany({
      where,
      orderBy: { targetDate: 'asc' },
    });
  }

  async simulatePTTest(
    userId: string,
    userBranch: MilitaryBranch,
    userGender: Gender,
    userAge: number,
    scores: {
      runTimeSeconds: number;
      pushups: number;
      situps: number;
      planksSeconds?: number;
    },
  ) {
    // Use the fitness standards service to calculate the PT test result
    const result = await this.fitnessStandardsService.calculatePTTestScore(
      userBranch,
      userGender,
      userAge,
      scores,
    );

    // Save the PT test result as fitness entries
    await this.savePTTestEntries(userId, scores);

    return result;
  }

  private async savePTTestEntries(
    userId: string,
    scores: {
      runTimeSeconds: number;
      pushups: number;
      situps: number;
      planksSeconds?: number;
    },
  ): Promise<void> {
    const entries = [
      { type: FitnessType.RUN, value: scores.runTimeSeconds },
      { type: FitnessType.PUSHUPS, value: scores.pushups },
      { type: FitnessType.SITUPS, value: scores.situps },
    ];

    if (scores.planksSeconds) {
      entries.push({ type: FitnessType.PLANK, value: scores.planksSeconds });
    }

    await this.prisma.fitnessEntry.createMany({
      data: entries.map(entry => ({
        userId,
        type: entry.type,
        value: entry.value,
        recordedAt: new Date(),
        notes: 'PT Test Simulation',
      })),
    });
  }

  private validateFitnessEntry(createDto: CreateFitnessEntryDto): void {
    // Validate reasonable values for each fitness type
    const validationRules = {
      [FitnessType.RUN]: { min: 180, max: 3600 }, // 3-60 minutes
      [FitnessType.PUSHUPS]: { min: 0, max: 200 },
      [FitnessType.SITUPS]: { min: 0, max: 200 },
      [FitnessType.PLANK]: { min: 0, max: 600 }, // 0-10 minutes
    };

    const rules = validationRules[createDto.type];
    if (createDto.value < rules.min || createDto.value > rules.max) {
      throw new BadRequestException(
        `Invalid ${createDto.type} value: must be between ${rules.min} and ${rules.max}`,
      );
    }
  }

  private getBestValue(type: FitnessType, values: number[]): number {
    if (type === FitnessType.RUN) {
      return Math.min(...values); // Lowest time is best for running
    }
    return Math.max(...values); // Highest count/time is best for others
  }

  private calculateImprovement(type: FitnessType, values: number[]): number {
    if (values.length < 10) return 0;

    const recent = values.slice(0, 10);
    const previous = values.slice(10, 20);

    if (previous.length === 0) return 0;

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;

    if (type === FitnessType.RUN) {
      // For running, lower is better
      return ((previousAvg - recentAvg) / previousAvg) * 100;
    }
    
    return ((recentAvg - previousAvg) / previousAvg) * 100;
  }

  private analyzeTrend(type: FitnessType, values: number[]): 'IMPROVING' | 'DECLINING' | 'STABLE' {
    if (values.length < 5) return 'STABLE';

    const recent = values.slice(0, 5);
    const older = values.slice(-5);

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const threshold = 0.05; // 5% change threshold

    if (type === FitnessType.RUN) {
      // For running, lower is better
      const improvement = (olderAvg - recentAvg) / olderAvg;
      if (improvement > threshold) return 'IMPROVING';
      if (improvement < -threshold) return 'DECLINING';
    } else {
      const improvement = (recentAvg - olderAvg) / olderAvg;
      if (improvement > threshold) return 'IMPROVING';
      if (improvement < -threshold) return 'DECLINING';
    }

    return 'STABLE';
  }

  private async getWeeklyStats(userId: string): Promise<{
    week: string;
    workouts: number;
    totalTime: number;
    averageIntensity: number;
  }[]> {
    // Simplified implementation - would use more complex aggregation in practice
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const entries = await this.prisma.fitnessEntry.findMany({
      where: {
        userId,
        recordedAt: { gte: fourWeeksAgo },
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Group by week and calculate stats
    const weeklyStats = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const weekEntries = entries.filter(
        entry => entry.recordedAt >= weekStart && entry.recordedAt <= weekEnd,
      );

      weeklyStats.push({
        week: `Week ${4 - i}`,
        workouts: new Set(weekEntries.map(e => 
          e.recordedAt.toDateString()
        )).size, // Unique days with workouts
        totalTime: weekEntries
          .filter(e => e.type === FitnessType.RUN)
          .reduce((sum, e) => sum + e.value, 0) / 60, // Convert to minutes
        averageIntensity: weekEntries.length > 0 ? 
          weekEntries.length * 10 : 0, // Simplified intensity calculation
      });
    }

    return weeklyStats.reverse();
  }

  private async getMonthlyTrends(userId: string): Promise<{
    month: string;
    [key in FitnessType]: number;
  }[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const entries = await this.prisma.fitnessEntry.findMany({
      where: {
        userId,
        recordedAt: { gte: sixMonthsAgo },
      },
    });

    const monthlyTrends = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthEntries = entries.filter(
        entry => entry.recordedAt >= monthStart && entry.recordedAt <= monthEnd,
      );

      const monthData: any = {
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      };

      // Calculate best value for each fitness type this month
      Object.values(FitnessType).forEach(type => {
        const typeEntries = monthEntries.filter(e => e.type === type);
        if (typeEntries.length > 0) {
          monthData[type] = this.getBestValue(type, typeEntries.map(e => e.value));
        } else {
          monthData[type] = 0;
        }
      });

      monthlyTrends.push(monthData);
    }

    return monthlyTrends.reverse();
  }

  private async calculateAchievements(userId: string): Promise<{
    personalRecords: number;
    consistencyStreak: number;
    goalsCompleted: number;
  }> {
    const [personalRecords, goalsCompleted] = await Promise.all([
      this.countPersonalRecords(userId),
      this.prisma.fitnessGoal.count({
        where: { userId, isCompleted: true },
      }),
    ]);

    const consistencyStreak = await this.calculateConsistencyStreak(userId);

    return {
      personalRecords,
      consistencyStreak,
      goalsCompleted,
    };
  }

  private async countPersonalRecords(userId: string): Promise<number> {
    let totalPRs = 0;

    for (const type of Object.values(FitnessType)) {
      const entries = await this.prisma.fitnessEntry.findMany({
        where: { userId, type },
        orderBy: { recordedAt: 'asc' },
      });

      if (entries.length < 2) continue;

      let currentBest = entries[0].value;
      for (let i = 1; i < entries.length; i++) {
        const isNewRecord = type === FitnessType.RUN 
          ? entries[i].value < currentBest 
          : entries[i].value > currentBest;

        if (isNewRecord) {
          totalPRs++;
          currentBest = entries[i].value;
        }
      }
    }

    return totalPRs;
  }

  private async calculateConsistencyStreak(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entries = await this.prisma.fitnessEntry.findMany({
      where: {
        userId,
        recordedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Calculate consecutive days with fitness entries
    const workoutDays = new Set(
      entries.map(entry => entry.recordedAt.toDateString()),
    );

    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      if (workoutDays.has(checkDate.toDateString())) {
        streak++;
      } else if (streak > 0) {
        break; // Streak broken
      }
    }

    return streak;
  }

  private async calculatePTReadiness(
    userId: string,
    userBranch: MilitaryBranch,
    userGender: Gender,
    userAge: number,
  ): Promise<{
    daysRemaining: number;
    readinessScore: number;
    recommendedTraining: string[];
  } | undefined> {
    // This would typically be based on user's next scheduled PT test
    // For now, assume PT tests are every 6 months
    const daysRemaining = 90; // Placeholder

    // Get user's latest fitness entries
    const latestEntries = await Promise.all([
      this.prisma.fitnessEntry.findFirst({
        where: { userId, type: FitnessType.RUN },
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.fitnessEntry.findFirst({
        where: { userId, type: FitnessType.PUSHUPS },
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.fitnessEntry.findFirst({
        where: { userId, type: FitnessType.SITUPS },
        orderBy: { recordedAt: 'desc' },
      }),
    ]);

    if (!latestEntries[0] || !latestEntries[1] || !latestEntries[2]) {
      return {
        daysRemaining,
        readinessScore: 0,
        recommendedTraining: ['Complete initial fitness assessment to get personalized recommendations'],
      };
    }

    // Calculate current PT test score
    try {
      const currentResult = await this.fitnessStandardsService.calculatePTTestScore(
        userBranch,
        userGender,
        userAge,
        {
          runTimeSeconds: latestEntries[0].value,
          pushups: latestEntries[1].value,
          situps: latestEntries[2].value,
        },
      );

      return {
        daysRemaining,
        readinessScore: currentResult.percentage,
        recommendedTraining: currentResult.recommendations,
      };
    } catch (error) {
      return {
        daysRemaining,
        readinessScore: 0,
        recommendedTraining: ['Unable to calculate readiness - ensure you have recent fitness data'],
      };
    }
  }

  private isGoalMet(type: FitnessType, currentValue: number, targetValue: number): boolean {
    if (type === FitnessType.RUN) {
      return currentValue <= targetValue; // Lower time is better
    }
    return currentValue >= targetValue; // Higher count/time is better
  }
}