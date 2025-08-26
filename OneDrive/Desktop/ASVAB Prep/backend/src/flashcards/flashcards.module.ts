import { Module } from '@nestjs/common';
import { FlashcardsController, FlashcardDecksController } from './controllers/flashcards.controller';
import { FlashcardsService } from './services/flashcards.service';
import { SpacedRepetitionService } from './services/spaced-repetition.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [FlashcardsController, FlashcardDecksController],
  providers: [FlashcardsService, SpacedRepetitionService],
  exports: [FlashcardsService, SpacedRepetitionService],
})
export class FlashcardsModule {}