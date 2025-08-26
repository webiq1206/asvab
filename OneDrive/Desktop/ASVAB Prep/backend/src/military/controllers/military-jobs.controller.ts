import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Request,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MilitaryJobsService, AFQTScore, JobMatchResult } from '../services/military-jobs.service';
import { MilitaryBranch, QuestionCategory } from '@asvab-prep/shared';

@ApiTags('Military Jobs')
@Controller('military/jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MilitaryJobsController {
  constructor(private readonly militaryJobsService: MilitaryJobsService) {}

  @Get('branch/:branch')
  @ApiOperation({ summary: 'Get military jobs by branch' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobsByBranch(
    @Param('branch') branch: MilitaryBranch,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('search') searchTerm?: string,
  ) {
    return this.militaryJobsService.getJobsByBranch(branch, limit, offset, searchTerm);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get military job details' })
  @ApiResponse({ status: 200, description: 'Job details retrieved' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobById(@Param('jobId') jobId: string) {
    return this.militaryJobsService.getJobById(jobId);
  }

  @Post('calculate-afqt')
  @ApiOperation({ summary: 'Calculate AFQT score from subtest scores' })
  @ApiResponse({ status: 200, description: 'AFQT score calculated' })
  async calculateAFQTScore(
    @Body() scores: {
      wordKnowledge: number;
      paragraphComprehension: number;
      arithmeticReasoning: number;
      mathematicsKnowledge: number;
    },
  ): Promise<AFQTScore> {
    return this.militaryJobsService.calculateAFQTScore(scores);
  }

  @Post('match-jobs')
  @ApiOperation({ summary: 'Find matching jobs based on AFQT and line scores' })
  @ApiResponse({ status: 200, description: 'Job matches found' })
  async findMatchingJobs(
    @Request() req,
    @Body() payload: {
      afqtScore: AFQTScore;
      allScores: Record<QuestionCategory, number>;
      branch: MilitaryBranch;
      options?: {
        limit?: number;
        includePartialMatches?: boolean;
        sortBy?: 'match' | 'afqt' | 'title';
      };
    },
  ): Promise<JobMatchResult[]> {
    const lineScores = this.militaryJobsService.calculateLineScores(
      payload.allScores,
      payload.branch,
    );

    return this.militaryJobsService.findMatchingJobs(
      req.user.sub,
      payload.afqtScore,
      lineScores,
      payload.branch,
      payload.options,
    );
  }

  @Get('recommendations/personalized')
  @ApiOperation({ summary: 'Get personalized job recommendations' })
  @ApiQuery({ name: 'branch', required: true, enum: MilitaryBranch })
  @ApiQuery({ name: 'interests', required: false, type: [String] })
  @ApiResponse({ status: 200, description: 'Personalized recommendations generated' })
  async getPersonalizedRecommendations(
    @Request() req,
    @Query('branch') branch: MilitaryBranch,
    @Query('interests') interests?: string[],
    @Body() userProgress?: Record<QuestionCategory, number>,
  ) {
    // Use provided progress or empty object for now
    // In a real implementation, this would fetch from user progress service
    const progress = userProgress || {};

    return this.militaryJobsService.getPersonalizedRecommendations(
      req.user.sub,
      branch,
      progress || {},
      interests,
    );
  }

  @Post('favorites/:jobId')
  @ApiOperation({ summary: 'Add job to favorites' })
  @ApiResponse({ status: 200, description: 'Job added to favorites' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async addJobToFavorites(@Request() req, @Param('jobId') jobId: string) {
    return this.militaryJobsService.addJobToFavorites(req.user.sub, jobId);
  }

  @Delete('favorites/:jobId')
  @ApiOperation({ summary: 'Remove job from favorites' })
  @ApiResponse({ status: 200, description: 'Job removed from favorites' })
  async removeJobFromFavorites(@Request() req, @Param('jobId') jobId: string) {
    // Implementation would remove from favorites
    return { success: true, message: 'Job removed from favorites' };
  }

  @Get('favorites/my-jobs')
  @ApiOperation({ summary: 'Get user favorite jobs' })
  @ApiResponse({ status: 200, description: 'Favorite jobs retrieved' })
  async getUserFavoriteJobs(@Request() req) {
    return this.militaryJobsService.getUserFavoriteJobs(req.user.sub);
  }

  @Post('qualification-check')
  @ApiOperation({ summary: 'Check qualification status for specific job' })
  @ApiResponse({ status: 200, description: 'Qualification status checked' })
  async checkJobQualification(
    @Request() req,
    @Body() payload: {
      jobId: string;
      afqtScore: AFQTScore;
      allScores: Record<QuestionCategory, number>;
      branch: MilitaryBranch;
    },
  ) {
    const job = await this.militaryJobsService.getJobById(payload.jobId);
    const lineScores = this.militaryJobsService.calculateLineScores(
      payload.allScores,
      payload.branch,
    );

    return this.militaryJobsService['calculateJobMatch'](job, payload.afqtScore, lineScores);
  }

  @Get('categories/available')
  @ApiOperation({ summary: 'Get available job categories by branch' })
  @ApiQuery({ name: 'branch', required: true, enum: MilitaryBranch })
  @ApiResponse({ status: 200, description: 'Job categories retrieved' })
  async getJobCategories(@Query('branch') branch: MilitaryBranch) {
    // This would return job categories specific to each branch
    const categories = {
      [MilitaryBranch.ARMY]: [
        'Combat Arms',
        'Intelligence',
        'Medical',
        'Aviation',
        'Cyber/Signal',
        'Logistics',
        'Military Police',
        'Engineering',
        'Administrative',
      ],
      [MilitaryBranch.NAVY]: [
        'Aviation',
        'Surface Warfare',
        'Submarine',
        'Special Warfare',
        'Medical',
        'Intelligence',
        'Engineering',
        'Supply',
        'Administrative',
      ],
      [MilitaryBranch.AIR_FORCE]: [
        'Aircrew Operations',
        'Maintenance',
        'Mission Support',
        'Operations Support',
        'Medical',
        'Intelligence',
        'Cyber Transport',
        'Security Forces',
        'Logistics',
      ],
      [MilitaryBranch.MARINES]: [
        'Infantry',
        'Logistics',
        'Intelligence',
        'Communications',
        'Aviation',
        'Artillery',
        'Engineering',
        'Military Police',
        'Administration',
      ],
      [MilitaryBranch.COAST_GUARD]: [
        'Aviation',
        'Marine Safety',
        'Intelligence',
        'Engineering',
        'Operations Specialist',
        'Information Systems',
        'Food Service',
        'Health Services',
        'Support',
      ],
      [MilitaryBranch.SPACE_FORCE]: [
        'Space Operations',
        'Intelligence',
        'Cyber Operations',
        'Acquisitions',
        'Engineering',
        'Operations Support',
      ],
    };

    return { branch, categories: categories[branch] || [] };
  }
}