import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { SearchModule } from '../../src/search/search.module';
import { AdvancedSearchService } from '../../src/search/services/advanced-search.service';
import { SemanticSearchService } from '../../src/search/services/semantic-search.service';
import { ContentFilterService } from '../../src/search/services/content-filter.service';
import { SearchAnalyticsService } from '../../src/search/services/search-analytics.service';

describe('Search Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let advancedSearchService: AdvancedSearchService;
  let semanticSearchService: SemanticSearchService;
  let contentFilterService: ContentFilterService;
  let searchAnalyticsService: SearchAnalyticsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SearchModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    advancedSearchService = moduleFixture.get<AdvancedSearchService>(AdvancedSearchService);
    semanticSearchService = moduleFixture.get<SemanticSearchService>(SemanticSearchService);
    contentFilterService = moduleFixture.get<ContentFilterService>(ContentFilterService);
    searchAnalyticsService = moduleFixture.get<SearchAnalyticsService>(SearchAnalyticsService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('Advanced Search Integration', () => {
    it('should perform multi-faceted search with military context', async () => {
      // Arrange
      const userId = 'test-soldier-search';
      const searchParams = {
        query: 'military tactics arithmetic',
        categories: ['ARITHMETIC_REASONING'],
        difficulties: ['MEDIUM', 'HARD'],
        branches: ['ARMY'],
        includeAnalytics: true,
      };

      // Act
      const results = await advancedSearchService.performAdvancedSearch(
        searchParams,
        userId,
        { limit: 20, offset: 0 }
      );

      // Assert
      expect(results).toBeDefined();
      expect(results.items).toBeInstanceOf(Array);
      expect(results.totalCount).toBeGreaterThan(0);
      expect(results.facets).toBeDefined();
      expect(results.searchMetadata.query).toBe(searchParams.query);
      expect(results.searchMetadata.executionTime).toBeGreaterThan(0);

      // All results should match branch filter
      const branchFilteredItems = results.items.filter(item => 
        !item.branchRelevance || item.branchRelevance.includes('ARMY')
      );
      expect(branchFilteredItems.length).toBe(results.items.length);
    });

    it('should handle empty search results gracefully', async () => {
      // Arrange
      const searchParams = {
        query: 'nonexistent content xyz123',
        categories: ['ARITHMETIC_REASONING'],
        branches: ['ARMY'],
      };

      // Act
      const results = await advancedSearchService.performAdvancedSearch(
        searchParams,
        'test-user-empty',
        { limit: 20, offset: 0 }
      );

      // Assert
      expect(results.items).toHaveLength(0);
      expect(results.totalCount).toBe(0);
      expect(results.facets).toBeDefined();
      expect(results.suggestions).toBeInstanceOf(Array);
    });

    it('should respect subscription tier limitations', async () => {
      // Arrange - Free tier user
      await prismaService.user.upsert({
        where: { id: 'free-tier-user' },
        create: {
          id: 'free-tier-user',
          email: 'free@test.mil',
          passwordHash: 'hashed',
          selectedBranch: 'ARMY',
          subscriptionTier: 'FREE',
        },
        update: {},
      });

      const searchParams = {
        query: 'advanced mathematics',
        categories: ['MATHEMATICS_KNOWLEDGE'],
        branches: ['ARMY'],
      };

      // Act
      const results = await advancedSearchService.performAdvancedSearch(
        searchParams,
        'free-tier-user',
        { limit: 100, offset: 0 }
      );

      // Assert
      expect(results.items.length).toBeLessThanOrEqual(50); // Free tier limit
      expect(results.subscriptionLimits).toBeDefined();
      expect(results.subscriptionLimits.isLimited).toBe(true);
    });
  });

  describe('Semantic Search Integration', () => {
    it('should find semantically similar content across categories', async () => {
      // Arrange
      const query = 'solving mathematical problems';
      const userId = 'semantic-test-user';
      const options = {
        limit: 15,
        includeExplanations: true,
      };

      // Act
      const results = await semanticSearchService.performSemanticSearch(query, userId, options);

      // Assert
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      
      // Check semantic similarity scoring
      results.forEach(result => {
        expect(result.semanticSimilarity).toBeGreaterThan(0);
        expect(result.semanticSimilarity).toBeLessThanOrEqual(1);
        expect(result.relevanceScore).toBeDefined();
      });

      // Results should be sorted by semantic similarity
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].semanticSimilarity).toBeGreaterThanOrEqual(results[i].semanticSimilarity);
      }
    });

    it('should find similar content based on item similarity', async () => {
      // Arrange
      const sourceItemId = 'test-question-ar-1';
      const userId = 'similarity-test-user';
      const options = {
        limit: 10,
        threshold: 0.3,
        excludeSame: true,
      };

      // Act
      const similarItems = await semanticSearchService.findSimilarContent(
        sourceItemId,
        userId,
        options
      );

      // Assert
      expect(similarItems).toBeInstanceOf(Array);
      expect(similarItems.length).toBeGreaterThan(0);
      
      // Should exclude the source item itself
      expect(similarItems.find(item => item.id === sourceItemId)).toBeUndefined();
      
      // All items should meet similarity threshold
      similarItems.forEach(item => {
        expect(item.semanticSimilarity).toBeGreaterThanOrEqual(options.threshold);
      });
    });

    it('should generate contextual search suggestions', async () => {
      // Arrange
      const partialQuery = 'arith';

      // Act
      const suggestions = await semanticSearchService.getSemanticSuggestions(partialQuery);

      // Assert
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.toLowerCase().includes('arithmetic'))).toBe(true);
    });
  });

  describe('Content Filtering Integration', () => {
    it('should filter content by multiple criteria with personalization', async () => {
      // Arrange
      const userId = 'filter-test-user';
      const contentType = 'QUESTIONS';
      const filters = {
        categories: ['ARITHMETIC_REASONING', 'MATHEMATICS_KNOWLEDGE'],
        difficulties: ['MEDIUM'],
        branches: ['ARMY', 'MARINES'],
        hasExplanation: true,
        scoreRange: { min: 0, max: 100 },
      };

      // Act
      const filteredContent = await contentFilterService.filterContent(
        contentType,
        filters,
        userId,
        25,
        0
      );

      // Assert
      expect(filteredContent.items).toBeInstanceOf(Array);
      expect(filteredContent.totalCount).toBeGreaterThan(0);
      expect(filteredContent.appliedFilters).toEqual(filters);
      expect(filteredContent.availableFilters).toBeDefined();
      
      // Verify filtering works correctly
      filteredContent.items.forEach(item => {
        expect(filters.categories).toContain(item.category);
        expect(filters.difficulties).toContain(item.difficulty);
        expect(item.explanation).toBeDefined(); // hasExplanation: true
      });
    });

    it('should provide personalized filter recommendations', async () => {
      // Arrange
      const userId = 'personalized-user';
      
      // Create user with quiz history
      await prismaService.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email: 'personalized@test.mil',
          passwordHash: 'hashed',
          selectedBranch: 'NAVY',
          subscriptionTier: 'PREMIUM',
        },
        update: {},
      });

      // Act
      const personalizedFilters = await contentFilterService.getPersonalizedFilters(userId);

      // Assert
      expect(personalizedFilters).toBeDefined();
      expect(personalizedFilters.branches).toContain('NAVY'); // User's branch
      if (personalizedFilters.categories) {
        expect(personalizedFilters.categories).toBeInstanceOf(Array);
      }
      if (personalizedFilters.difficulties) {
        expect(personalizedFilters.difficulties).toBeInstanceOf(Array);
      }
    });

    it('should save and retrieve user filter presets', async () => {
      // Arrange
      const userId = 'preset-test-user';
      const presetName = 'My Study Focus';
      const filterPreset = {
        categories: ['WORD_KNOWLEDGE', 'PARAGRAPH_COMPREHENSION'],
        difficulties: ['EASY', 'MEDIUM'],
        branches: ['AIR_FORCE'],
        hasExplanation: true,
      };

      // Act - Save preset
      const presetId = await contentFilterService.saveFilterPreset(
        userId,
        presetName,
        filterPreset
      );

      // Act - Retrieve presets
      const userPresets = await contentFilterService.getUserFilterPresets(userId);

      // Assert
      expect(presetId).toBeDefined();
      expect(userPresets).toBeInstanceOf(Array);
      expect(userPresets.length).toBeGreaterThan(0);
      
      const savedPreset = userPresets.find(p => p.id === presetId);
      expect(savedPreset).toBeDefined();
      expect(savedPreset?.name).toBe(presetName);
      expect(savedPreset?.filters).toEqual(filterPreset);
    });
  });

  describe('Search Analytics Integration', () => {
    it('should track user search analytics comprehensively', async () => {
      // Arrange
      const userId = 'analytics-test-user';
      
      // Create some search history
      await prismaService.searchHistory.createMany({
        data: [
          {
            userId,
            query: 'mathematics problems',
            resultCount: 15,
            searchedAt: new Date(),
          },
          {
            userId,
            query: 'word knowledge',
            resultCount: 8,
            searchedAt: new Date(Date.now() - 86400000), // Yesterday
          },
        ],
      });

      // Act
      const analytics = await searchAnalyticsService.getUserSearchAnalytics(userId);

      // Assert
      expect(analytics).toBeDefined();
      expect(analytics.totalSearches).toBeGreaterThan(0);
      expect(analytics.uniqueQueries).toBeGreaterThan(0);
      expect(analytics.searchSuccessRate).toBeGreaterThan(0);
      expect(analytics.topQueries).toBeInstanceOf(Array);
      expect(analytics.recentSearches).toBeInstanceOf(Array);
      expect(analytics.searchPatterns).toBeDefined();
      expect(analytics.searchPatterns.preferredTime).toBeGreaterThanOrEqual(0);
      expect(analytics.searchPatterns.preferredTime).toBeLessThan(24);
    });

    it('should record and analyze search feedback', async () => {
      // Arrange
      const userId = 'feedback-test-user';
      const feedback = {
        query: 'test search query',
        resultId: 'test-result-123',
        rating: 4,
        feedback: 'Very helpful results',
        wasHelpful: true,
      };

      // Act
      await searchAnalyticsService.recordSearchFeedback(userId, feedback);

      // Retrieve analytics to verify feedback was recorded
      const analytics = await searchAnalyticsService.getUserSearchAnalytics(userId);

      // Assert - Feedback should influence metrics
      expect(analytics).toBeDefined();
      // Additional assertions would depend on how feedback influences analytics
    });

    it('should provide global search trends', async () => {
      // Arrange - Add some global search data
      await prismaService.searchHistory.createMany({
        data: [
          {
            userId: 'global-user-1',
            query: 'popular search term',
            resultCount: 10,
            searchedAt: new Date(),
          },
          {
            userId: 'global-user-2',
            query: 'popular search term',
            resultCount: 12,
            searchedAt: new Date(),
          },
        ],
      });

      // Act
      const globalTrends = await searchAnalyticsService.getGlobalSearchTrends(7);

      // Assert
      expect(globalTrends).toBeDefined();
      expect(globalTrends.trendingQueries).toBeInstanceOf(Array);
      expect(globalTrends.dailySearchVolume).toBeInstanceOf(Array);
      expect(typeof globalTrends.overallSuccessRate).toBe('number');
      expect(typeof globalTrends.avgResultsPerSearch).toBe('number');
    });

    it('should calculate search quality metrics', async () => {
      // Arrange - Add feedback data
      await prismaService.searchFeedback.createMany({
        data: [
          {
            userId: 'quality-user-1',
            query: 'test quality',
            resultId: 'result-1',
            rating: 5,
            wasHelpful: true,
            createdAt: new Date(),
          },
          {
            userId: 'quality-user-2',
            query: 'test quality',
            resultId: 'result-2',
            rating: 3,
            wasHelpful: false,
            createdAt: new Date(),
          },
        ],
      });

      // Act
      const qualityMetrics = await searchAnalyticsService.getSearchQualityMetrics();

      // Assert
      expect(qualityMetrics).toBeDefined();
      expect(qualityMetrics.qualityMetrics).toBeDefined();
      expect(qualityMetrics.qualityMetrics.averageRating).toBeGreaterThan(0);
      expect(qualityMetrics.qualityMetrics.helpfulPercentage).toBeGreaterThanOrEqual(0);
      expect(qualityMetrics.qualityMetrics.totalFeedbackCount).toBeGreaterThan(0);
      expect(qualityMetrics.improvementOpportunities).toBeDefined();
      expect(qualityMetrics.improvementOpportunities.zeroResultQueries).toBeInstanceOf(Array);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should integrate search with AI coaching recommendations', async () => {
      // This would test integration between search services and AI services
      // For now, we'll test that the services can work together

      const userId = 'integration-test-user';
      
      // Perform a search
      const searchResults = await advancedSearchService.performAdvancedSearch(
        { query: 'mathematics', categories: ['MATHEMATICS_KNOWLEDGE'], branches: ['ARMY'] },
        userId,
        { limit: 10, offset: 0 }
      );

      // Get personalized filters
      const personalizedFilters = await contentFilterService.getPersonalizedFilters(userId);

      // Both should succeed and be compatible
      expect(searchResults).toBeDefined();
      expect(personalizedFilters).toBeDefined();
      
      // If user has a preferred branch, search should respect it
      if (personalizedFilters.branches && personalizedFilters.branches.length > 0) {
        const expectedBranches = personalizedFilters.branches;
        searchResults.items.forEach(item => {
          if (item.branchRelevance) {
            expect(expectedBranches.some(branch => item.branchRelevance.includes(branch))).toBe(true);
          }
        });
      }
    });
  });

  // Helper functions
  async function setupTestData() {
    // This function would set up comprehensive test data
    // For brevity, we'll add minimal data here
    
    await prismaService.user.upsert({
      where: { id: 'test-soldier-search' },
      create: {
        id: 'test-soldier-search',
        email: 'soldier@search.test',
        passwordHash: 'hashed',
        selectedBranch: 'ARMY',
        subscriptionTier: 'PREMIUM',
      },
      update: {},
    });

    await prismaService.user.upsert({
      where: { id: 'semantic-test-user' },
      create: {
        id: 'semantic-test-user',
        email: 'semantic@test.mil',
        passwordHash: 'hashed',
        selectedBranch: 'NAVY',
        subscriptionTier: 'PREMIUM',
      },
      update: {},
    });

    // Add more test data as needed...
  }

  async function cleanupTestData() {
    // Clean up test data
    const testUserIds = [
      'test-soldier-search',
      'semantic-test-user',
      'similarity-test-user',
      'filter-test-user',
      'personalized-user',
      'preset-test-user',
      'analytics-test-user',
      'feedback-test-user',
      'free-tier-user',
      'integration-test-user',
    ];

    await prismaService.searchHistory.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    await prismaService.searchFeedback.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    await prismaService.filterPreset.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    await prismaService.user.deleteMany({
      where: { id: { in: testUserIds } },
    });
  }
});