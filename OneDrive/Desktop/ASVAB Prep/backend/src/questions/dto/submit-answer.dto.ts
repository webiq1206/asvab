import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'User selected answer (0-3)',
    minimum: 0,
    maximum: 3,
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(3)
  userAnswer: number;
}