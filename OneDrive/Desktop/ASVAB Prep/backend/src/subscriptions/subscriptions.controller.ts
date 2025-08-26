import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSubscriptionDto, ValidateReceiptDto } from './dto/subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  async getSubscriptionPlans() {
    return this.subscriptionsService.getSubscriptionPlans();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current user subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription status retrieved successfully' })
  async getSubscriptionStatus(@Request() req) {
    return this.subscriptionsService.getUserSubscriptionStatus(req.user.id);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get current user subscription usage' })
  @ApiResponse({ status: 200, description: 'Subscription usage retrieved successfully' })
  async getSubscriptionUsage(@Request() req) {
    return this.subscriptionsService.getSubscriptionUsage(req.user.id);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Get current user subscription limits' })
  @ApiResponse({ status: 200, description: 'Subscription limits retrieved successfully' })
  async getSubscriptionLimits(@Request() req) {
    return this.subscriptionsService.getSubscriptionLimits(req.user.id);
  }

  @Get('gate/:feature')
  @ApiOperation({ summary: 'Check if user can access a specific feature' })
  @ApiResponse({ status: 200, description: 'Feature access checked successfully' })
  async checkSubscriptionGate(@Request() req, @Param('feature') feature: string) {
    const hasAccess = await this.subscriptionsService.checkSubscriptionGate(req.user.id, feature);
    return { hasAccess, feature };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid subscription data' })
  @ApiResponse({ status: 409, description: 'User already has an active subscription' })
  async createSubscription(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.createSubscription(req.user.id, createSubscriptionDto);
  }

  @Post('validate-receipt')
  @ApiOperation({ summary: 'Validate purchase receipt' })
  @ApiResponse({ status: 200, description: 'Receipt validated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid receipt' })
  async validateReceipt(@Body() validateReceiptDto: ValidateReceiptDto) {
    return this.subscriptionsService.validateReceipt(validateReceiptDto);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Process subscription purchase' })
  @ApiResponse({ status: 200, description: 'Purchase processed successfully' })
  @ApiResponse({ status: 400, description: 'Purchase processing failed' })
  async purchaseSubscription(@Request() req, @Body() purchaseData: any) {
    return this.subscriptionsService.purchaseSubscription(req.user.id, purchaseData);
  }

  @Post('restore')
  @ApiOperation({ summary: 'Restore previous subscription purchases' })
  @ApiResponse({ status: 200, description: 'Purchases restored successfully' })
  @ApiResponse({ status: 400, description: 'Restore failed' })
  async restoreSubscription(@Request() req, @Body() restoreData: any) {
    const { platform, receipt } = restoreData;
    return this.subscriptionsService.restoreSubscription(req.user.id, platform, receipt);
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel current subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Request() req) {
    const cancellationReason = 'User requested cancellation';
    return this.subscriptionsService.cancelSubscription(req.user.id, cancellationReason);
  }

  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleStripeWebhook(@Body() payload: any) {
    return this.subscriptionsService.handleWebhook('stripe', payload);
  }

  @Post('webhooks/apple')
  @ApiOperation({ summary: 'Handle Apple App Store webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleAppleWebhook(@Body() payload: any) {
    return this.subscriptionsService.handleWebhook('apple', payload);
  }

  @Post('webhooks/google')
  @ApiOperation({ summary: 'Handle Google Play webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleGoogleWebhook(@Body() payload: any) {
    return this.subscriptionsService.handleWebhook('google', payload);
  }

  // Admin endpoints (these should be protected with admin guards in production)
  @Get('admin/stats')
  @ApiOperation({ summary: 'Get subscription statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getSubscriptionStats() {
    // This should be protected with admin guard
    // For now, returning basic stats
    return {
      message: 'Admin subscription statistics endpoint',
      note: 'Implement admin-specific statistics here',
    };
  }

  // Feature gate middleware endpoint
  @Post('require/:feature')
  @ApiOperation({ summary: 'Require specific feature access (throws error if not available)' })
  @ApiResponse({ status: 200, description: 'Feature access confirmed' })
  @ApiResponse({ status: 403, description: 'Feature access denied - upgrade required' })
  async requireFeatureAccess(@Request() req, @Param('feature') feature: string) {
    await this.subscriptionsService.requireSubscriptionGate(req.user.id, feature);
    return { 
      success: true, 
      message: `Access to feature '${feature}' confirmed`,
      feature 
    };
  }

  // Get comprehensive subscription information
  @Get('info')
  @ApiOperation({ summary: 'Get comprehensive subscription information' })
  @ApiResponse({ status: 200, description: 'Subscription information retrieved successfully' })
  async getSubscriptionInfo(@Request() req) {
    const [status, usage, limits] = await Promise.all([
      this.subscriptionsService.getUserSubscriptionStatus(req.user.id),
      this.subscriptionsService.getSubscriptionUsage(req.user.id),
      this.subscriptionsService.getSubscriptionLimits(req.user.id),
    ]);

    return {
      status,
      usage,
      limits,
      upgradeRecommended: this.shouldRecommendUpgrade(usage, limits),
    };
  }

  private shouldRecommendUpgrade(usage: any, limits: any): boolean {
    if (limits.hasUnlimitedAccess) return false;

    const questionUsagePercent = limits.maxQuestions > 0 ? (usage.questionsUsed / limits.maxQuestions) : 0;
    const quizHistoryUsagePercent = limits.maxQuizHistory > 0 ? (usage.quizHistoryCount / limits.maxQuizHistory) : 0;

    return questionUsagePercent > 0.8 || 
           quizHistoryUsagePercent > 0.8 ||
           usage.quizzesToday >= limits.maxQuizzesPerDay ||
           usage.categoriesAccessed >= limits.maxCategories;
  }
}