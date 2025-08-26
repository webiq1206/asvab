import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumGuard } from '../auth/guards/premium.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePremium } from '../auth/decorators/premium.decorator';
import { QuestionsService } from './questions.service';
import { QuestionImportService } from './question-import.service';
import {
  GetQuestionsDto,
  SubmitAnswerDto,
  SearchQuestionsDto,
  RandomQuestionsDto,
} from './dto';

@ApiTags('Questions')
@Controller('questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(
    private questionsService: QuestionsService,
    private questionImportService: QuestionImportService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get standardized ASVAB questions',
    description: 'Retrieve ASVAB questions (standardized across all branches) based on subscription tier'
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              category: { type: 'string' },
              difficulty: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        totalCount: { type: 'number' },
        hasMore: { type: 'boolean' },
        remainingQuestions: { type: 'number', description: '-1 for unlimited' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Question limit reached' })
  async getQuestions(
    @Query() query: GetQuestionsDto,
    @CurrentUser() user: any,
  ) {
    return this.questionsService.getQuestions(
      { ...query, userId: user.id },
      user.subscriptionTier,
    );
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get ASVAB categories',
    description: 'Get all ASVAB question categories (standardized across branches)'
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          questionCount: { type: 'number' },
        },
      },
    },
  })
  async getCategories(@CurrentUser() user: any) {
    return this.questionsService.getCategories();
  }

  @Get('random')
  @ApiOperation({
    summary: 'Get random ASVAB questions',
    description: 'Get random standardized ASVAB questions with optional filters'
  })
  @ApiResponse({
    status: 200,
    description: 'Random questions retrieved successfully',
  })
  async getRandomQuestions(
    @Query() query: RandomQuestionsDto,
    @CurrentUser() user: any,
  ) {
    return this.questionsService.getRandomQuestions(
      query.count,
      query.category,
      query.difficulty,
    );
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search ASVAB questions',
    description: 'Search standardized ASVAB questions by content or tags'
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async searchQuestions(
    @Query() query: SearchQuestionsDto,
    @CurrentUser() user: any,
  ) {
    return this.questionsService.searchQuestions(
      query.searchTerm,
      query.limit,
    );
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Get user progress',
    description: 'Get user\'s progress across all ASVAB categories'
  })
  @ApiResponse({
    status: 200,
    description: 'Progress retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          totalQuestions: { type: 'number' },
          correctAnswers: { type: 'number' },
          averageScore: { type: 'number' },
          bestScore: { type: 'number' },
          lastStudied: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  async getUserProgress(@CurrentUser() user: any) {
    return this.questionsService.getUserProgress(user.id);
  }

  @Get('session')
  @ApiOperation({
    summary: 'Get active question session',
    description: 'Get user\'s current active question session if any exists'
  })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
  })
  async getQuestionSession(@CurrentUser() user: any) {
    return this.questionsService.getQuestionSession(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get question by ID',
    description: 'Get specific question details with explanations based on subscription tier'
  })
  @ApiResponse({
    status: 200,
    description: 'Question retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        content: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
        category: { type: 'string' },
        difficulty: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        correctAnswer: { type: 'number' },
        explanation: { type: 'string' },
        isPremiumExplanation: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async getQuestionById(
    @Param('id') questionId: string,
    @CurrentUser() user: any,
  ) {
    return this.questionsService.getQuestionById(
      questionId,
      user.subscriptionTier,
    );
  }

  @Post(':id/answer')
  @ApiOperation({
    summary: 'Submit answer to question',
    description: 'Submit user answer and get immediate feedback with basic explanation'
  })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
    schema: {
      type: 'object',
      properties: {
        isCorrect: { type: 'boolean' },
        correctAnswer: { type: 'number' },
        explanation: { type: 'string' },
        attemptId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async submitAnswer(
    @Param('id') questionId: string,
    @Body() submitAnswerDto: SubmitAnswerDto,
    @CurrentUser() user: any,
  ) {
    return this.questionsService.submitAnswer(
      questionId,
      submitAnswerDto.userAnswer,
      user.id,
    );
  }

  // Admin endpoint to import questions (would typically be protected with admin guard)
  @Post('import')
  @RequirePremium()
  @UseGuards(PremiumGuard)
  @ApiOperation({
    summary: 'Import ASVAB questions (Admin)',
    description: 'Import the comprehensive ASVAB question database'
  })
  @ApiResponse({
    status: 201,
    description: 'Questions imported successfully',
    schema: {
      type: 'object',
      properties: {
        imported: { type: 'number' },
        total: { type: 'number' },
      },
    },
  })
  async importQuestions() {
    return this.questionImportService.importQuestions();
  }
}