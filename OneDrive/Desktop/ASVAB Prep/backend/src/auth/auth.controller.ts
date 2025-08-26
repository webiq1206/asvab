import { Controller, Post, Body, UseGuards, Get, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  MagicLinkDto,
  OAuthCompleteDto,
} from './dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ 
    summary: 'Register new user',
    description: 'Register a new user with mandatory military branch selection'
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user with email and password'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token'
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Public()
  @Post('magic-link')
  @ApiOperation({ 
    summary: 'Request magic link',
    description: 'Send magic link for passwordless login'
  })
  @ApiResponse({
    status: 200,
    description: 'Magic link sent if email exists',
  })
  async requestMagicLink(@Body() magicLinkDto: MagicLinkDto) {
    return this.authService.requestMagicLink(magicLinkDto.email);
  }

  @Public()
  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Google OAuth login',
    description: 'Initiate Google OAuth authentication flow'
  })
  async googleAuth(@Req() req: Request) {
    // Handled by GoogleStrategy
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Google OAuth callback',
    description: 'Handle Google OAuth callback'
  })
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    
    if (user.needsBranchSelection) {
      // Redirect to frontend branch selection page
      return res.redirect(`${process.env.FRONTEND_URL}/select-branch?email=${user.email}&firstName=${user.firstName}&lastName=${user.lastName}`);
    }

    // User already has account, generate tokens and redirect
    const tokens = await this.authService.generateTokens(user.id, user.email);
    
    // In production, handle this redirect properly with secure token transfer
    return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${tokens.accessToken}`);
  }

  @Public()
  @Post('oauth/complete')
  @ApiOperation({ 
    summary: 'Complete OAuth registration',
    description: 'Complete OAuth user registration with branch selection'
  })
  @ApiResponse({
    status: 201,
    description: 'OAuth registration completed',
  })
  async completeOAuthRegistration(@Body() oauthCompleteDto: OAuthCompleteDto) {
    return this.authService.completeOAuthRegistration(
      oauthCompleteDto.email,
      oauthCompleteDto.selectedBranch,
      oauthCompleteDto.firstName,
      oauthCompleteDto.lastName,
    );
  }

  @Get('me')
  @ApiOperation({ 
    summary: 'Get current user',
    description: 'Get current authenticated user information'
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
  })
  async getCurrentUser(@CurrentUser() user: any) {
    return { user };
  }

  @Post('logout')
  @ApiOperation({ 
    summary: 'User logout',
    description: 'Logout current user (client-side token removal)'
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  async logout(@CurrentUser() user: any) {
    // In a more sophisticated setup, you might invalidate the refresh token
    // For now, logout is handled client-side by removing tokens
    return { message: 'Logout successful' };
  }
}