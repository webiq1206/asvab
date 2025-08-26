import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionCategory, QuestionDifficulty } from '@prisma/client';

export class CreateQuizDto {
  @ApiProperty({
    description: 'Quiz title',
    example: 'Arithmetic Reasoning Practice Quiz'
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Question category filter',
    enum: QuestionCategory,
    example: QuestionCategory.ARITHMETIC_REASONING
  })
  @IsOptional()
  category?: QuestionCategory;

  @ApiPropertyOptional({
    description: 'Question difficulty filter',
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MEDIUM
  })
  @IsOptional()
  difficulty?: QuestionDifficulty;

  @ApiProperty({
    description: 'Number of questions in the quiz',
    minimum: 1,
    maximum: 50,
    example: 10
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  questionCount: number;

  @ApiPropertyOptional({
    description: 'Whether this is an ASVAB replica exam',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isASVABReplica?: boolean;

  @ApiPropertyOptional({
    description: 'Target score percentage (1-100)',
    minimum: 1,
    maximum: 100,
    example: 80
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  targetScore?: number;
}

export class SubmitQuizAnswerDto {
  @ApiProperty({
    description: 'Question ID',
    example: 'cuid-question-id'
  })
  @IsString()
  questionId: string;

  @ApiProperty({
    description: 'User selected answer (0-based index)',
    minimum: 0,
    maximum: 3,
    example: 1
  })
  @IsNumber()
  @Min(0)
  @Max(3)
  userAnswer: number;

  @ApiPropertyOptional({
    description: 'Time spent on this question in seconds',
    minimum: 0,
    example: 45
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;
}

export class CompleteQuizDto {
  @ApiProperty({
    description: 'Total time spent on quiz in seconds',
    minimum: 0,
    example: 1800
  })
  @IsNumber()
  @Min(0)
  timeSpent: number;
}

export class QuizHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 50,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}