import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface UserSearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  averageResultsClicked: number;
  topCategories: Array<{ category: string; count: number }>;
  topQueries: Array<{ query: string; count: number }>;
  searchSuccessRate: number;
  recentSearches: Array<{
    query: string;
    timestamp: Date;
    resultCount: number;
    wasSuccessful: boolean;
  }>;
  searchPatterns: {
    preferredTime: number; // Hour of day
    averageQueryLength: number;
    mostCommonTerms: string[];
  };
}

export interface SearchFeedback {
  query: string;
  resultId: string;
  rating: number;
  feedback?: string;
  wasHelpful: boolean;
}

@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserSearchAnalytics(userId: string): Promise<UserSearchAnalytics> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get user's search history
      const searchHistory = await this.prisma.searchHistory.findMany({
        where: {
          userId,
          searchedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { searchedAt: 'desc' },
      });

      // Get search feedback
      const searchFeedback = await this.prisma.searchFeedback.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      // Calculate analytics
      const totalSearches = searchHistory.length;
      const uniqueQueries = new Set(searchHistory.map(s => s.query.toLowerCase())).size;

      // Calculate success rate (searches with results > 0)
      const successfulSearches = searchHistory.filter(s => s.resultCount > 0).length;
      const searchSuccessRate = totalSearches > 0 ? successfulSearches / totalSearches : 0;

      // Analyze query patterns
      const queryWords = searchHistory.flatMap(s => 
        s.query.toLowerCase().split(' ').filter(word => word.length > 2)
      );
      const wordCount: Record<string, number> = {};
      queryWords.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      const mostCommonTerms = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);

      // Calculate average query length
      const averageQueryLength = totalSearches > 0 ? 
        searchHistory.reduce((sum, s) => sum + s.query.length, 0) / totalSearches : 0;

      // Find preferred search time
      const searchHours = searchHistory.map(s => new Date(s.searchedAt).getHours());
      const hourCount: Record<number, number> = {};
      searchHours.forEach(hour => {
        hourCount[hour] = (hourCount[hour] || 0) + 1;
      });
      const preferredTime = Object.entries(hourCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] ? 
        parseInt(Object.entries(hourCount).sort(([,a], [,b]) => b - a)[0][0]) : 12;

      // Get top categories (would need to track category in search history)
      const topCategories = await this.getTopSearchCategories(userId, thirtyDaysAgo);

      // Get top queries
      const queryCount: Record<string, number> = {};
      searchHistory.forEach(s => {
        queryCount[s.query] = (queryCount[s.query] || 0) + 1;
      });
      const topQueries = Object.entries(queryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([query, count]) => ({ query, count }));

      // Calculate average results clicked (simplified)
      const averageResultsClicked = searchFeedback.length / Math.max(totalSearches, 1);

      // Recent searches with success indication
      const recentSearches = searchHistory.slice(0, 10).map(s => ({
        query: s.query,
        timestamp: s.searchedAt,
        resultCount: s.resultCount,
        wasSuccessful: s.resultCount > 0,
      }));

      return {
        totalSearches,
        uniqueQueries,
        averageResultsClicked,
        topCategories,
        topQueries,
        searchSuccessRate,
        recentSearches,
        searchPatterns: {
          preferredTime,
          averageQueryLength,
          mostCommonTerms,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user search analytics:', error);
      throw new Error('Failed to retrieve search analytics');
    }
  }

  async recordSearchFeedback(userId: string, feedback: SearchFeedback): Promise<void> {
    try {
      await this.prisma.searchFeedback.create({
        data: {
          userId,
          query: feedback.query,
          resultId: feedback.resultId,
          rating: feedback.rating,
          feedback: feedback.feedback,
          wasHelpful: feedback.wasHelpful,
          createdAt: new Date(),
        },
      });

      this.logger.log(`Search feedback recorded for user ${userId}: ${feedback.rating}/5`);
    } catch (error) {
      this.logger.error('Failed to record search feedback:', error);
      throw new Error('Failed to record search feedback');
    }
  }

  async getGlobalSearchTrends(days = 30): Promise<any> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get trending searches
      const trendingQueries = await this.prisma.searchHistory.groupBy({
        by: ['query'],
        where: {
          searchedAt: { gte: startDate },
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 20,
      });

      // Get search volume over time
      const searchVolume = await this.prisma.searchHistory.findMany({
        where: {
          searchedAt: { gte: startDate },
        },
        select: {
          searchedAt: true,
        },
      });

      // Group by day for trend analysis
      const dailyVolume: Record<string, number> = {};
      searchVolume.forEach(search => {
        const date = search.searchedAt.toISOString().split('T')[0];
        dailyVolume[date] = (dailyVolume[date] || 0) + 1;
      });

      // Get success rate trends
      const successRateData = await this.calculateGlobalSuccessRates(startDate);

      return {
        trendingQueries: trendingQueries.map(t => ({
          query: t.query,
          searchCount: t._count.query,
        })),
        dailySearchVolume: Object.entries(dailyVolume).map(([date, volume]) => ({
          date,
          volume,
        })),
        overallSuccessRate: successRateData.overallSuccessRate,
        avgResultsPerSearch: successRateData.avgResultsPerSearch,
      };
    } catch (error) {
      this.logger.error('Failed to get global search trends:', error);
      return {
        trendingQueries: [],
        dailySearchVolume: [],
        overallSuccessRate: 0,
        avgResultsPerSearch: 0,
      };
    }
  }

  async getSearchQualityMetrics(): Promise<any> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get feedback metrics
      const feedbackData = await this.prisma.searchFeedback.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          rating: true,
          wasHelpful: true,
          query: true,
        },
      });

      const totalFeedback = feedbackData.length;
      const avgRating = totalFeedback > 0 ? 
        feedbackData.reduce((sum, f) => sum + f.rating, 0) / totalFeedback : 0;
      
      const helpfulPercentage = totalFeedback > 0 ? 
        feedbackData.filter(f => f.wasHelpful).length / totalFeedback : 0;

      // Get zero-result queries for improvement
      const zeroResultQueries = await this.prisma.searchHistory.findMany({
        where: {
          resultCount: 0,
          searchedAt: { gte: thirtyDaysAgo },
        },
        select: {
          query: true,
        },
        distinct: ['query'],
        take: 50,
      });

      // Get most abandoned searches (multiple searches for same query)
      const abandonedSearches = await this.getAbandonedSearchPatterns(thirtyDaysAgo);

      return {
        qualityMetrics: {
          averageRating: Math.round(avgRating * 100) / 100,
          helpfulPercentage: Math.round(helpfulPercentage * 100),
          totalFeedbackCount: totalFeedback,
        },
        improvementOpportunities: {
          zeroResultQueries: zeroResultQueries.map(q => q.query),
          abandonedSearchPatterns: abandonedSearches,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get search quality metrics:', error);
      return {
        qualityMetrics: {
          averageRating: 0,
          helpfulPercentage: 0,
          totalFeedbackCount: 0,
        },
        improvementOpportunities: {
          zeroResultQueries: [],
          abandonedSearchPatterns: [],
        },
      };
    }
  }

  private async getTopSearchCategories(userId: string, since: Date): Promise<Array<{ category: string; count: number }>> {
    try {
      // This would require tracking categories in search history
      // For now, return mock data based on user's quiz history
      const quizzes = await this.prisma.quiz.findMany({
        where: {
          userId,
          completedAt: { gte: since },
        },
        select: {
          category: true,
        },
      });

      const categoryCount: Record<string, number> = {};
      quizzes.forEach(quiz => {
        if (quiz.category) {
          categoryCount[quiz.category] = (categoryCount[quiz.category] || 0) + 1;
        }
      });

      return Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));
    } catch (error) {
      this.logger.warn('Failed to get top search categories:', error);
      return [];
    }
  }

  private async calculateGlobalSuccessRates(since: Date): Promise<any> {
    try {
      const searchHistory = await this.prisma.searchHistory.findMany({
        where: {
          searchedAt: { gte: since },
        },
        select: {
          resultCount: true,
        },
      });

      const totalSearches = searchHistory.length;
      const successfulSearches = searchHistory.filter(s => s.resultCount > 0).length;
      const totalResults = searchHistory.reduce((sum, s) => sum + s.resultCount, 0);

      return {
        overallSuccessRate: totalSearches > 0 ? successfulSearches / totalSearches : 0,
        avgResultsPerSearch: totalSearches > 0 ? totalResults / totalSearches : 0,
      };
    } catch (error) {
      this.logger.warn('Failed to calculate global success rates:', error);
      return {
        overallSuccessRate: 0,
        avgResultsPerSearch: 0,
      };
    }
  }

  private async getAbandonedSearchPatterns(since: Date): Promise<Array<{ query: string; attempts: number }>> {
    try {
      // Find queries that users searched multiple times (indicating possible abandonment)
      const repeatedQueries = await this.prisma.searchHistory.groupBy({
        by: ['query', 'userId'],
        where: {
          searchedAt: { gte: since },
        },
        _count: {
          query: true,
        },
        having: {
          query: {
            _count: {
              gt: 2, // More than 2 attempts for same query
            },
          },
        },
      });

      // Aggregate by query
      const queryAttempts: Record<string, number> = {};
      repeatedQueries.forEach(rq => {
        queryAttempts[rq.query] = (queryAttempts[rq.query] || 0) + rq._count.query;
      });

      return Object.entries(queryAttempts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([query, attempts]) => ({ query, attempts }));
    } catch (error) {
      this.logger.warn('Failed to get abandoned search patterns:', error);
      return [];
    }
  }
}