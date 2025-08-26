import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionCategory, QuestionDifficulty, SubscriptionTier } from '@prisma/client';

interface GetQuestionsQuery {
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  limit?: number;
  offset?: number;
  userId?: string;
}

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async getQuestions(query: GetQuestionsQuery, subscriptionTier: SubscriptionTier) {
    const { category, difficulty, limit = 10, offset = 0, userId } = query;

    // Check if user has exceeded free tier limits
    if (subscriptionTier === SubscriptionTier.FREE && userId) {
      const attemptCount = await this.prisma.questionAttempt.count({
        where: { userId },
      });

      if (attemptCount >= 50) {
        throw new ForbiddenException('Free tier question limit reached. Upgrade to Premium for unlimited access.');
      }
    }

    // ASVAB questions are standardized across all branches - no branch filtering
    const whereConditions: any = {
      isActive: true,
    };

    if (category) {
      whereConditions.category = category;
    }

    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    const [questions, totalCount] = await Promise.all([
      this.prisma.question.findMany({
        where: whereConditions,
        select: {
          id: true,
          content: true,
          options: true,
          category: true,
          difficulty: true,
          tags: true,
          // Don't include correct answer or explanations in list view
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.question.count({
        where: whereConditions,
      }),
    ]);

    return {
      questions,
      totalCount,
      hasMore: offset + limit < totalCount,
      remainingQuestions: subscriptionTier === SubscriptionTier.FREE && userId 
        ? Math.max(0, 50 - await this.getUserAttemptCount(userId))
        : -1, // -1 means unlimited
    };
  }

  async getQuestionById(questionId: string, subscriptionTier: SubscriptionTier) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question || !question.isActive) {
      throw new NotFoundException('Question not found');
    }

    // ASVAB questions are standardized - no branch filtering needed

    // Return question with appropriate explanation based on subscription
    return {
      id: question.id,
      content: question.content,
      options: question.options,
      category: question.category,
      difficulty: question.difficulty,
      tags: question.tags,
      correctAnswer: question.correctAnswer,
      explanation: subscriptionTier === SubscriptionTier.PREMIUM 
        ? question.explanationPremium || question.explanationBasic
        : question.explanationBasic,
      isPremiumExplanation: subscriptionTier === SubscriptionTier.PREMIUM && !!question.explanationPremium,
    };
  }

  async getCategories() {
    // Get all ASVAB categories with question counts (standardized across branches)
    const categories = await this.prisma.question.groupBy({
      by: ['category'],
      where: {
        isActive: true,
      },
      _count: {
        id: true,
      },
    });

    return categories.map(cat => ({
      category: cat.category,
      questionCount: cat._count.id,
    })).filter(cat => cat.questionCount > 0);
  }

  async submitAnswer(questionId: string, userAnswer: number, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question || !question.isActive) {
      throw new NotFoundException('Question not found');
    }

    // ASVAB questions are standardized - no branch filtering needed

    const isCorrect = question.correctAnswer === userAnswer;
    
    // Record the attempt
    const attempt = await this.prisma.questionAttempt.create({
      data: {
        userId,
        questionId,
        userAnswer,
        isCorrect,
        timeSpent: 0, // Will be updated when time tracking is implemented
      },
    });

    // Update user progress
    await this.updateUserProgress(userId, question.category, isCorrect);

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanationBasic, // Always show basic explanation for immediate feedback
      attemptId: attempt.id,
    };
  }

  async getUserProgress(userId: string) {
    const progress = await this.prisma.userProgress.findMany({
      where: {
        userId,
      },
      orderBy: {
        category: 'asc',
      },
    });

    return progress;
  }

  async getQuestionSession(userId: string) {
    // Check if user has an active session
    const session = await this.prisma.questionSession?.findFirst({
      where: {
        userId,
        completedAt: null,
      },
      include: {
        attempts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return session;
  }

  async createQuestionSession(userId: string, questionIds: string[]) {
    const session = await this.prisma.questionSession?.create({
      data: {
        userId,
        questionIds,
        startedAt: new Date(),
      },
    });

    return session;
  }

  async resumeQuestionSession(sessionId: string, userId: string) {
    const session = await this.prisma.questionSession?.findFirst({
      where: {
        id: sessionId,
        userId,
        completedAt: null,
      },
      include: {
        attempts: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already completed');
    }

    const answeredQuestionIds = session.attempts.map(a => a.questionId);
    const remainingQuestionIds = session.questionIds.filter(id => !answeredQuestionIds.includes(id));

    return {
      session,
      remainingQuestions: remainingQuestionIds,
      answeredCount: answeredQuestionIds.length,
      totalCount: session.questionIds.length,
    };
  }

  private async updateUserProgress(userId: string, category: QuestionCategory, isCorrect: boolean) {
    const existingProgress = await this.prisma.userProgress.findUnique({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
    });

    if (existingProgress) {
      const newTotalQuestions = existingProgress.totalQuestions + 1;
      const newCorrectAnswers = existingProgress.correctAnswers + (isCorrect ? 1 : 0);
      const newAverageScore = Math.round((newCorrectAnswers / newTotalQuestions) * 100);
      const newBestScore = Math.max(existingProgress.bestScore, isCorrect ? 100 : 0);

      await this.prisma.userProgress.update({
        where: {
          userId_category: {
            userId,
            category,
          },
        },
        data: {
          totalQuestions: newTotalQuestions,
          correctAnswers: newCorrectAnswers,
          averageScore: newAverageScore,
          bestScore: newBestScore,
          lastStudied: new Date(),
        },
      });
    } else {
      await this.prisma.userProgress.create({
        data: {
          userId,
          category,
          totalQuestions: 1,
          correctAnswers: isCorrect ? 1 : 0,
          averageScore: isCorrect ? 100 : 0,
          bestScore: isCorrect ? 100 : 0,
          lastStudied: new Date(),
        },
      });
    }
  }

  private async getUserAttemptCount(userId: string): Promise<number> {
    return this.prisma.questionAttempt.count({
      where: { userId },
    });
  }

  async searchQuestions(searchTerm: string, limit = 10) {
    const questions = await this.prisma.question.findMany({
      where: {
        isActive: true,
        OR: [
          {
            content: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              has: searchTerm.toLowerCase(),
            },
          },
        ],
      },
      select: {
        id: true,
        content: true,
        category: true,
        difficulty: true,
        tags: true,
      },
      take: limit,
    });

    return questions;
  }

  async getRandomQuestions(count = 10, category?: QuestionCategory, difficulty?: QuestionDifficulty) {
    const whereConditions: any = {
      isActive: true,
    };

    if (category) {
      whereConditions.category = category;
    }

    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    // Get total count for random selection
    const totalCount = await this.prisma.question.count({
      where: whereConditions,
    });

    if (totalCount === 0) {
      return [];
    }

    // Generate random skip values
    const skipValues = [];
    for (let i = 0; i < Math.min(count, totalCount); i++) {
      let skip;
      do {
        skip = Math.floor(Math.random() * totalCount);
      } while (skipValues.includes(skip));
      skipValues.push(skip);
    }

    // Fetch questions at random positions
    const questions = await Promise.all(
      skipValues.map(skip =>
        this.prisma.question.findFirst({
          where: whereConditions,
          select: {
            id: true,
            content: true,
            options: true,
            category: true,
            difficulty: true,
            tags: true,
          },
          skip,
        })
      )
    );

    return questions.filter(Boolean);
  }
}