import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { FitnessStandardsService } from './services/fitness-standards.service';
import { FitnessTrackingService } from './services/fitness-tracking.service';
import { FitnessController } from './controllers/fitness.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FitnessController],
  providers: [FitnessStandardsService, FitnessTrackingService],
  exports: [FitnessStandardsService, FitnessTrackingService],
})
export class FitnessModule {}