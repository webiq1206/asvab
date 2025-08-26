import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get dashboard data',
    description: 'Retrieve comprehensive dashboard data including progress, AFQT score, daily orders, and analytics'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        greeting: { type: 'string', example: 'Good morning, Soldier! Outstanding ASVAB readiness! HOOAH!' },
        afqtScore: { type: 'number', example: 75 },
        readinessPercentage: { type: 'number', example: 82 },
        categoryPerformance: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              displayName: { type: 'string' },
              score: { type: 'number' },
              questionsAnswered: { type: 'number' },
              accuracy: { type: 'number' },
              level: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'NEEDS_WORK', 'CRITICAL'] },
              color: { type: 'string' },
              isAFQT: { type: 'boolean' },
            },
          },
        },
        dailyOrders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
              category: { type: 'string', nullable: true },
              completed: { type: 'boolean' },
              dueTime: { type: 'string', nullable: true },
              points: { type: 'number' },
            },
          },
        },
        studyStreak: {
          type: 'object',
          properties: {
            currentStreak: { type: 'number' },
            longestStreak: { type: 'number' },
            lastStudyDate: { type: 'string' },
            streakActive: { type: 'boolean' },
            nextMilestone: { type: 'number' },
          },
        },
        quickStats: {
          type: 'object',
          properties: {
            totalQuestions: { type: 'number' },
            correctAnswers: { type: 'number' },
            avgScore: { type: 'number' },
            hoursStudied: { type: 'number' },
            quizzesCompleted: { type: 'number' },
            rank: { type: 'string' },
          },
        },
        recentActivity: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['QUESTION', 'QUIZ', 'ACHIEVEMENT', 'STREAK'] },
              title: { type: 'string' },
              description: { type: 'string' },
              timestamp: { type: 'string' },
              category: { type: 'string', nullable: true },
              score: { type: 'number', nullable: true },
            },
          },
        },
      },
    },
  })
  async getDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getDashboardData(user.id, user.selectedBranch);
  }

  @Post('study-streak')
  @ApiOperation({
    summary: 'Update study streak',
    description: 'Update user study streak when they complete any study activity'
  })
  @ApiResponse({
    status: 200,
    description: 'Study streak updated successfully',
    schema: {
      type: 'object',
      properties: {
        currentStreak: { type: 'number' },
        longestStreak: { type: 'number' },
        lastStudyDate: { type: 'string' },
        streakActive: { type: 'boolean' },
        nextMilestone: { type: 'number' },
      },
    },
  })
  async updateStudyStreak(@CurrentUser() user: any) {
    return this.dashboardService.updateStudyStreak(user.id);
  }

  @Post('daily-orders/:orderId/complete')
  @ApiOperation({
    summary: 'Complete daily order',
    description: 'Mark a daily order as completed'
  })
  @ApiResponse({
    status: 200,
    description: 'Daily order marked as completed',
  })
  async completeDailyOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    // This would update the daily order completion status
    // For now, return success
    return { success: true, message: 'Daily order completed!' };
  }

  @Post('export')
  @ApiOperation({
    summary: 'Export progress report',
    description: 'Generate and export progress report in PDF or CSV format'
  })
  @ApiResponse({
    status: 200,
    description: 'Export generated successfully',
    schema: {
      type: 'object',
      properties: {
        downloadUrl: { type: 'string', example: 'https://api.example.com/exports/user-progress.pdf' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async exportProgress(
    @Query('format') format: 'PDF' | 'CSV' = 'PDF',
    @CurrentUser() user: any,
  ) {
    const downloadUrl = await this.dashboardService.exportProgress(user.id, user.selectedBranch, format);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    return {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get historical data',
    description: 'Get historical progress data for charts and analytics'
  })
  @ApiResponse({
    status: 200,
    description: 'Historical data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dailyScores: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              score: { type: 'number' },
              questionsAnswered: { type: 'number' },
            },
          },
        },
        categoryTrends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    score: { type: 'number' },
                  },
                },
              },
            },
          },
        },
        afqtHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              afqtScore: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getHistoricalData(
    @Query('days') days: number = 30,
    @CurrentUser() user: any,
  ) {
    // This would return historical data for charts
    // For now, return mock data
    const today = new Date();
    const mockData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        score: Math.floor(Math.random() * 40) + 60, // Random score 60-100
        questionsAnswered: Math.floor(Math.random() * 20) + 5,
      });
    }

    return {
      dailyScores: mockData,
      categoryTrends: [], // Would include category-specific trends
      afqtHistory: [], // Would include AFQT score over time
    };
  }
}