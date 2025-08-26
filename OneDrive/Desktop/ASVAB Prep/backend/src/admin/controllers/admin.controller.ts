import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  ParseEnumPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { MilitaryBranch, SubscriptionTier } from '@prisma/client';

@ApiTags('Admin Dashboard')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  private async validateAdmin(userId: string): Promise<void> {
    const isAdmin = await this.adminDashboardService.validateAdminAccess(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform-wide metrics and statistics' })
  @ApiResponse({ status: 200, description: 'Platform metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPlatformMetrics(@Request() req) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.getPlatformMetrics();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user management data with filtering and pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'branch', required: false, enum: MilitaryBranch })
  @ApiQuery({ name: 'subscriptionTier', required: false, enum: SubscriptionTier })
  @ApiResponse({ status: 200, description: 'User data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getUserManagementData(
    @Request() req,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('search') search?: string,
    @Query('branch') branch?: MilitaryBranch,
    @Query('subscriptionTier') subscriptionTier?: SubscriptionTier,
  ) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.getUserManagementData(
      Math.min(limit, 100),
      offset,
      search,
      branch,
      subscriptionTier,
    );
  }

  @Get('content/stats')
  @ApiOperation({ summary: 'Get content statistics and distribution' })
  @ApiResponse({ status: 200, description: 'Content stats retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getContentStats(@Request() req) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.getContentStats();
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health and performance metrics' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSystemHealth(@Request() req) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.getSystemHealth();
  }

  @Post('users/:userId/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(@Request() req, @Param('userId') userId: string) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.suspendUser(userId);
  }

  @Post('users/:userId/activate')
  @ApiOperation({ summary: 'Activate a suspended user account' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateUser(@Request() req, @Param('userId') userId: string) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.activateUser(userId);
  }

  @Put('users/:userId/subscription')
  @ApiOperation({ summary: 'Update user subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserSubscription(
    @Request() req,
    @Param('userId') userId: string,
    @Body() updateData: {
      subscriptionTier: SubscriptionTier;
      trialEndsAt?: Date;
      notes?: string;
    },
  ) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.updateUserSubscription(userId, updateData);
  }

  @Get('users/:userId/detailed')
  @ApiOperation({ summary: 'Get detailed user information and analytics' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Request() req, @Param('userId') userId: string) {
    await this.validateAdmin(req.user.sub);
    return this.adminDashboardService.getUserDetails(userId);
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue analytics and trends' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getRevenueAnalytics(
    @Request() req,
    @Query('period', new DefaultValuePipe('30d')) period: string,
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would return revenue analytics
    return {
      totalRevenue: 0,
      monthlyRecurring: 0,
      conversionRate: 0,
      churnRate: 0,
      trends: {},
      forecasts: {},
    };
  }

  @Get('analytics/engagement')
  @ApiOperation({ summary: 'Get user engagement analytics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Engagement analytics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getEngagementAnalytics(
    @Request() req,
    @Query('period', new DefaultValuePipe('30d')) period: string,
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would return engagement analytics
    return {
      dailyActiveUsers: 0,
      sessionDuration: 0,
      featureUsage: {},
      retentionRates: {},
      dropOffPoints: {},
    };
  }

  @Post('content/questions/bulk-upload')
  @ApiOperation({ summary: 'Bulk upload questions from CSV/JSON' })
  @ApiResponse({ status: 201, description: 'Questions uploaded successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 400, description: 'Invalid file format or data' })
  async bulkUploadQuestions(
    @Request() req,
    @Body() uploadData: {
      format: 'csv' | 'json';
      data: string;
      category?: string;
      difficulty?: string;
    },
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would process and upload questions
    return {
      success: true,
      uploaded: 0,
      errors: [],
      message: 'Questions uploaded successfully',
    };
  }

  @Put('content/questions/:questionId')
  @ApiOperation({ summary: 'Update question content and metadata' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async updateQuestion(
    @Request() req,
    @Param('questionId') questionId: string,
    @Body() updateData: {
      content?: string;
      options?: string[];
      correctAnswer?: number;
      explanation?: string;
      difficulty?: string;
      isActive?: boolean;
    },
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would update question
    return { success: true, message: 'Question updated successfully' };
  }

  @Delete('content/questions/:questionId')
  @ApiOperation({ summary: 'Deactivate or delete a question' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async deleteQuestion(@Request() req, @Param('questionId') questionId: string) {
    await this.validateAdmin(req.user.sub);
    // Implementation would soft delete question
    return { success: true, message: 'Question deactivated successfully' };
  }

  @Get('support/tickets')
  @ApiOperation({ summary: 'Get support tickets with filtering and status updates' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Support tickets retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSupportTickets(
    @Request() req,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would return support tickets
    return {
      tickets: [],
      total: 0,
      hasMore: false,
    };
  }

  @Put('support/tickets/:ticketId')
  @ApiOperation({ summary: 'Update support ticket status or add response' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async updateSupportTicket(
    @Request() req,
    @Param('ticketId') ticketId: string,
    @Body() updateData: {
      status?: string;
      priority?: string;
      response?: string;
      assignedTo?: string;
    },
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would update ticket
    return { success: true, message: 'Ticket updated successfully' };
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create system-wide announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createAnnouncement(
    @Request() req,
    @Body() announcementData: {
      title: string;
      content: string;
      type: 'info' | 'warning' | 'update' | 'maintenance';
      targetAudience?: 'all' | 'premium' | 'trial';
      branch?: MilitaryBranch;
      expiresAt?: Date;
    },
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would create announcement
    return { success: true, message: 'Announcement created successfully' };
  }

  @Get('logs/audit')
  @ApiOperation({ summary: 'Get audit logs with filtering' })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAuditLogs(
    @Request() req,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    await this.validateAdmin(req.user.sub);
    // Implementation would return audit logs
    return {
      logs: [],
      total: 0,
      hasMore: false,
    };
  }
}