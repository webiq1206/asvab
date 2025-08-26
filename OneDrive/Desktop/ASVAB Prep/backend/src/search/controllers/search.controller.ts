import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdvancedSearchService, SearchQuery, SearchFilters, SearchSorting } from '../services/advanced-search.service';
import { SemanticSearchService } from '../services/semantic-search.service';
import { SearchAnalyticsService } from '../services/search-analytics.service';
import { QuestionCategory, MilitaryBranch } from '@prisma/client';

@ApiTags('Advanced Search & Discovery')
@Controller('search')
export class SearchController {
  constructor(
    private readonly advancedSearchService: AdvancedSearchService,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly searchAnalyticsService: SearchAnalyticsService,
  ) {}

  @Post('advanced')
  @ApiOperation({ summary: 'Perform advanced search across all content types' })
  @ApiResponse({ status: 200, description: 'Advanced search results returned successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async advancedSearch(@Request() req, @Body() searchRequest: {
    query: string;
    filters?: Partial<SearchFilters>;
    sorting?: Partial<SearchSorting>;
    page?: number;
    limit?: number;
  }) {
    const searchQuery: SearchQuery = {
      query: searchRequest.query,
      filters: {
        contentType: 'ALL',
        ...searchRequest.filters,
      },
      sorting: {
        field: 'RELEVANCE',
        order: 'DESC',
        ...searchRequest.sorting,
      },
      pagination: {
        page: searchRequest.page || 1,
        limit: Math.min(searchRequest.limit || 20, 100),
      },
      userId: req.user?.sub,
    };

    const results = await this.advancedSearchService.executeAdvancedSearch(searchQuery);

    // Save search query for analytics
    if (req.user?.sub) {
      await this.advancedSearchService.saveSearchQuery(
        req.user.sub,
        searchRequest.query,
        results.totalCount
      );
    }

    return results;
  }

  @Get('semantic')
  @ApiOperation({ summary: 'Perform semantic search using AI-powered understanding' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'category', required: false, enum: QuestionCategory })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Semantic search results returned successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async semanticSearch(
    @Request() req,
    @Query('query') query: string,
    @Query('category') category?: QuestionCategory,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.semanticSearchService.performSemanticSearch(
      query,
      req.user.sub,
      {
        category,
        limit: Math.min(limit || 10, 50),
      }
    );
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions and autocomplete' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Search suggestions returned successfully' })
  async getSearchSuggestions(@Query('query') query: string) {
    const suggestions = await this.advancedSearchService.generateSearchSuggestions(query);
    return { suggestions };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular and trending searches' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Popular searches returned successfully' })
  async getPopularSearches(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number) {
    const popularSearches = await this.advancedSearchService.getPopularSearches(limit);
    return { popularSearches };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user search history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search history returned successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getUserSearchHistory(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const searchHistory = await this.advancedSearchService.getUserSearchHistory(req.user.sub, limit);
    return { searchHistory };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get search analytics and insights' })
  @ApiResponse({ status: 200, description: 'Search analytics returned successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getSearchAnalytics(@Request() req) {
    return this.searchAnalyticsService.getUserSearchAnalytics(req.user.sub);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Provide feedback on search results quality' })
  @ApiResponse({ status: 200, description: 'Search feedback recorded successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async submitSearchFeedback(
    @Request() req,
    @Body() feedback: {
      query: string;
      resultId: string;
      rating: number; // 1-5 scale
      feedback?: string;
      wasHelpful: boolean;
    },
  ) {
    await this.searchAnalyticsService.recordSearchFeedback(req.user.sub, feedback);
    return { success: true, message: 'Feedback recorded successfully' };
  }

  @Get('similar/:itemId')
  @ApiOperation({ summary: 'Find similar content based on an item' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Similar content found successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findSimilarContent(
    @Request() req,
    @Query('itemId') itemId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.semanticSearchService.findSimilarContent(
      itemId,
      req.user.sub,
      { limit: Math.min(limit || 10, 20) }
    );
  }
}