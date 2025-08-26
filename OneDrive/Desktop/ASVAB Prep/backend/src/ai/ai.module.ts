import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AICoachingService } from './services/ai-coaching.service';
import { AdaptiveLearningService } from './services/adaptive-learning.service';
import { SmartNotificationService } from './services/smart-notification.service';
import { ContentGenerationService } from './services/content-generation.service';
import { PerformancePredictionService } from './services/performance-prediction.service';
import { AIController } from './controllers/ai.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AIController],
  providers: [
    AICoachingService,
    AdaptiveLearningService,
    SmartNotificationService,
    ContentGenerationService,
    PerformancePredictionService,
  ],
  exports: [
    AICoachingService,
    AdaptiveLearningService,
    SmartNotificationService,
    ContentGenerationService,
    PerformancePredictionService,
  ],
})
export class AIModule {}