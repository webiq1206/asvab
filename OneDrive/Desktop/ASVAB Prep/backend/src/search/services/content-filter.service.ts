import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuestionCategory, MilitaryBranch } from '@prisma/client';

export interface ContentFilter {
  categories?: QuestionCategory[];
  difficulties?: string[];
  branches?: MilitaryBranch[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  scoreRange?: {
    min: number;
    max: number;
  };
  contentLength?: {
    min: number;
    max: number;
  };
  hasExplanation?: boolean;
  isBookmarked?: boolean;
  userPerformance?: {
    accuracyRange?: { min: number; max: number };
    attemptedBefore?: boolean;
  };
}

export interface FilteredContent {
  items: any[];
  totalCount: number;
  appliedFilters: ContentFilter;
  availableFilters: {
    categories: Array<{ name: QuestionCategory; count: number }>;
    difficulties: Array<{ name: string; count: number }>;
    branches: Array<{ name: MilitaryBranch; count: number }>;
    tags: Array<{ name: string; count: number }>;
  };
}

@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async filterContent(
    contentType: 'QUESTIONS' | 'FLASHCARDS' | 'MILITARY_JOBS' | 'ALL',
    filters: ContentFilter,
    userId?: string,
    limit = 50,
    offset = 0
  ): Promise<FilteredContent> {
    try {
      let items: any[] = [];
      let totalCount = 0;

      // Apply filters based on content type
      if (contentType === 'QUESTIONS' || contentType === 'ALL') {
        const questionResults = await this.filterQuestions(filters, userId, limit, offset);
        items.push(...questionResults.items);
        totalCount += questionResults.totalCount;
      }

      if (contentType === 'FLASHCARDS' || contentType === 'ALL') {
        const flashcardResults = await this.filterFlashcards(filters, userId, limit, offset);
        items.push(...flashcardResults.items);
        totalCount += flashcardResults.totalCount;
      }

      if (contentType === 'MILITARY_JOBS' || contentType === 'ALL') {
        const jobResults = await this.filterMilitaryJobs(filters, userId, limit, offset);
        items.push(...jobResults.items);
        totalCount += jobResults.totalCount;
      }

      // Get available filters for faceted search
      const availableFilters = await this.getAvailableFilters(contentType, filters);

      // Sort combined results if needed
      if (contentType === 'ALL') {
        items = this.sortCombinedResults(items).slice(offset, offset + limit);
      }

      return {
        items,
        totalCount,
        appliedFilters: filters,
        availableFilters,
      };
    } catch (error) {
      this.logger.error('Content filtering failed:', error);
      throw new Error('Content filtering operation failed');
    }
  }

  async getPersonalizedFilters(userId: string): Promise<ContentFilter> {
    try {
      // Analyze user's learning patterns to suggest personalized filters
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          quizzes: {
            take: 50,
            orderBy: { completedAt: 'desc' },
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
        return {};
      }

      // Analyze performance patterns
      const categoryPerformance = this.analyzeCategoryPerformance(user.quizzes);
      const difficultyPreferences = this.analyzeDifficultyPreferences(user.quizzes);

      // Suggest filters based on performance
      const suggestedFilters: ContentFilter = {};

      // Suggest categories where user needs improvement
      const weakCategories = Object.entries(categoryPerformance)
        .filter(([, data]: [string, any]) => data.accuracy < 0.7)
        .map(([category]) => category as QuestionCategory);

      if (weakCategories.length > 0) {
        suggestedFilters.categories = weakCategories.slice(0, 3);
      }

      // Suggest appropriate difficulty levels
      const averageAccuracy = Object.values(categoryPerformance).reduce(
        (sum: number, data: any) => sum + (data.accuracy || 0),
        0
      ) / Object.values(categoryPerformance).length;

      if (averageAccuracy < 0.6) {
        suggestedFilters.difficulties = ['EASY'];
      } else if (averageAccuracy > 0.8) {
        suggestedFilters.difficulties = ['MEDIUM', 'HARD'];
      } else {
        suggestedFilters.difficulties = ['EASY', 'MEDIUM'];
      }

      // Add branch filter
      suggestedFilters.branches = [user.selectedBranch];

      return suggestedFilters;
    } catch (error) {
      this.logger.error('Failed to get personalized filters:', error);
      return {};
    }
  }

