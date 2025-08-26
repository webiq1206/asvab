import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { QuestionCategory, QuestionDifficulty } from '@prisma/client';

export class RandomQuestionsDto {
  @ApiProperty({
    description: 'Number of random questions to return',
    minimum: 1,
    maximum: 25,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(25)
  count?: number = 10;

  @ApiProperty({
    description: 'Filter by specific category',
    enum: QuestionCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(QuestionCategory)
  category?: QuestionCategory;

  @ApiProperty({
    description: 'Filter by difficulty level',
    enum: QuestionDifficulty,
    required: false,
  })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;
}