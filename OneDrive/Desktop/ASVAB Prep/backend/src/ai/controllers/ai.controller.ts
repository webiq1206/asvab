import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  DefaultValuePipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AICoachingService } from '../services/ai-coaching.service';
import { AdaptiveLearningService, QuestionSequenceConfig } from '../services/adaptive-learning.service';
import { SmartNotificationService, NotificationStrategy } from '../services/smart-notification.service';
import { PerformancePredictionService } from '../services/performance-prediction.service';
import { ContentGenerationService } from '../services/content-generation.service';
import { QuestionCategory } from '@prisma/client';

@ApiTags('AI & Machine Learning')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiCoachingService: AICoachingService,
    private readonly adaptiveLearningService: AdaptiveLearningService,
    private readonly smartNotificationService: SmartNotificationService,
    private readonly performancePredictionService: PerformancePredictionService,
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  @Get('coaching/personalized')
  @ApiOperation({ summary: 'Get personalized AI coaching recommendations' })
  @ApiResponse({ status: 200, description: 'Personalized coaching data retrieved successfully' })
  async getPersonalizedCoaching(@Request() req) {
    return this.aiCoachingService.generatePersonalizedCoaching(req.user.sub);
  }

  @Get('coaching/difficulty-adjustment/:category')
  @ApiOperation({ summary: 'Get adaptive difficulty adjustment for a category' })
  @ApiResponse({ status: 200, description: 'Difficulty adjustment calculated successfully' })
  async getDifficultyAdjustment(
    @Request() req,
    @Param('category', new ParseEnumPipe(QuestionCategory)) category: QuestionCategory,
  ) {
    return this.aiCoachingService.getAdaptiveDifficultyAdjustment(req.user.sub, category);
  }

  @Post('learning/question-sequence')
  @ApiOperation({ summary: 'Generate intelligent question sequence' })
  @ApiResponse({ status: 200, description: 'Question sequence generated successfully' })
  async generateQuestionSequence(
    @Request() req,
    @Body() config: Omit<QuestionSequenceConfig, 'userId'>,
  ) {
    const fullConfig: QuestionSequenceConfig = {
      ...config,
      userId: req.user.sub,
    };
    return this.adaptiveLearningService.generateIntelligentQuestionSequence(fullConfig);
  }

  @Get('learning/learning-path')
  @ApiOperation({ summary: 'Generate personalized learning path' })
  @ApiResponse({ status: 200, description: 'Learning path generated successfully' })
  async generateLearningPath(@Request() req) {
    return this.adaptiveLearningService.generatePersonalizedLearningPath(req.user.sub);
  }

  @Post('learning/update-model')
  @ApiOperation({ summary: 'Update learning model with user interaction' })
  @ApiResponse({ status: 200, description: 'Learning model updated successfully' })
  async updateLearningModel(
    @Request() req,
    @Body() interactionData: {
      questionId: string;
      wasCorrect: boolean;
      timeSpent: number;
    },
  ) {
    await this.adaptiveLearningService.updateLearningModel(
      req.user.sub,
      interactionData.questionId,
      interactionData.wasCorrect,
      interactionData.timeSpent,
    );
    return { success: true, message: 'Learning model updated' };
  }

  @Get('notifications/intelligent')
  @ApiOperation({ summary: 'Get intelligent notifications for user' })
  @ApiResponse({ status: 200, description: 'Intelligent notifications generated successfully' })
  async getIntelligentNotifications(@Request() req) {
    return this.smartNotificationService.generateIntelligentNotifications(req.user.sub);
  }

  @Put('notifications/strategy')
  @ApiOperation({ summary: 'Update notification strategy preferences' })
  @ApiResponse({ status: 200, description: 'Notification strategy updated successfully' })
  async updateNotificationStrategy(
    @Request() req,
    @Body() strategy: Partial<NotificationStrategy>,
  ) {
    await this.smartNotificationService.updateNotificationStrategy(req.user.sub, strategy);
    return { success: true, message: 'Notification strategy updated' };
  }

  @Get('prediction/asvab-performance')
  @ApiOperation({ summary: 'Predict ASVAB performance based on current progress' })
  @ApiResponse({ status: 200, description: 'ASVAB performance prediction generated successfully' })
  async predictASVABPerformance(@Request() req) {
    return this.performancePredictionService.predictASVABPerformance(req.user.sub);
  }

  @Get('prediction/learning-progress')
  @ApiOperation({ summary: 'Analyze learning progress and patterns' })
  @ApiResponse({ status: 200, description: 'Learning progress analysis completed successfully' })
  async analyzeLearningProgress(@Request() req) {
    return this.performancePredictionService.analyzeLearningProgress(req.user.sub);
  }

  @Get('prediction/competitive-analysis')
  @ApiOperation({ summary: 'Generate competitive analysis compared to peers' })
  @ApiResponse({ status: 200, description: 'Competitive analysis generated successfully' })
  async generateCompetitiveAnalysis(@Request() req) {
    return this.performancePredictionService.generateCompetitiveAnalysis(req.user.sub);
  }

  @Post('content/generate-question')
  @ApiOperation({ summary: 'Generate AI-powered question based on user needs' })
  @ApiResponse({ status: 201, description: 'Question generated successfully' })
  async generateQuestion(
    @Request() req,
    @Body() requestData: {
      category: QuestionCategory;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      topic?: string;
      militaryContext?: boolean;
    },
  ) {
    return this.contentGenerationService.generateQuestion(req.user.sub, requestData);
  }

  @Post('content/generate-explanation')
  @ApiOperation({ summary: 'Generate detailed explanation for a question' })
  @ApiResponse({ status: 200, description: 'Explanation generated successfully' })
  async generateExplanation(
    @Request() req,
    @Body() requestData: {
      questionId: string;
      userAnswer?: string;
      includeStrategy?: boolean;
    },
  ) {
    return this.contentGenerationService.generateExplanation(req.user.sub, requestData);
  }

  @Post('content/generate-study-plan')
  @ApiOperation({ summary: 'Generate comprehensive study plan based on user performance' })
  @ApiResponse({ status: 200, description: 'Study plan generated successfully' })
  async generateStudyPlan(
    @Request() req,
    @Body() requestData: {
      targetScore: number;
      timeframe: number; // weeks
      focusAreas?: QuestionCategory[];
      studyHoursPerWeek?: number;
    },
  ) {
    return this.contentGenerationService.generateStudyPlan(req.user.sub, requestData);
  }

  @Get('insights/performance-summary')
  @ApiOperation({ summary: 'Get AI-generated performance insights and recommendations' })
  @ApiResponse({ status: 200, description: 'Performance insights generated successfully' })
  async getPerformanceInsights(@Request() req) {
    // Combine multiple AI services for comprehensive insights
    const [coaching, prediction, progress] = await Promise.all([
      this.aiCoachingService.generatePersonalizedCoaching(req.user.sub),
      this.performancePredictionService.predictASVABPerformance(req.user.sub),
      this.performancePredictionService.analyzeLearningProgress(req.user.sub),
    ]);

    return {
      coaching: {
        greetingMessage: coaching.greetingMessage,
        motivationalMessage: coaching.motivationalMessage,
        dailyGoal: coaching.dailyGoal,
        topRecommendations: coaching.recommendations.slice(0, 3),
      },
      prediction: {
        predictedAFQT: prediction.predictedAFQT,
        readinessLevel: prediction.readinessLevel,
        keyInsights: prediction.keyInsights,
        timeUntilReady: prediction.recommendedStudyTime,
      },
      progress: {
        learningVelocity: progress.learningVelocity,
        nextMilestone: progress.nextMilestone,
        optimalStudyLoad: progress.optimalStudyLoad,
        riskFactors: {
          plateau: progress.plateauRisk,
          burnout: progress.burnoutRisk,
        },
      },
      generatedAt: new Date(),
    };
  }

  @Get('recommendations/daily-mission')
  @ApiOperation({ summary: 'Get daily mission recommendations with AI optimization' })
  @ApiResponse({ status: 200, description: 'Daily mission recommendations generated successfully' })
  async getDailyMission(@Request() req) {
    // Generate adaptive daily mission based on multiple AI factors
    const [coaching, learningPath, difficulty] = await Promise.all([
      this.aiCoachingService.generatePersonalizedCoaching(req.user.sub),
      this.adaptiveLearningService.generatePersonalizedLearningPath(req.user.sub),
      this.aiCoachingService.getAdaptiveDifficultyAdjustment(
        req.user.sub,
        QuestionCategory.ARITHMETIC_REASONING // Default category
      ),
    ]);

    // Generate intelligent question sequence for the day
    const questionSequence = await this.adaptiveLearningService.generateIntelligentQuestionSequence({
      userId: req.user.sub,
      category: learningPath.sequence[0], // Start with highest priority category
      targetAccuracy: 0.75,
      maxQuestions: coaching.dailyGoal.questionsToComplete,
      adaptiveDifficulty: true,
    });

    return {
      missionBrief: {
        title: `Daily Mission: ${learningPath.sequence[0].replace(/_/g, ' ').toLowerCase()} mastery`,
        description: coaching.motivationalMessage,
        estimatedTime: coaching.dailyGoal.timeToSpend,
        difficulty: difficulty.currentLevel,
      },
      objectives: {
        questionsToComplete: coaching.dailyGoal.questionsToComplete,
        targetAccuracy: 0.75,
        focusAreas: coaching.dailyGoal.focusAreas,
        bonusObjectives: [
          'Maintain study streak',
          'Complete without hints',
          'Beat previous best time',
        ],
      },
      questionSequence: questionSequence.slice(0, coaching.dailyGoal.questionsToComplete),
      rewards: {
        completion: 'Mission Complete badge',
        excellence: 'Sharpshooter achievement (80%+ accuracy)',
        streak: `${(coaching.studyStreak.current + 1)}-day streak milestone`,
      },
      nextMilestone: coaching.nextMilestone,
    };
  }
}