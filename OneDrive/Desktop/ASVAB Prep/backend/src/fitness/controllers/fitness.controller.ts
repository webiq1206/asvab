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
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FitnessTrackingService, CreateFitnessEntryDto, CreateFitnessGoalDto } from '../services/fitness-tracking.service';
import { FitnessStandardsService } from '../services/fitness-standards.service';
import { FitnessType, MilitaryBranch, Gender } from '@prisma/client';

@ApiTags('Fitness')
@Controller('fitness')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FitnessController {
  constructor(
    private readonly fitnessTrackingService: FitnessTrackingService,
    private readonly fitnessStandardsService: FitnessStandardsService,
  ) {}

  @Post('entries')
  @ApiOperation({ summary: 'Record a fitness entry' })
  @ApiResponse({ status: 201, description: 'Fitness entry recorded successfully' })
  async createFitnessEntry(
    @Request() req,
    @Body() createDto: CreateFitnessEntryDto,
  ) {
    return this.fitnessTrackingService.createFitnessEntry(req.user.sub, createDto);
  }

  @Get('entries')
  @ApiOperation({ summary: 'Get user fitness entries' })
  @ApiQuery({ name: 'type', required: false, enum: FitnessType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Fitness entries retrieved successfully' })
  async getFitnessEntries(
    @Request() req,
    @Query('type') type?: FitnessType,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.fitnessTrackingService.getUserFitnessEntries(
      req.user.sub,
      type,
      Math.min(limit || 50, 100),
      offset || 0,
    );
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get fitness progress analytics' })
  @ApiResponse({ status: 200, description: 'Progress data retrieved successfully' })
  async getFitnessProgress(@Request() req) {
    return this.fitnessTrackingService.getFitnessProgress(req.user.sub);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get comprehensive fitness analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getFitnessAnalytics(@Request() req) {
    // In a real app, these would come from user profile/settings
    const userBranch = req.user.selectedBranch || MilitaryBranch.ARMY;
    const userGender = req.user.gender || Gender.MALE; // Would be from user profile
    const userAge = req.user.age || 25; // Would be calculated from birthdate

    return this.fitnessTrackingService.getFitnessAnalytics(
      req.user.sub,
      userBranch,
      userGender,
      userAge,
    );
  }

  @Post('goals')
  @ApiOperation({ summary: 'Create a fitness goal' })
  @ApiResponse({ status: 201, description: 'Fitness goal created successfully' })
  async createFitnessGoal(
    @Request() req,
    @Body() createDto: CreateFitnessGoalDto,
  ) {
    return this.fitnessTrackingService.createFitnessGoal(req.user.sub, createDto);
  }

  @Get('goals')
  @ApiOperation({ summary: 'Get user fitness goals' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Fitness goals retrieved successfully' })
  async getFitnessGoals(
    @Request() req,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    return this.fitnessTrackingService.getUserFitnessGoals(
      req.user.sub,
      activeOnly !== false,
    );
  }

  @Patch('goals/:goalId')
  @ApiOperation({ summary: 'Update fitness goal progress' })
  @ApiResponse({ status: 200, description: 'Goal progress updated successfully' })
  async updateFitnessGoalProgress(
    @Request() req,
    @Param('goalId') goalId: string,
  ) {
    return this.fitnessTrackingService.updateFitnessGoalProgress(req.user.sub, goalId);
  }

  @Post('pt-test/simulate')
  @ApiOperation({ summary: 'Simulate PT test with given scores' })
  @ApiResponse({ status: 200, description: 'PT test simulation completed' })
  async simulatePTTest(
    @Request() req,
    @Body() scores: {
      runTimeSeconds: number;
      pushups: number;
      situps: number;
      planksSeconds?: number;
    },
  ) {
    const userBranch = req.user.selectedBranch || MilitaryBranch.ARMY;
    const userGender = req.user.gender || Gender.MALE;
    const userAge = req.user.age || 25;

    return this.fitnessTrackingService.simulatePTTest(
      req.user.sub,
      userBranch,
      userGender,
      userAge,
      scores,
    );
  }

  @Get('standards')
  @ApiOperation({ summary: 'Get fitness standards for user branch/age/gender' })
  @ApiQuery({ name: 'age', required: false, type: Number })
  @ApiQuery({ name: 'gender', required: false, enum: Gender })
  @ApiResponse({ status: 200, description: 'Fitness standards retrieved successfully' })
  async getFitnessStandards(
    @Request() req,
    @Query('age', new DefaultValuePipe(25), ParseIntPipe) age?: number,
    @Query('gender', new DefaultValuePipe(Gender.MALE)) gender?: Gender,
  ) {
    const userBranch = req.user.selectedBranch || MilitaryBranch.ARMY;
    
    return this.fitnessStandardsService.getFitnessStandards(
      userBranch,
      gender || Gender.MALE,
      age || 25,
    );
  }

  @Get('standards/branch/:branch')
  @ApiOperation({ summary: 'Get all fitness standards for a branch' })
  @ApiResponse({ status: 200, description: 'Branch fitness standards retrieved' })
  async getBranchStandards(
    @Param('branch', new ParseEnumPipe(MilitaryBranch)) branch: MilitaryBranch,
  ) {
    return this.fitnessStandardsService.getAllStandardsForBranch(branch);
  }

  @Post('pt-test/calculate')
  @ApiOperation({ summary: 'Calculate PT test score' })
  @ApiResponse({ status: 200, description: 'PT test score calculated' })
  async calculatePTTestScore(
    @Request() req,
    @Body() payload: {
      scores: {
        runTimeSeconds: number;
        pushups: number;
        situps: number;
        planksSeconds?: number;
      };
      age?: number;
      gender?: Gender;
    },
  ) {
    const userBranch = req.user.selectedBranch || MilitaryBranch.ARMY;
    const userGender = payload.gender || req.user.gender || Gender.MALE;
    const userAge = payload.age || req.user.age || 25;

    return this.fitnessStandardsService.calculatePTTestScore(
      userBranch,
      userGender,
      userAge,
      payload.scores,
    );
  }

  @Get('body-composition/standards')
  @ApiOperation({ summary: 'Get height/weight standards' })
  @ApiQuery({ name: 'heightInches', required: true, type: Number })
  @ApiQuery({ name: 'gender', required: false, enum: Gender })
  @ApiResponse({ status: 200, description: 'Body composition standards retrieved' })
  async getBodyCompositionStandards(
    @Request() req,
    @Query('heightInches', ParseIntPipe) heightInches: number,
    @Query('gender') gender?: Gender,
  ) {
    const userBranch = req.user.selectedBranch || MilitaryBranch.ARMY;
    const userGender = gender || req.user.gender || Gender.MALE;

    return this.fitnessStandardsService.getHeightWeightStandards(
      userBranch,
      userGender,
      heightInches,
    );
  }

  @Post('workout-sessions')
  @ApiOperation({ summary: 'Create a workout session' })
  @ApiResponse({ status: 201, description: 'Workout session created successfully' })
  async createWorkoutSession(
    @Request() req,
    @Body() sessionData: {
      name: string;
      date: string;
      duration: number;
      exercises: CreateFitnessEntryDto[];
      notes?: string;
    },
  ) {
    // Create individual fitness entries for each exercise in the session
    const entries = [];
    const sessionDate = new Date(sessionData.date);

    for (const exercise of sessionData.exercises) {
      const entry = await this.fitnessTrackingService.createFitnessEntry(
        req.user.sub,
        {
          ...exercise,
          recordedAt: sessionDate,
          notes: `Workout: ${sessionData.name} - ${exercise.notes || ''}`.trim(),
        },
      );
      entries.push(entry);
    }

    return {
      id: `session-${Date.now()}`,
      name: sessionData.name,
      date: sessionDate,
      duration: sessionData.duration,
      exercises: entries,
      notes: sessionData.notes,
    };
  }
}