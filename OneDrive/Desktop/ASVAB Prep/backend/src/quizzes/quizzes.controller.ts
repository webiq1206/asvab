import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumGuard } from '../auth/guards/premium.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePremium } from '../auth/decorators/premium.decorator';
import { QuizzesService } from './quizzes.service';
import { 
  CreateQuizDto,
  SubmitQuizAnswerDto,
  CompleteQuizDto,
  QuizHistoryQueryDto,
} from './dto';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new quiz',
    description: 'Create a new quiz with selected parameters. Free users limited to 1 quiz per day, max 10 questions.'
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        category: { type: 'string', nullable: true },
        isASVABReplica: { type: 'boolean' },
        totalQuestions: { type: 'number' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              orderIndex: { type: 'number' },
              question: {
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
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Daily quiz limit reached or insufficient subscription' })
  @ApiResponse({ status: 400, description: 'Invalid quiz parameters' })
  async createQuiz(
    @Body() createQuizDto: CreateQuizDto,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.createQuiz(user.id, user.subscriptionTier, createQuizDto);
  }

  @Post('asvab-replica')
  @RequirePremium()
  @UseGuards(PremiumGuard)
  @ApiOperation({
    summary: 'Create ASVAB replica exam (Premium)',
    description: 'Create full ASVAB replica exam with all 9 sections and proper timing. Premium feature only.'
  })
  @ApiResponse({
    status: 201,
    description: 'ASVAB replica exam created successfully',
  })
  @ApiResponse({ status: 403, description: 'Premium subscription required' })
  async createASVABReplica(
    @Body() body: { title: string; targetScore?: number },
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.createQuiz(user.id, user.subscriptionTier, {
      title: body.title,
      questionCount: 0, // Will be set automatically for ASVAB replica
      isASVABReplica: true,
      targetScore: body.targetScore,
    });
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get quiz history',
    description: 'Get user\'s completed quiz history. Free users limited to last 5 quizzes.'
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        quizzes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              category: { type: 'string', nullable: true },
              isASVABReplica: { type: 'boolean' },
              score: { type: 'number' },
              totalQuestions: { type: 'number' },
              correctAnswers: { type: 'number' },
              timeSpent: { type: 'number' },
              completedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            totalCount: { type: 'number' },
            totalPages: { type: 'number' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getQuizHistory(
    @Query() query: QuizHistoryQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.getQuizHistory(
      user.id,
      user.subscriptionTier,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get quiz details',
    description: 'Get detailed information about a specific quiz including all questions'
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async getQuiz(
    @Param('id') quizId: string,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.getQuiz(quizId, user.id);
  }

  @Post(':id/answers')
  @ApiOperation({
    summary: 'Submit quiz answer',
    description: 'Submit answer for a specific question in the quiz'
  })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
    schema: {
      type: 'object',
      properties: {
        isCorrect: { type: 'boolean' },
        correctAnswer: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Quiz or question not found' })
  async submitQuizAnswer(
    @Param('id') quizId: string,
    @Body() submitAnswerDto: SubmitQuizAnswerDto,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.submitQuizAnswer(quizId, user.id, submitAnswerDto);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete quiz',
    description: 'Mark quiz as completed and get final results with military-style feedback'
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz completed successfully',
    schema: {
      type: 'object',
      properties: {
        quiz: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            score: { type: 'number' },
            totalQuestions: { type: 'number' },
            correctAnswers: { type: 'number' },
            timeSpent: { type: 'number' },
            completedAt: { type: 'string', format: 'date-time' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userAnswer: { type: 'number', nullable: true },
                  isCorrect: { type: 'boolean', nullable: true },
                  question: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      content: { type: 'string' },
                      options: { type: 'array', items: { type: 'string' } },
                      correctAnswer: { type: 'number' },
                      explanationBasic: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        performanceMessage: { type: 'string', description: 'Military-style performance feedback' },
        recommendations: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Study recommendations based on performance' 
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Quiz not found or already completed' })
  async completeQuiz(
    @Param('id') quizId: string,
    @Body() completeQuizDto: CompleteQuizDto,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.completeQuiz(quizId, user.id, completeQuizDto);
  }
}