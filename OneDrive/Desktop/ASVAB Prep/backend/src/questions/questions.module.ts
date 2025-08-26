import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { QuestionImportService } from './question-import.service';

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionImportService],
  exports: [QuestionsService],
})
export class QuestionsModule {}