import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RealTimeStudyService } from './services/realtime-study.service';
import { StudyRoomService } from './services/study-room.service';
import { CollaborativeQuizService } from './services/collaborative-quiz.service';
import { PeerLearningService } from './services/peer-learning.service';
import { LiveSessionService } from './services/live-session.service';
import { CollaborationController } from './controllers/collaboration.controller';
import { StudyRoomGateway } from './gateways/study-room.gateway';
import { QuizSessionGateway } from './gateways/quiz-session.gateway';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [CollaborationController],
  providers: [
    RealTimeStudyService,
    StudyRoomService,
    CollaborativeQuizService,
    PeerLearningService,
    LiveSessionService,
    StudyRoomGateway,
    QuizSessionGateway,
  ],
  exports: [
    RealTimeStudyService,
    StudyRoomService,
    CollaborativeQuizService,
    PeerLearningService,
    LiveSessionService,
  ],
})
export class CollaborationModule {}