  async saveFilterPreset(
    userId: string,
    name: string,
    filters: ContentFilter
  ): Promise<string> {
    try {
      const preset = await this.prisma.filterPreset.create({
        data: {
          userId,
          name,
          filters: JSON.stringify(filters),
          createdAt: new Date(),
        },
      });

      this.logger.log(`Filter preset "${name}" saved for user ${userId}`);
      return preset.id;
    } catch (error) {
      this.logger.error('Failed to save filter preset:', error);
      throw new Error('Failed to save filter preset');
    }
  }

  async getUserFilterPresets(userId: string): Promise<Array<{ id: string; name: string; filters: ContentFilter; createdAt: Date }>> {
    try {
      const presets = await this.prisma.filterPreset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          filters: true,
          createdAt: true,
        },
      });

      return presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        filters: JSON.parse(preset.filters as string),
        createdAt: preset.createdAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get user filter presets:', error);
      return [];
    }
  }

  private async filterQuestions(
    filters: ContentFilter,
    userId?: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: any[]; totalCount: number }> {
    const whereConditions: any = {
      isActive: true,
    };

    // Apply basic filters
    if (filters.categories && filters.categories.length > 0) {
      whereConditions.category = { in: filters.categories };
    }

    if (filters.difficulties && filters.difficulties.length > 0) {
      whereConditions.difficulty = { in: filters.difficulties };
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.tags = { hasSome: filters.tags };
    }

    if (filters.dateRange) {
      whereConditions.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    if (filters.hasExplanation !== undefined) {
      if (filters.hasExplanation) {
        whereConditions.explanation = { not: null };
      } else {
        whereConditions.explanation = null;
      }
    }

    if (filters.contentLength) {
      // Filter by content length (character count)
      const lengthConditions = [];
      if (filters.contentLength.min > 0) {
        // This would require a computed field or raw SQL in production
        // For now, we'll use a simplified approach
      }
    }

    // Get questions
    const [questions, totalCount] = await Promise.all([
      this.prisma.question.findMany({
        where: whereConditions,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: userId ? {
          quizQuestions: {
            where: {
              quiz: { userId },
            },
            select: {
              isCorrect: true,
              quiz: { select: { completedAt: true } },
            },
          },
          bookmarks: {
            where: { userId },
            select: { id: true },
          },
        } : undefined,
      }),
      this.prisma.question.count({ where: whereConditions }),
    ]);

    // Apply user-specific filters
    let filteredQuestions = questions;

    if (userId && filters.isBookmarked !== undefined) {
      filteredQuestions = filteredQuestions.filter(q => 
        filters.isBookmarked ? q.bookmarks && q.bookmarks.length > 0 : !q.bookmarks || q.bookmarks.length === 0
      );
    }

    if (userId && filters.userPerformance) {
      filteredQuestions = await this.applyPerformanceFilters(filteredQuestions, filters.userPerformance);
    }

    // Map to consistent format
    const items = filteredQuestions.map(q => ({
      ...q,
      type: 'QUESTION',
      userStats: userId ? {
        isBookmarked: q.bookmarks && q.bookmarks.length > 0,
        hasAttempted: q.quizQuestions && q.quizQuestions.length > 0,
        lastAttempted: q.quizQuestions && q.quizQuestions.length > 0 ? 
          q.quizQuestions[q.quizQuestions.length - 1].quiz.completedAt : null,
        accuracy: this.calculateQuestionAccuracy(q.quizQuestions || []),
      } : undefined,
    }));

    return {
      items,
      totalCount: filteredQuestions.length,
    };
  }

  private async filterFlashcards(
    filters: ContentFilter,
    userId?: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: any[]; totalCount: number }> {
    const whereConditions: any = {
      isActive: true,
    };

    // Apply filters similar to questions
    if (filters.categories && filters.categories.length > 0) {
      whereConditions.category = { in: filters.categories };
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.tags = { hasSome: filters.tags };
    }

    if (filters.dateRange) {
      whereConditions.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const [flashcards, totalCount] = await Promise.all([
      this.prisma.flashcard.findMany({
        where: whereConditions,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: userId ? {
          bookmarks: {
            where: { userId },
            select: { id: true },
          },
          reviews: {
            where: { userId },
            select: {
              rating: true,
              createdAt: true,
            },
          },
        } : undefined,
      }),
      this.prisma.flashcard.count({ where: whereConditions }),
    ]);

    const items = flashcards.map(f => ({
      ...f,
      type: 'FLASHCARD',
      userStats: userId ? {
        isBookmarked: f.bookmarks && f.bookmarks.length > 0,
        hasReviewed: f.reviews && f.reviews.length > 0,
        averageRating: f.reviews && f.reviews.length > 0 ? 
          f.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / f.reviews.length : null,
        lastReviewed: f.reviews && f.reviews.length > 0 ? 
          f.reviews[f.reviews.length - 1].createdAt : null,
      } : undefined,
    }));

    return {
      items,
      totalCount,
    };
  }

  private async filterMilitaryJobs(
    filters: ContentFilter,
    userId?: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: any[]; totalCount: number }> {
    const whereConditions: any = {
      isActive: true,
    };

    if (filters.branches && filters.branches.length > 0) {
      whereConditions.branch = { in: filters.branches };
    }

    if (filters.scoreRange) {
      whereConditions.minAFQTScore = {
        gte: filters.scoreRange.min,
        lte: filters.scoreRange.max,
      };
    }

    const [jobs, totalCount] = await Promise.all([
      this.prisma.militaryJob.findMany({
        where: whereConditions,
        take: limit,
        skip: offset,
        orderBy: { title: 'asc' },
      }),
      this.prisma.militaryJob.count({ where: whereConditions }),
    ]);

    const items = jobs.map(j => ({
      ...j,
      type: 'MILITARY_JOB',
    }));

    return {
      items,
      totalCount,
    };
  }

  private async getAvailableFilters(
    contentType: string,
    currentFilters: ContentFilter
  ): Promise<any> {
    try {
      // Get available categories
      const categories = await this.prisma.question.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { category: true },
      });

      // Get available difficulties
      const difficulties = await this.prisma.question.groupBy({
        by: ['difficulty'],
        where: { isActive: true },
        _count: { difficulty: true },
      });

      // Get available branches
      const branches = await this.prisma.militaryJob.groupBy({
        by: ['branch'],
        where: { isActive: true },
        _count: { branch: true },
      });

      // Get available tags (simplified)
      const tags = [
        { name: 'practice', count: 100 },
        { name: 'review', count: 80 },
        { name: 'challenging', count: 60 },
        { name: 'basic', count: 120 },
      ];

      return {
        categories: categories.map(c => ({ 
          name: c.category, 
          count: c._count.category 
        })),
        difficulties: difficulties.map(d => ({ 
          name: d.difficulty, 
          count: d._count.difficulty 
        })),
        branches: branches.map(b => ({ 
          name: b.branch, 
          count: b._count.branch 
        })),
        tags,
      };
    } catch (error) {
      this.logger.warn('Failed to get available filters:', error);
      return {
        categories: [],
        difficulties: [],
        branches: [],
        tags: [],
      };
    }
  }

  private sortCombinedResults(items: any[]): any[] {
    // Sort by relevance score if available, otherwise by creation date
    return items.sort((a, b) => {
      if (a.relevanceScore && b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private analyzeCategoryPerformance(quizzes: any[]): Record<string, any> {
    const categoryStats: Record<string, any> = {};

    quizzes.forEach(quiz => {
      quiz.questions.forEach((q: any) => {
        if (!categoryStats[q.category]) {
          categoryStats[q.category] = { total: 0, correct: 0 };
        }
        categoryStats[q.category].total++;
        if (q.isCorrect) categoryStats[q.category].correct++;
      });
    });

    // Calculate accuracy for each category
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    });

    return categoryStats;
  }

  private analyzeDifficultyPreferences(quizzes: any[]): Record<string, number> {
    const difficultyCount: Record<string, number> = {};

    quizzes.forEach(quiz => {
      quiz.questions.forEach((q: any) => {
        difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
      });
    });

    return difficultyCount;
  }

  private async applyPerformanceFilters(questions: any[], performanceFilter: any): Promise<any[]> {
    return questions.filter(question => {
      if (performanceFilter.attemptedBefore !== undefined) {
        const hasAttempted = question.quizQuestions && question.quizQuestions.length > 0;
        if (performanceFilter.attemptedBefore !== hasAttempted) {
          return false;
        }
      }

      if (performanceFilter.accuracyRange) {
        const accuracy = this.calculateQuestionAccuracy(question.quizQuestions || []);
        if (accuracy < performanceFilter.accuracyRange.min || 
            accuracy > performanceFilter.accuracyRange.max) {
          return false;
        }
      }

      return true;
    });
  }

  private calculateQuestionAccuracy(attempts: any[]): number {
    if (attempts.length === 0) return 0;
    const correct = attempts.filter(a => a.isCorrect).length;
    return correct / attempts.length;
  }
}