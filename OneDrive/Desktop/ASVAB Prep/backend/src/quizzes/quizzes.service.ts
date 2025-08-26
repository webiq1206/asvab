import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuestionCategory, QuestionDifficulty, SubscriptionTier } from '@prisma/client';
import { ALL_ASVAB_CATEGORIES, FREE_TIER_LIMITS } from '@asvab-prep/shared';

interface CreateQuizDto {
  title: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  questionCount: number;
  isASVABReplica?: boolean;
  targetScore?: number;
}

interface SubmitQuizAnswerDto {
  questionId: string;
  userAnswer: number;
  timeSpent?: number;
}

interface CompleteQuizDto {
  timeSpent: number;
}

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(userId: string, subscriptionTier: SubscriptionTier, createQuizDto: CreateQuizDto) {
    const { title, category, difficulty, questionCount, isASVABReplica = false, targetScore } = createQuizDto;

    // Check subscription limits
    if (subscriptionTier === SubscriptionTier.FREE) {
      // Check daily quiz limit for free users
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayQuizCount = await this.prisma.quiz.count({
        where: {
          userId,
          startedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (todayQuizCount >= FREE_TIER_LIMITS.DAILY_QUIZZES) {
        throw new ForbiddenException('Free tier daily quiz limit reached. Upgrade to Premium for unlimited quizzes.');
      }

      // Check question count limit for free users
      if (questionCount > FREE_TIER_LIMITS.QUIZ_QUESTION_LIMIT) {
        throw new ForbiddenException(`Free tier quiz limited to ${FREE_TIER_LIMITS.QUIZ_QUESTION_LIMIT} questions. Upgrade to Premium for unlimited questions.`);
      }
    }

    // For ASVAB replica, use standardized sections
    if (isASVABReplica) {
      if (subscriptionTier === SubscriptionTier.FREE) {
        throw new ForbiddenException('ASVAB replica exam is a Premium feature. Upgrade to access full exam simulation.');
      }
      return this.createASVABReplicaQuiz(userId, title, targetScore);
    }

    // Get random questions for regular quiz
    const whereConditions: any = {
      isActive: true,
    };

    if (category) {
      whereConditions.category = category;
    }

    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    // Get total available questions
    const availableCount = await this.prisma.question.count({
      where: whereConditions,
    });

    if (availableCount < questionCount) {
      throw new BadRequestException(`Only ${availableCount} questions available for selected criteria.`);
    }

    // Get random questions
    const questions = await this.getRandomQuestions(whereConditions, questionCount);

    // Create quiz
    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        title,
        category,
        isASVABReplica: false,
        targetScore,
        totalQuestions: questionCount,
        questions: {
          create: questions.map((question, index) => ({
            questionId: question.id,
            orderIndex: index,
          })),
        },
      },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                options: true,
                category: true,
                difficulty: true,
                tags: true,
              },
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    return quiz;
  }

  private async createASVABReplicaQuiz(userId: string, title: string, targetScore?: number) {
    // ASVAB replica uses standardized sections
    const asvabSections = [
      { category: QuestionCategory.GENERAL_SCIENCE, timeLimit: 11 * 60, questionCount: 25, order: 1 },
      { category: QuestionCategory.ARITHMETIC_REASONING, timeLimit: 36 * 60, questionCount: 30, order: 2 },
      { category: QuestionCategory.WORD_KNOWLEDGE, timeLimit: 11 * 60, questionCount: 35, order: 3 },
      { category: QuestionCategory.PARAGRAPH_COMPREHENSION, timeLimit: 13 * 60, questionCount: 15, order: 4 },
      { category: QuestionCategory.MATHEMATICS_KNOWLEDGE, timeLimit: 24 * 60, questionCount: 25, order: 5 },
      { category: QuestionCategory.ELECTRONICS_INFORMATION, timeLimit: 9 * 60, questionCount: 20, order: 6 },
      { category: QuestionCategory.AUTO_SHOP, timeLimit: 11 * 60, questionCount: 25, order: 7 },
      { category: QuestionCategory.MECHANICAL_COMPREHENSION, timeLimit: 19 * 60, questionCount: 25, order: 8 },
      { category: QuestionCategory.ASSEMBLING_OBJECTS, timeLimit: 15 * 60, questionCount: 25, order: 9 },
    ];

    const totalQuestions = asvabSections.reduce((sum, section) => sum + section.questionCount, 0);
    
    // Create quiz
    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        title,
        isASVABReplica: true,
        targetScore,
        totalQuestions,
        sections: {
          create: asvabSections.map(section => ({
            category: section.category,
            timeLimit: section.timeLimit,
            orderIndex: section.order,
          })),
        },
      },
      include: {
        sections: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    // Get questions for each section
    let questionOrderIndex = 0;
    for (const section of asvabSections) {
      const sectionQuestions = await this.getRandomQuestions(
        { isActive: true, category: section.category },
        section.questionCount
      );

      await this.prisma.quizQuestion.createMany({
        data: sectionQuestions.map((question) => ({
          quizId: quiz.id,
          questionId: question.id,
          orderIndex: questionOrderIndex++,
        })),
      });
    }

    return this.getQuizWithQuestions(quiz.id);
  }

  private async getRandomQuestions(whereConditions: any, count: number) {
    // Get total count
    const totalCount = await this.prisma.question.count({
      where: whereConditions,
    });

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

  async getQuiz(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        userId,
      },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                options: true,
                category: true,
                difficulty: true,
                tags: true,
              },
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        sections: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  private async getQuizWithQuestions(quizId: string) {
    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                options: true,
                category: true,
                difficulty: true,
                tags: true,
              },
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        sections: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });
  }

  async submitQuizAnswer(quizId: string, userId: string, submitAnswerDto: SubmitQuizAnswerDto) {
    const { questionId, userAnswer, timeSpent } = submitAnswerDto;

    // Verify quiz belongs to user and is not completed
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        userId,
        completedAt: null,
      },
    });

    if (!quiz) {
      throw new NotFoundException('Active quiz not found');
    }

    // Get the question to check correct answer
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { correctAnswer: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const isCorrect = question.correctAnswer === userAnswer;

    // Update quiz question
    const updatedQuizQuestion = await this.prisma.quizQuestion.updateMany({
      where: {
        quizId,
        questionId,
      },
      data: {
        userAnswer,
        isCorrect,
        timeSpent,
      },
    });

    if (updatedQuizQuestion.count === 0) {
      throw new NotFoundException('Quiz question not found');
    }

    // Update quiz correct answers count
    if (isCorrect) {
      await this.prisma.quiz.update({
        where: { id: quizId },
        data: {
          correctAnswers: {
            increment: 1,
          },
        },
      });
    }

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
    };
  }

  async completeQuiz(quizId: string, userId: string, completeQuizDto: CompleteQuizDto) {
    const { timeSpent } = completeQuizDto;

    // Verify quiz belongs to user and is not already completed
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        userId,
        completedAt: null,
      },
    });

    if (!quiz) {
      throw new NotFoundException('Active quiz not found');
    }

    // Calculate final score
    const score = Math.round((quiz.correctAnswers / quiz.totalQuestions) * 100);

    // Complete the quiz
    const completedQuiz = await this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        completedAt: new Date(),
        score,
        timeSpent,
      },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                content: true,
                options: true,
                correctAnswer: true,
                category: true,
                difficulty: true,
                explanationBasic: true,
              },
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    // Update user progress for each category
    await this.updateUserProgressFromQuiz(userId, completedQuiz);

    return {
      quiz: completedQuiz,
      performanceMessage: this.generatePerformanceMessage(score),
      recommendations: this.generateRecommendations(completedQuiz),
    };
  }

  private async updateUserProgressFromQuiz(userId: string, quiz: any) {
    // Group questions by category
    const categoryStats = quiz.questions.reduce((acc: any, quizQuestion: any) => {
      const category = quizQuestion.question.category;
      if (!acc[category]) {
        acc[category] = { total: 0, correct: 0 };
      }
      acc[category].total++;
      if (quizQuestion.isCorrect) {
        acc[category].correct++;
      }
      return acc;
    }, {});

    // Update progress for each category
    for (const [category, stats] of Object.entries(categoryStats) as [string, any][]) {
      const existingProgress = await this.prisma.userProgress.findUnique({
        where: {
          userId_category: {
            userId,
            category: category as QuestionCategory,
          },
        },
      });

      const categoryScore = Math.round((stats.correct / stats.total) * 100);

      if (existingProgress) {
        const newTotalQuestions = existingProgress.totalQuestions + stats.total;
        const newCorrectAnswers = existingProgress.correctAnswers + stats.correct;
        const newAverageScore = Math.round((newCorrectAnswers / newTotalQuestions) * 100);
        const newBestScore = Math.max(existingProgress.bestScore, categoryScore);

        await this.prisma.userProgress.update({
          where: {
            userId_category: {
              userId,
              category: category as QuestionCategory,
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
            category: category as QuestionCategory,
            totalQuestions: stats.total,
            correctAnswers: stats.correct,
            averageScore: categoryScore,
            bestScore: categoryScore,
            lastStudied: new Date(),
          },
        });
      }
    }
  }

  private generatePerformanceMessage(score: number): string {
    if (score >= 90) {
      return 'OUTSTANDING PERFORMANCE, RECRUIT! MISSION ACCOMPLISHED WITH DISTINCTION!';
    } else if (score >= 80) {
      return 'SOLID PERFORMANCE! YOU\'RE READY FOR THE NEXT CHALLENGE!';
    } else if (score >= 70) {
      return 'GOOD WORK! CONTINUE TRAINING TO REACH EXCELLENCE!';
    } else if (score >= 60) {
      return 'ADEQUATE PERFORMANCE. MORE TRAINING REQUIRED!';
    } else {
      return 'UNACCEPTABLE! REMEDIAL TRAINING IMMEDIATELY! HIT THE BOOKS!';
    }
  }

  private generateRecommendations(quiz: any): string[] {
    const recommendations: string[] = [];
    const categoryPerformance = new Map<string, { correct: number; total: number }>();

    // Calculate performance by category
    quiz.questions.forEach((quizQuestion: any) => {
      const category = quizQuestion.question.category;
      if (!categoryPerformance.has(category)) {
        categoryPerformance.set(category, { correct: 0, total: 0 });
      }
      const stats = categoryPerformance.get(category)!;
      stats.total++;
      if (quizQuestion.isCorrect) {
        stats.correct++;
      }
    });

    // Generate recommendations based on weak categories
    categoryPerformance.forEach((stats, category) => {
      const percentage = (stats.correct / stats.total) * 100;
      if (percentage < 70) {
        recommendations.push(`Focus on ${category.replace('_', ' ').toLowerCase()} - ${Math.round(percentage)}% accuracy needs improvement`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Excellent performance across all categories! Continue practicing to maintain your edge!');
    }

    return recommendations;
  }

  async getQuizHistory(userId: string, subscriptionTier: SubscriptionTier, page = 1, limit = 10) {
    // Apply subscription limits
    if (subscriptionTier === SubscriptionTier.FREE) {
      limit = Math.min(limit, FREE_TIER_LIMITS.QUIZ_HISTORY_LIMIT);
    }

    const skip = (page - 1) * limit;

    const [quizzes, totalCount] = await Promise.all([
      this.prisma.quiz.findMany({
        where: {
          userId,
          completedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          title: true,
          category: true,
          isASVABReplica: true,
          score: true,
          totalQuestions: true,
          correctAnswers: true,
          timeSpent: true,
          completedAt: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.quiz.count({
        where: {
          userId,
          completedAt: {
            not: null,
          },
        },
      }),
    ]);

    return {
      quizzes,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + limit < totalCount,
      },
    };
  }
}