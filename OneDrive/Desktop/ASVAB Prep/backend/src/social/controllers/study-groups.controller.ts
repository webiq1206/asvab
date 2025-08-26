import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StudyGroupsService, CreateStudyGroupDto, UpdateStudyGroupDto } from '../services/study-groups.service';
import { GroupRole } from '@prisma/client';

@ApiTags('Social - Study Groups')
@Controller('social/study-groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StudyGroupsController {
  constructor(private readonly studyGroupsService: StudyGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new study group (Premium)' })
  @ApiResponse({ status: 201, description: 'Study group created successfully' })
  @ApiResponse({ status: 403, description: 'Premium subscription required' })
  async createStudyGroup(@Request() req, @Body() createDto: CreateStudyGroupDto) {
    return this.studyGroupsService.createStudyGroup(
      req.user.sub,
      req.user.selectedBranch,
      createDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get study groups by user branch' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'publicOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Study groups retrieved successfully' })
  async getStudyGroups(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('search') searchTerm?: string,
    @Query('publicOnly', new DefaultValuePipe(true), ParseBoolPipe) publicOnly?: boolean,
  ) {
    return this.studyGroupsService.getStudyGroupsByBranch(
      req.user.selectedBranch,
      req.user.sub,
      Math.min(limit, 50),
      offset,
      searchTerm,
      publicOnly,
    );
  }

  @Get('my-groups')
  @ApiOperation({ summary: 'Get user study groups' })
  @ApiResponse({ status: 200, description: 'User study groups retrieved' })
  async getMyStudyGroups(@Request() req) {
    return this.studyGroupsService.getMyStudyGroups(req.user.sub);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get study group details' })
  @ApiResponse({ status: 200, description: 'Study group details retrieved' })
  @ApiResponse({ status: 404, description: 'Study group not found' })
  @ApiResponse({ status: 403, description: 'Access denied to private group' })
  async getStudyGroupById(@Request() req, @Param('groupId') groupId: string) {
    return this.studyGroupsService.getStudyGroupById(groupId, req.user.sub);
  }

  @Post(':groupId/join')
  @ApiOperation({ summary: 'Join a study group (Premium)' })
  @ApiResponse({ status: 200, description: 'Successfully joined study group' })
  @ApiResponse({ status: 404, description: 'Study group not found' })
  @ApiResponse({ status: 400, description: 'Already a member or group is full' })
  @ApiResponse({ status: 403, description: 'Premium subscription required' })
  async joinStudyGroup(@Request() req, @Param('groupId') groupId: string) {
    await this.studyGroupsService.joinStudyGroup(groupId, req.user.sub);
    return { success: true, message: 'Successfully joined study group' };
  }

  @Post(':groupId/leave')
  @ApiOperation({ summary: 'Leave a study group' })
  @ApiResponse({ status: 200, description: 'Successfully left study group' })
  @ApiResponse({ status: 404, description: 'Not a member of this group' })
  @ApiResponse({ status: 400, description: 'Owner must transfer ownership first' })
  async leaveStudyGroup(@Request() req, @Param('groupId') groupId: string) {
    await this.studyGroupsService.leaveStudyGroup(groupId, req.user.sub);
    return { success: true, message: 'Successfully left study group' };
  }

  @Patch(':groupId')
  @ApiOperation({ summary: 'Update study group (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Study group updated successfully' })
  @ApiResponse({ status: 403, description: 'Only owners and admins can update group' })
  @ApiResponse({ status: 404, description: 'Study group not found' })
  async updateStudyGroup(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() updateDto: UpdateStudyGroupDto,
  ) {
    return this.studyGroupsService.updateStudyGroup(groupId, req.user.sub, updateDto);
  }

  @Patch(':groupId/members/:userId/role')
  @ApiOperation({ summary: 'Update member role (Owner only)' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 403, description: 'Only group owner can change roles' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  async updateMemberRole(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Body() body: { role: GroupRole },
  ) {
    await this.studyGroupsService.updateMemberRole(
      groupId,
      targetUserId,
      body.role,
      req.user.sub,
    );
    return { success: true, message: 'Member role updated successfully' };
  }

  @Delete(':groupId/members/:userId')
  @ApiOperation({ summary: 'Remove member from group (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  async removeMember(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    await this.studyGroupsService.removeMember(groupId, targetUserId, req.user.sub);
    return { success: true, message: 'Member removed successfully' };
  }

  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete study group (Owner only)' })
  @ApiResponse({ status: 200, description: 'Study group deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only group owner can delete group' })
  @ApiResponse({ status: 404, description: 'Study group not found' })
  async deleteStudyGroup(@Request() req, @Param('groupId') groupId: string) {
    await this.studyGroupsService.deleteStudyGroup(groupId, req.user.sub);
    return { success: true, message: 'Study group deleted successfully' };
  }
}