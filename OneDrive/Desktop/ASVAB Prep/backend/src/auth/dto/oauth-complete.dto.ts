import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { MilitaryBranch } from '@prisma/client';

export class OAuthCompleteDto {
  @ApiProperty({
    description: 'User email from OAuth provider',
    example: 'soldier@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Selected military branch (mandatory)',
    enum: MilitaryBranch,
    example: MilitaryBranch.ARMY,
  })
  @IsEnum(MilitaryBranch, {
    message: 'Please select a valid military branch',
  })
  selectedBranch: MilitaryBranch;

  @ApiProperty({
    description: 'First name from OAuth provider',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Last name from OAuth provider',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}