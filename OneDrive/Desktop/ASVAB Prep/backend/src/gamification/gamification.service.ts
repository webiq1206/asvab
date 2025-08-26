import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch } from '@asvab-prep/shared';

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  async getUserAchievements(userId: string) {
    return await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async getLeaderboard(branch: MilitaryBranch, limit: number = 50) {
    return await this.prisma.user.findMany({
      where: { selectedBranch: branch },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: {
          select: {
            currentRank: true,
            totalPoints: true,
            studyStreak: true,
          },
        },
      },
      orderBy: {
        profile: {
          totalPoints: 'desc',
        },
      },
      take: limit,
    });
  }

  async checkAndUnlockAchievements(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        quizzes: true,
        achievements: { include: { achievement: true } },
      },
    });

    if (!user) return [];

    // Check various achievement conditions
    const newAchievements = [];

    // Study streak achievements
    if (user.profile?.studyStreak >= 7) {
      const weekStreakAchievement = await this.unlockAchievementIfNew(
        userId,
        'WEEK_STREAK',
        'Study for 7 consecutive days'
      );
      if (weekStreakAchievement) newAchievements.push(weekStreakAchievement);
    }

    // Quiz completion achievements  
    const quizCount = user.quizzes.length;
    if (quizCount >= 10) {
      const quizMasterAchievement = await this.unlockAchievementIfNew(
        userId,
        'QUIZ_MASTER',
        'Complete 10 quizzes'
      );
      if (quizMasterAchievement) newAchievements.push(quizMasterAchievement);
    }

    return newAchievements;
  }

  private async unlockAchievementIfNew(userId: string, achievementType: string, description: string) {
    const existing = await this.prisma.userAchievement.findFirst({
      where: { 
        userId,
        achievement: { type: achievementType }
      },
    });

    if (existing) return null;

    // Get or create achievement
    let achievement = await this.prisma.achievement.findFirst({
      where: { type: achievementType },
    });

    if (!achievement) {
      achievement = await this.prisma.achievement.create({
        data: {
          type: achievementType,
          name: achievementType.replace('_', ' '),
          description,
          points: 100,
        },
      });
    }

    return await this.prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
        unlockedAt: new Date(),
      },
      include: { achievement: true },
    });
  }
}