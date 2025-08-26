import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class MagicLinkDto {
  @ApiProperty({
    description: 'Email address to send magic link to',
    example: 'soldier@example.com',
  })
  @IsEmail()
  email: string;
}