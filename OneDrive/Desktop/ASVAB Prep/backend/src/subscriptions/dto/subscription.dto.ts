import { IsString, IsEnum, IsOptional, IsDateString, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionTier, PaymentProvider } from '@asvab-prep/shared';

export class CreateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionTier })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiProperty()
  @IsString()
  originalTransactionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receipt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  receiptData?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionTier })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  canceledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class ValidateReceiptDto {
  @ApiProperty()
  @IsString()
  receipt: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class SubscriptionUsageDto {
  @ApiProperty()
  @IsNumber()
  questionsUsed: number;

  @ApiProperty()
  @IsNumber()
  quizzesToday: number;

  @ApiProperty()
  @IsNumber()
  categoriesAccessed: number;

  @ApiProperty()
  @IsNumber()
  quizHistoryCount: number;

  @ApiProperty()
  @IsBoolean()
  hasWhiteboardAccess: boolean;

  @ApiProperty()
  @IsBoolean()
  hasFlashcardAccess: boolean;

  @ApiProperty()
  @IsBoolean()
  hasSocialAccess: boolean;

  @ApiProperty()
  @IsBoolean()
  hasAdvancedAnalytics: boolean;

  @ApiProperty()
  @IsBoolean()
  hasExportAccess: boolean;

  @ApiProperty()
  @IsBoolean()
  canTakeAsvabreplica: boolean;
}

export class SubscriptionLimitsDto {
  @ApiProperty()
  @IsNumber()
  maxQuestions: number;

  @ApiProperty()
  @IsNumber()
  maxQuizzesPerDay: number;

  @ApiProperty()
  @IsNumber()
  maxCategories: number;

  @ApiProperty()
  @IsNumber()
  maxQuizHistory: number;

  @ApiProperty()
  @IsBoolean()
  hasUnlimitedAccess: boolean;

  @ApiProperty()
  @IsBoolean()
  canAccessPremiumFeatures: boolean;

  @ApiProperty()
  @IsBoolean()
  isTrialActive: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;
}