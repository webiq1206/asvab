import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { QuestionsModule } from './questions/questions.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { MilitaryModule } from './military/military.module';
import { SocialModule } from './social/social.module';
import { FitnessModule } from './fitness/fitness.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FlashcardsModule } from './flashcards/flashcards.module';
import { AIModule } from './ai/ai.module';
import { SearchModule } from './search/search.module';
import { CollaborationModule } from './collaboration/collaboration.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    QuestionsModule,
    QuizzesModule,
    DashboardModule,
    SubscriptionsModule,
    MilitaryModule,
    SocialModule,
    FitnessModule,
    AdminModule,
    NotificationsModule,
    FlashcardsModule,
    AIModule,
    SearchModule,
    CollaborationModule,
  ],
})
export class AppModule {}