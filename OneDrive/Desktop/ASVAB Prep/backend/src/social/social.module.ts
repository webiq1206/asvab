import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StudyGroupsService } from './services/study-groups.service';
import { StudyGroupsController } from './controllers/study-groups.controller';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [StudyGroupsController],
  providers: [StudyGroupsService],
  exports: [StudyGroupsService],
})
export class SocialModule {}