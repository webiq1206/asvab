import { Module } from '@nestjs/common';
import { MilitaryJobsController } from './controllers/military-jobs.controller';
import { MilitaryJobsService } from './services/military-jobs.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [MilitaryJobsController],
  providers: [MilitaryJobsService],
  exports: [MilitaryJobsService],
})
export class MilitaryModule {}