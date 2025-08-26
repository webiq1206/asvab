import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray, IsDateString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuestionCategory, MilitaryBranch } from '@asvab-prep/shared';

export enum FlashcardDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum FlashcardType {
  BASIC = 'BASIC',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_BLANK = 'FILL_IN_BLANK',
}

export class CreateFlashcardDto {
  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty()
  @IsString()
  answer: string;

  @ApiProperty({ enum: QuestionCategory })
  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @ApiProperty({ enum: FlashcardDifficulty })
  @IsEnum(FlashcardDifficulty)
  difficulty: FlashcardDifficulty;

  @ApiProperty({ enum: FlashcardType })
  @IsEnum(FlashcardType)
  type: FlashcardType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choices?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deckId?: string;

  @ApiPropertyOptional({ type: [MilitaryBranch] })
  @IsOptional()
  @IsArray()
  @IsEnum(MilitaryBranch, { each: true })
  branchRelevance?: MilitaryBranch[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateFlashcardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional({ enum: QuestionCategory })
  @IsOptional()
  @IsEnum(QuestionCategory)
  category?: QuestionCategory;

  @ApiPropertyOptional({ enum: FlashcardDifficulty })
  @IsOptional()
  @IsEnum(FlashcardDifficulty)
  difficulty?: FlashcardDifficulty;

  @ApiPropertyOptional({ enum: FlashcardType })
  @IsOptional()
  @IsEnum(FlashcardType)
  type?: FlashcardType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choices?: string[];

  @ApiPropertyOptional({ type: [MilitaryBranch] })
  @IsOptional()
  @IsArray()
  @IsEnum(MilitaryBranch, { each: true })
  branchRelevance?: MilitaryBranch[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateFlashcardDeckDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: QuestionCategory })
  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @ApiPropertyOptional({ type: [MilitaryBranch] })
  @IsOptional()
  @IsArray()
  @IsEnum(MilitaryBranch, { each: true })
  branchRelevance?: MilitaryBranch[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorTheme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconName?: string;
}

export class UpdateFlashcardDeckDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: QuestionCategory })
  @IsOptional()
  @IsEnum(QuestionCategory)
  category?: QuestionCategory;

  @ApiPropertyOptional({ type: [MilitaryBranch] })
  @IsOptional()
  @IsArray()
  @IsEnum(MilitaryBranch, { each: true })
  branchRelevance?: MilitaryBranch[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorTheme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconName?: string;
}

export class ReviewFlashcardDto {
  @ApiProperty()
  @IsString()
  flashcardId: string;

  @ApiProperty()
  @IsNumber()
  rating: number; // 0-5 scale for spaced repetition

  @ApiProperty()
  @IsNumber()
  timeSpent: number; // in seconds

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wasCorrect?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAnswer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StudySessionDto {
  @ApiProperty()
  @IsString()
  deckId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxCards?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeLimit?: number; // in minutes

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeNew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeDue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeReview?: boolean;

  @ApiPropertyOptional({ type: [FlashcardDifficulty] })
  @IsOptional()
  @IsArray()
  @IsEnum(FlashcardDifficulty, { each: true })
  difficulties?: FlashcardDifficulty[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class FlashcardProgressDto {
  @ApiProperty()
  @IsNumber()
  totalCards: number;

  @ApiProperty()
  @IsNumber()
  masteredCards: number;

  @ApiProperty()
  @IsNumber()
  learningCards: number;

  @ApiProperty()
  @IsNumber()
  newCards: number;

  @ApiProperty()
  @IsNumber()
  dueCards: number;

  @ApiProperty()
  @IsNumber()
  streakDays: number;

  @ApiProperty()
  @IsDateString()
  lastStudied: string;

  @ApiProperty()
  @IsNumber()
  totalStudyTime: number; // in seconds

  @ApiProperty()
  @IsNumber()
  averageRating: number;

  @ApiProperty()
  @IsNumber()
  retentionRate: number; // percentage
}