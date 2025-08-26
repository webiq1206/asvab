import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuestionCategory, MilitaryBranch } from '@prisma/client';

export interface SearchQuery {
  query: string;
  filters: SearchFilters;
  sorting: SearchSorting;
  pagination: SearchPagination;
  userId?: string;
}

export interface SearchFilters {
  categories?: QuestionCategory[];
  difficulties?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  scoreRange?: {
    min: number;
    max: number;
  };
  branch?: MilitaryBranch;
  contentType?: 'QUESTIONS' | 'FLASHCARDS' | 'MILITARY_JOBS' | 'STUDY_GROUPS' | 'ALL';
  isBookmarked?: boolean;
  hasExplanation?: boolean;
  timeToComplete?: {
    min: number; // seconds
    max: number;
  };
  personalizedFor?: string; // userId
}

export interface SearchSorting {
  field: 'RELEVANCE' | 'DATE' | 'DIFFICULTY' | 'POPULARITY' | 'ACCURACY' | 'TIME_TO_COMPLETE';
  order: 'ASC' | 'DESC';
}

export interface SearchPagination {
  page: number;
  limit: number;
}

export interface SearchResult {
  items: SearchResultItem[];
  totalCount: number;
  facets: SearchFacets;
  suggestions: string[];
  searchTime: number;
  hasMore: boolean;
}

export interface SearchResultItem {
  id: string;
  type: 'QUESTION' | 'FLASHCARD' | 'MILITARY_JOB' | 'STUDY_GROUP';
  title: string;
  content: string;
  category?: QuestionCategory;
  difficulty?: string;
  tags: string[];
  relevanceScore: number;
  highlights: string[];
  metadata: Record<string, any>;
  userInteraction?: {
    isBookmarked: boolean;
    lastAttempted?: Date;
    accuracy?: number;
    timeSpent?: number;
  };
}

export interface SearchFacets {
  categories: Array<{ name: QuestionCategory; count: number }>;
  difficulties: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  contentTypes: Array<{ name: string; count: number }>;
  timeRanges: Array<{ name: string; count: number }>;
}

