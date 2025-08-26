import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...sanitizedUser } = user;
    return {
      ...sanitizedUser,
      isPremium: user.subscriptionTier === 'PREMIUM',
      isTrialActive: user.trialEndsAt ? new Date() < user.trialEndsAt : false,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });
  }

  async updateProfile(userId: string, updateData: any) {
    const user = await this.findById(userId);

    // Update user basic info
    const userUpdate: any = {};
    if (updateData.firstName !== undefined) userUpdate.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) userUpdate.lastName = updateData.lastName;

    // Update profile info
    const profileUpdate: any = {};
    if (updateData.bio !== undefined) profileUpdate.bio = updateData.bio;
    if (updateData.timezone !== undefined) profileUpdate.timezone = updateData.timezone;
    if (updateData.preferences !== undefined) profileUpdate.preferences = updateData.preferences;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...userUpdate,
        profile: {
          update: profileUpdate,
        },
      },
      include: {
        profile: true,
      },
    });
  }

  async changeBranch(userId: string, newBranch: MilitaryBranch) {
    const user = await this.findById(userId);

    if (user.selectedBranch === newBranch) {
      throw new ConflictException('User is already in this branch');
    }

    // Update user's branch
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        selectedBranch: newBranch,
      },
      include: {
        profile: true,
      },
    });

    // Reset progress when changing branches (optional - you might want to keep historical data)
    // await this.prisma.userProgress.deleteMany({
    //   where: { userId },
    // });

    return updatedUser;
  }

  async getUserProgress(userId: string) {
    const progress = await this.prisma.userProgress.findMany({
      where: { userId },
      orderBy: { category: 'asc' },
    });

    return progress;
  }

  async updateStudyStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User or profile not found');
    }

    const lastStudyDate = user.profile.lastStudyDate;
    let newStreak = user.profile.studyStreak;

    if (!lastStudyDate) {
      // First time studying
      newStreak = 1;
    } else {
      const lastStudy = new Date(lastStudyDate);
      lastStudy.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Already studied today, no change
        return user.profile.studyStreak;
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak = user.profile.studyStreak + 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        studyStreak: newStreak,
        lastStudyDate: new Date(),
      },
    });

    return newStreak;
  }

  async deleteAccount(userId: string) {
    // In production, you might want to soft delete or anonymize data
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }

  async getUserStats(userId: string) {
    const user = await this.findById(userId);
    
    // Get quiz stats
    const quizStats = await this.prisma.quiz.aggregate({
      where: { 
        userId,
        completedAt: { not: null },
      },
      _count: { id: true },
      _avg: { score: true },
      _max: { score: true },
    });

    // Get question attempt stats
    const questionStats = await this.prisma.questionAttempt.aggregate({
      where: { userId },
      _count: { id: true },
    });

    const correctAnswers = await this.prisma.questionAttempt.count({
      where: { 
        userId,
        isCorrect: true,
      },
    });

    // Get study streak
    const studyStreak = user.profile?.studyStreak || 0;

    return {
      quizzesCompleted: quizStats._count.id,
      averageScore: Math.round(quizStats._avg.score || 0),
      bestScore: quizStats._max.score || 0,
      totalQuestions: questionStats._count.id,
      correctAnswers,
      accuracy: questionStats._count.id > 0 ? Math.round((correctAnswers / questionStats._count.id) * 100) : 0,
      studyStreak,
      isPremium: user.subscriptionTier === 'PREMIUM',
      isTrialActive: user.trialEndsAt ? new Date() < user.trialEndsAt : false,
    };
  }
}