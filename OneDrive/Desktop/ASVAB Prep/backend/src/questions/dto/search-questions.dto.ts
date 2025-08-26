import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchQuestionsDto {
  @ApiProperty({
    description: 'Search term for question content or tags',
    minLength: 2,
    maxLength: 100,
    example: 'algebra',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  searchTerm: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 20,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}