@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async executeAdvancedSearch(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Build dynamic query based on search parameters
      const searchConditions = this.buildSearchConditions(searchQuery);

      // Execute search across different content types
      const searchResults = await this.performMultiContentSearch(searchConditions, searchQuery);

      // Calculate relevance scores
      const scoredResults = this.calculateRelevanceScores(searchResults, searchQuery.query);

      // Apply sorting
      const sortedResults = this.applySorting(scoredResults, searchQuery.sorting);

      // Apply pagination
      const paginatedResults = this.applyPagination(sortedResults, searchQuery.pagination);

      // Generate facets for filtering
      const facets = await this.generateSearchFacets(searchConditions, searchQuery);

      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(searchQuery.query);

      // Get user interaction data if user is logged in
      if (searchQuery.userId) {
        await this.enrichWithUserInteractions(paginatedResults, searchQuery.userId);
      }

      const searchTime = Date.now() - startTime;

      this.logger.log(`Advanced search completed in ${searchTime}ms for query: "${searchQuery.query}"`);

      return {
        items: paginatedResults,
        totalCount: sortedResults.length,
        facets,
        suggestions,
        searchTime,
        hasMore: this.hasMoreResults(sortedResults, searchQuery.pagination),
      };
    } catch (error) {
      this.logger.error('Advanced search failed:', error);
      throw new Error('Search operation failed');
    }
  }

  async saveSearchQuery(userId: string, query: string, resultCount: number): Promise<void> {
    try {
      await this.prisma.searchHistory.create({
        data: {
          userId,
          query,
          resultCount,
          searchedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn('Failed to save search query:', error);
      // Don't throw error as this is not critical
    }
  }

  async getPopularSearches(limit = 10): Promise<string[]> {
    try {
      const popularSearches = await this.prisma.searchHistory.groupBy({
        by: ['query'],
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: limit,
        where: {
          searchedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      return popularSearches.map(search => search.query);
    } catch (error) {
      this.logger.error('Failed to get popular searches:', error);
      return [];
    }
  }

  async getUserSearchHistory(userId: string, limit = 20): Promise<Array<{ query: string; searchedAt: Date; resultCount: number }>> {
    try {
      const searchHistory = await this.prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { searchedAt: 'desc' },
        take: limit,
        select: {
          query: true,
          searchedAt: true,
          resultCount: true,
        },
      });

      return searchHistory;
    } catch (error) {
      this.logger.error('Failed to get user search history:', error);
      return [];
    }
  }

  private buildSearchConditions(searchQuery: SearchQuery): any {
    const conditions: any = {};

    // Text search conditions
    if (searchQuery.query) {
      conditions.textSearch = {
        search: searchQuery.query,
        mode: 'insensitive',
      };
    }

    // Filter conditions
    const filters = searchQuery.filters;

    if (filters.categories && filters.categories.length > 0) {
      conditions.category = { in: filters.categories };
    }

    if (filters.difficulties && filters.difficulties.length > 0) {
      conditions.difficulty = { in: filters.difficulties };
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.tags = { hasSome: filters.tags };
    }

    if (filters.dateRange) {
      conditions.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    if (filters.hasExplanation !== undefined) {
      if (filters.hasExplanation) {
        conditions.explanation = { not: null };
      } else {
        conditions.explanation = null;
      }
    }

    if (filters.timeToComplete) {
      conditions.estimatedTimeToSolve = {
        gte: filters.timeToComplete.min,
        lte: filters.timeToComplete.max,
      };
    }

    // Add active content filter
    conditions.isActive = true;

    return conditions;
  }

  private async performMultiContentSearch(conditions: any, searchQuery: SearchQuery): Promise<any[]> {
    const results: any[] = [];
    const contentType = searchQuery.filters.contentType || 'ALL';

    // Search questions
    if (contentType === 'QUESTIONS' || contentType === 'ALL') {
      const questionConditions = { ...conditions };
      delete questionConditions.textSearch;

      const questions = await this.prisma.question.findMany({
        where: {
          ...questionConditions,
          OR: searchQuery.query ? [
            { content: { contains: searchQuery.query, mode: 'insensitive' } },
            { explanation: { contains: searchQuery.query, mode: 'insensitive' } },
          ] : undefined,
        },
        include: {
          _count: {
            select: {
              quizQuestions: true,
            },
          },
        },
        take: 1000, // Limit for performance
      });

      results.push(...questions.map(q => ({
        ...q,
        type: 'QUESTION',
        title: q.content.substring(0, 100) + '...',
        popularity: q._count.quizQuestions,
      })));
    }

    // Search flashcards
    if (contentType === 'FLASHCARDS' || contentType === 'ALL') {
      const flashcards = await this.prisma.flashcard.findMany({
        where: {
          ...conditions,
          OR: searchQuery.query ? [
            { front: { contains: searchQuery.query, mode: 'insensitive' } },
            { back: { contains: searchQuery.query, mode: 'insensitive' } },
          ] : undefined,
        },
        include: {
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        take: 1000,
      });

      results.push(...flashcards.map(f => ({
        ...f,
        type: 'FLASHCARD',
        title: f.front,
        content: f.back,
        popularity: f._count.reviews,
      })));
    }

    // Search military jobs
    if (contentType === 'MILITARY_JOBS' || contentType === 'ALL') {
      const jobs = await this.prisma.militaryJob.findMany({
        where: {
          isActive: true,
          branch: searchQuery.filters.branch,
          OR: searchQuery.query ? [
            { title: { contains: searchQuery.query, mode: 'insensitive' } },
            { description: { contains: searchQuery.query, mode: 'insensitive' } },
            { mosCode: { contains: searchQuery.query, mode: 'insensitive' } },
          ] : undefined,
        },
        take: 1000,
      });

      results.push(...jobs.map(j => ({
        ...j,
        type: 'MILITARY_JOB',
        title: `${j.mosCode} - ${j.title}`,
        content: j.description || '',
        popularity: 0, // Would track job interest metrics
      })));
    }

    // Search study groups
    if (contentType === 'STUDY_GROUPS' || contentType === 'ALL') {
      const studyGroups = await this.prisma.studyGroup.findMany({
        where: {
          branch: searchQuery.filters.branch,
          OR: searchQuery.query ? [
            { name: { contains: searchQuery.query, mode: 'insensitive' } },
            { description: { contains: searchQuery.query, mode: 'insensitive' } },
          ] : undefined,
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
        take: 1000,
      });

      results.push(...studyGroups.map(g => ({
        ...g,
        type: 'STUDY_GROUP',
        title: g.name,
        content: g.description || '',
        popularity: g._count.members,
      })));
    }

    return results;
  }

  private calculateRelevanceScores(results: any[], query: string): SearchResultItem[] {
    if (!query) {
      return results.map(result => this.mapToSearchResultItem(result, 1.0, []));
    }

    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    return results.map(result => {
      let relevanceScore = 0;
      const highlights: string[] = [];

      // Title relevance (highest weight)
      const titleScore = this.calculateTextRelevance(result.title || '', queryTerms);
      relevanceScore += titleScore * 3;

      if (titleScore > 0) {
        highlights.push(this.highlightText(result.title || '', queryTerms));
      }

      // Content relevance
      const contentScore = this.calculateTextRelevance(result.content || '', queryTerms);
      relevanceScore += contentScore * 2;

      if (contentScore > 0) {
        highlights.push(this.highlightText(result.content || '', queryTerms, 150));
      }

      // Tag relevance
      if (result.tags) {
        const tagScore = this.calculateArrayRelevance(result.tags, queryTerms);
        relevanceScore += tagScore * 1.5;
      }

      // Category relevance
      if (result.category) {
        const categoryScore = this.calculateTextRelevance(result.category.replace(/_/g, ' '), queryTerms);
        relevanceScore += categoryScore * 1;
      }

      // Popularity boost
      const popularityBoost = Math.min(0.5, (result.popularity || 0) / 100);
      relevanceScore += popularityBoost;

      return this.mapToSearchResultItem(result, relevanceScore, highlights);
    });
  }

  private calculateTextRelevance(text: string, queryTerms: string[]): number {
    if (!text) return 0;

    const textLower = text.toLowerCase();
    let score = 0;

    queryTerms.forEach(term => {
      const termCount = (textLower.match(new RegExp(term, 'g')) || []).length;
      if (termCount > 0) {
        // Exact match bonus
        if (textLower.includes(term)) {
          score += termCount * 0.3;
        }
        // Partial match
        score += termCount * 0.1;
      }
    });

    // Length penalty (shorter texts with matches are more relevant)
    const lengthPenalty = Math.min(0.1, text.length / 1000);
    score = Math.max(0, score - lengthPenalty);

    return Math.min(1, score);
  }

  private calculateArrayRelevance(array: string[], queryTerms: string[]): number {
    if (!array || array.length === 0) return 0;

    let matches = 0;
    queryTerms.forEach(term => {
      if (array.some(item => item.toLowerCase().includes(term))) {
        matches++;
      }
    });

    return matches / queryTerms.length;
  }

  private highlightText(text: string, queryTerms: string[], maxLength = 200): string {
    let highlightedText = text;

    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    // Truncate if necessary
    if (highlightedText.length > maxLength) {
      // Try to keep highlighted portions
      const markIndex = highlightedText.indexOf('<mark>');
      if (markIndex !== -1) {
        const start = Math.max(0, markIndex - 50);
        const end = Math.min(highlightedText.length, start + maxLength);
        highlightedText = '...' + highlightedText.substring(start, end) + '...';
      } else {
        highlightedText = highlightedText.substring(0, maxLength) + '...';
      }
    }

    return highlightedText;
  }

  private mapToSearchResultItem(result: any, relevanceScore: number, highlights: string[]): SearchResultItem {
    return {
      id: result.id,
      type: result.type,
      title: result.title || result.content?.substring(0, 100) + '...' || 'Untitled',
      content: result.content || result.description || '',
      category: result.category,
      difficulty: result.difficulty,
      tags: result.tags || [],
      relevanceScore,
      highlights,
      metadata: {
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        popularity: result.popularity || 0,
        estimatedTime: result.estimatedTimeToSolve || result.estimatedTime,
        branch: result.branch,
      },
    };
  }

  private applySorting(results: SearchResultItem[], sorting: SearchSorting): SearchResultItem[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sorting.field) {
        case 'RELEVANCE':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'DATE':
          comparison = new Date(b.metadata.createdAt || 0).getTime() - new Date(a.metadata.createdAt || 0).getTime();
          break;
        case 'DIFFICULTY':
          const difficultyOrder = { EASY: 1, MEDIUM: 2, HARD: 3 };
          comparison = (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 2) - 
                      (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 2);
          break;
        case 'POPULARITY':
          comparison = (b.metadata.popularity || 0) - (a.metadata.popularity || 0);
          break;
        case 'TIME_TO_COMPLETE':
          comparison = (a.metadata.estimatedTime || 0) - (b.metadata.estimatedTime || 0);
          break;
        default:
          comparison = b.relevanceScore - a.relevanceScore;
      }

      return sorting.order === 'ASC' ? comparison : -comparison;
    });
  }

  private applyPagination(results: SearchResultItem[], pagination: SearchPagination): SearchResultItem[] {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return results.slice(startIndex, endIndex);
  }

  private async generateSearchFacets(conditions: any, searchQuery: SearchQuery): Promise<SearchFacets> {
    // Generate facets based on current search results
    // This would be more sophisticated in production

    const categories = await this.getFacetCounts('category', conditions);
    const difficulties = await this.getFacetCounts('difficulty', conditions);
    const contentTypes = [
      { name: 'QUESTIONS', count: 0 },
      { name: 'FLASHCARDS', count: 0 },
      { name: 'MILITARY_JOBS', count: 0 },
      { name: 'STUDY_GROUPS', count: 0 },
    ];

    return {
      categories: categories.map(c => ({ name: c.name as QuestionCategory, count: c.count })),
      difficulties,
      tags: [], // Would be generated from tag analysis
      contentTypes,
      timeRanges: [
        { name: '< 1 min', count: 0 },
        { name: '1-5 min', count: 0 },
        { name: '5+ min', count: 0 },
      ],
    };
  }

  private async getFacetCounts(field: string, baseConditions: any): Promise<Array<{ name: string; count: number }>> {
    try {
      // This would query the database for facet counts
      // Simplified implementation for demonstration
      return [
        { name: 'ARITHMETIC_REASONING', count: 150 },
        { name: 'MATHEMATICS_KNOWLEDGE', count: 120 },
        { name: 'WORD_KNOWLEDGE', count: 100 },
        { name: 'PARAGRAPH_COMPREHENSION', count: 90 },
      ];
    } catch (error) {
      this.logger.warn(`Failed to generate facet counts for ${field}:`, error);
      return [];
    }
  }

  private async generateSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      // Get related searches
      const relatedSearches = await this.prisma.searchHistory.findMany({
        where: {
          query: {
            contains: query,
            mode: 'insensitive',
          },
        },
        distinct: ['query'],
        take: 5,
        orderBy: {
          searchedAt: 'desc',
        },
      });

      // Generate autocomplete suggestions
      const suggestions = relatedSearches.map(s => s.query);

      // Add common term suggestions
      const commonTerms = [
        'arithmetic reasoning',
        'mathematics knowledge',
        'word knowledge',
        'paragraph comprehension',
        'military jobs',
        'study groups',
      ];

      const matchingTerms = commonTerms.filter(term => 
        term.toLowerCase().includes(query.toLowerCase()) && 
        !suggestions.includes(term)
      );

      return [...suggestions, ...matchingTerms].slice(0, 8);
    } catch (error) {
      this.logger.warn('Failed to generate search suggestions:', error);
      return [];
    }
  }

  private async enrichWithUserInteractions(results: SearchResultItem[], userId: string): Promise<void> {
    try {
      // Get user bookmarks
      const bookmarks = await this.prisma.bookmark.findMany({
        where: {
          userId,
          itemId: { in: results.map(r => r.id) },
        },
      });

      const bookmarkMap = new Map(bookmarks.map(b => [b.itemId, true]));

      // Get user quiz history for accuracy data
      const quizHistory = await this.prisma.quiz.findMany({
        where: {
          userId,
          questions: {
            some: {
              questionId: { in: results.filter(r => r.type === 'QUESTION').map(r => r.id) },
            },
          },
        },
        include: {
          questions: {
            where: {
              questionId: { in: results.filter(r => r.type === 'QUESTION').map(r => r.id) },
            },
          },
        },
      });

      // Build user interaction map
      const interactionMap = new Map<string, any>();

      quizHistory.forEach(quiz => {
        quiz.questions.forEach(q => {
          if (!interactionMap.has(q.questionId)) {
            interactionMap.set(q.questionId, {
              attempts: 0,
              correct: 0,
              totalTime: 0,
              lastAttempted: quiz.completedAt,
            });
          }

          const interaction = interactionMap.get(q.questionId)!;
          interaction.attempts++;
          if (q.isCorrect) interaction.correct++;
          interaction.totalTime += q.timeSpent || 0;
          if (quiz.completedAt && (!interaction.lastAttempted || quiz.completedAt > interaction.lastAttempted)) {
            interaction.lastAttempted = quiz.completedAt;
          }
        });
      });

      // Enrich results with user interaction data
      results.forEach(result => {
        const interaction = interactionMap.get(result.id);
        result.userInteraction = {
          isBookmarked: bookmarkMap.has(result.id),
          lastAttempted: interaction?.lastAttempted,
          accuracy: interaction ? interaction.correct / interaction.attempts : undefined,
          timeSpent: interaction?.totalTime,
        };
      });
    } catch (error) {
      this.logger.warn('Failed to enrich with user interactions:', error);
      // Continue without user interaction data
    }
  }

  private hasMoreResults(allResults: SearchResultItem[], pagination: SearchPagination): boolean {
    const totalPages = Math.ceil(allResults.length / pagination.limit);
    return pagination.page < totalPages;
  }
}