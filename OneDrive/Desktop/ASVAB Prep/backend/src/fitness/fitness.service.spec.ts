import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FitnessStandardsService } from './services/fitness-standards.service';
import { FitnessTrackingService } from './services/fitness-tracking.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { MilitaryBranch, Gender, FitnessType } from '@prisma/client';

describe('FitnessStandardsService', () => {
  let service: FitnessStandardsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    physicalStandard: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FitnessStandardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FitnessStandardsService>(FitnessStandardsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getFitnessStandards', () => {
    it('should return fitness standards for valid branch/gender/age', async () => {
      const mockStandard = {
        id: 'standard-1',
        branch: MilitaryBranch.ARMY,
        gender: Gender.MALE,
        ageMin: 20,
        ageMax: 26,
        runTimeMax: 780, // 13:00
        pushupsMin: 35,
        situpsMin: 47,
        planksMin: 120, // 2:00
        bodyFatMax: 26,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.physicalStandard.findFirst.mockResolvedValue(mockStandard);

      const result = await service.getFitnessStandards(
        MilitaryBranch.ARMY,
        Gender.MALE,
        25,
      );

      expect(result).toEqual(mockStandard);
      expect(mockPrismaService.physicalStandard.findFirst).toHaveBeenCalledWith({
        where: {
          branch: MilitaryBranch.ARMY,
          gender: Gender.MALE,
          ageMin: { lte: 25 },
          ageMax: { gte: 25 },
        },
      });
    });

    it('should throw NotFoundException when no standards found', async () => {
      mockPrismaService.physicalStandard.findFirst.mockResolvedValue(null);

      await expect(
        service.getFitnessStandards(MilitaryBranch.ARMY, Gender.MALE, 25),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculatePTTestScore', () => {
    const mockStandard = {
      id: 'standard-1',
      branch: MilitaryBranch.ARMY,
      gender: Gender.MALE,
      ageMin: 20,
      ageMax: 26,
      runTimeMax: 780, // 13:00
      pushupsMin: 35,
      situpsMin: 47,
      planksMin: 120, // 2:00
      bodyFatMax: 26,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrismaService.physicalStandard.findFirst.mockResolvedValue(mockStandard);
    });

    it('should calculate passing PT test score', async () => {
      const scores = {
        runTimeSeconds: 720, // 12:00 - passes
        pushups: 40, // passes
        situps: 50, // passes
        planksSeconds: 150, // passes
      };

      const result = await service.calculatePTTestScore(
        MilitaryBranch.ARMY,
        Gender.MALE,
        25,
        scores,
      );

      expect(result.passed).toBe(true);
      expect(result.branch).toBe(MilitaryBranch.ARMY);
      expect(result.gender).toBe(Gender.MALE);
      expect(result.age).toBe(25);
      expect(result.exerciseResults).toHaveLength(3); // Run, pushups, plank (Army uses plank)
      expect(result.totalPoints).toBeGreaterThan(0);
      expect(result.percentage).toBeGreaterThan(60); // Army passing percentage
    });

    it('should calculate failing PT test score', async () => {
      const scores = {
        runTimeSeconds: 900, // 15:00 - fails
        pushups: 20, // fails
        situps: 30, // fails
      };

      const result = await service.calculatePTTestScore(
        MilitaryBranch.ARMY,
        Gender.MALE,
        25,
        scores,
      );

      expect(result.passed).toBe(false);
      expect(result.exerciseResults.every(ex => !ex.passed)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate scores for different branches', async () => {
      const navyStandard = {
        ...mockStandard,
        branch: MilitaryBranch.NAVY,
        runTimeMax: 720, // Navy 1.5 mile
      };
      
      mockPrismaService.physicalStandard.findFirst.mockResolvedValue(navyStandard);

      const scores = {
        runTimeSeconds: 600, // 10:00
        pushups: 50,
        situps: 60,
      };

      const result = await service.calculatePTTestScore(
        MilitaryBranch.NAVY,
        Gender.MALE,
        25,
        scores,
      );

      expect(result.branch).toBe(MilitaryBranch.NAVY);
      expect(result.exerciseResults[0].exercise).toContain('1.5-Mile Run');
    });

    it('should provide grade-specific recommendations', async () => {
      const scores = {
        runTimeSeconds: 770, // Close to max time
        pushups: 36, // Just above minimum
        situps: 48, // Just above minimum
        planksSeconds: 125, // Just above minimum
      };

      const result = await service.calculatePTTestScore(
        MilitaryBranch.ARMY,
        Gender.MALE,
        25,
        scores,
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => 
        rec.includes('Focus') || rec.includes('improvement')
      )).toBe(true);
    });
  });

  describe('getHeightWeightStandards', () => {
    it('should calculate height/weight standards', async () => {
      const result = await service.getHeightWeightStandards(
        MilitaryBranch.ARMY,
        Gender.MALE,
        70, // 70 inches
      );

      expect(result.minWeight).toBeGreaterThan(0);
      expect(result.maxWeight).toBeGreaterThan(result.minWeight);
      expect(result.maxBodyFat).toBe(26); // Army male body fat limit
    });

    it('should have different body fat limits by branch', async () => {
      const armyResult = await service.getHeightWeightStandards(
        MilitaryBranch.ARMY,
        Gender.MALE,
        70,
      );

      const marinesResult = await service.getHeightWeightStandards(
        MilitaryBranch.MARINES,
        Gender.MALE,
        70,
      );

      expect(armyResult.maxBodyFat).toBe(26);
      expect(marinesResult.maxBodyFat).toBe(18); // Marines stricter
    });
  });
});

describe('FitnessTrackingService', () => {
  let service: FitnessTrackingService;
  let prismaService: PrismaService;
  let fitnessStandardsService: FitnessStandardsService;

  const mockPrismaService = {
    fitnessEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
    },
    fitnessGoal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockFitnessStandardsService = {
    calculatePTTestScore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FitnessTrackingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FitnessStandardsService,
          useValue: mockFitnessStandardsService,
        },
      ],
    }).compile();

    service = module.get<FitnessTrackingService>(FitnessTrackingService);
    prismaService = module.get<PrismaService>(PrismaService);
    fitnessStandardsService = module.get<FitnessStandardsService>(FitnessStandardsService);
  });

  describe('createFitnessEntry', () => {
    it('should create valid fitness entry', async () => {
      const createDto = {
        type: FitnessType.PUSHUPS,
        value: 50,
        notes: 'Good workout',
      };

      const mockEntry = {
        id: 'entry-1',
        userId: 'user-1',
        ...createDto,
        recordedAt: new Date(),
      };

      mockPrismaService.fitnessEntry.create.mockResolvedValue(mockEntry);

      const result = await service.createFitnessEntry('user-1', createDto);

      expect(result).toEqual(mockEntry);
      expect(mockPrismaService.fitnessEntry.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: createDto.type,
          value: createDto.value,
          recordedAt: expect.any(Date),
          notes: createDto.notes,
        },
      });
    });

    it('should validate fitness entry values', async () => {
      const invalidDto = {
        type: FitnessType.PUSHUPS,
        value: 300, // Too high
      };

      await expect(service.createFitnessEntry('user-1', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate run time values', async () => {
      const invalidDto = {
        type: FitnessType.RUN,
        value: 60, // Too fast (1 minute)
      };

      await expect(service.createFitnessEntry('user-1', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFitnessProgress', () => {
    it('should calculate fitness progress for user', async () => {
      const mockEntries = [
        { value: 50, recordedAt: new Date('2024-01-15') },
        { value: 45, recordedAt: new Date('2024-01-10') },
        { value: 40, recordedAt: new Date('2024-01-05') },
      ];

      mockPrismaService.fitnessEntry.findMany.mockResolvedValue(mockEntries);
      mockPrismaService.fitnessEntry.count.mockResolvedValue(15);

      const progress = await service.getFitnessProgress('user-1');

      expect(progress).toHaveLength(1); // Only FitnessType with entries
      expect(progress[0].current).toBe(50);
      expect(progress[0].best).toBe(50); // Highest for pushups
      expect(progress[0].totalEntries).toBe(15);
      expect(progress[0].trend).toMatch(/IMPROVING|DECLINING|STABLE/);
    });

    it('should handle empty progress data', async () => {
      mockPrismaService.fitnessEntry.findMany.mockResolvedValue([]);
      mockPrismaService.fitnessEntry.count.mockResolvedValue(0);

      const progress = await service.getFitnessProgress('user-1');

      expect(progress).toHaveLength(0);
    });
  });

  describe('createFitnessGoal', () => {
    it('should create valid fitness goal', async () => {
      const createDto = {
        type: FitnessType.PUSHUPS,
        targetValue: 60,
        targetDate: new Date('2024-06-01'),
      };

      const mockLatestEntry = {
        value: 45,
        recordedAt: new Date(),
      };

      const mockGoal = {
        id: 'goal-1',
        userId: 'user-1',
        type: createDto.type,
        targetValue: createDto.targetValue,
        currentValue: 45,
        targetDate: createDto.targetDate,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.fitnessEntry.findFirst.mockResolvedValue(mockLatestEntry);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback({
          fitnessGoal: {
            updateMany: jest.fn(),
            create: jest.fn().mockResolvedValue(mockGoal),
          },
        });
        return mockGoal;
      });

      const result = await service.createFitnessGoal('user-1', createDto);

      expect(result).toEqual(mockGoal);
    });

    it('should reject goals with past target dates', async () => {
      const invalidDto = {
        type: FitnessType.PUSHUPS,
        targetValue: 60,
        targetDate: new Date('2020-01-01'), // Past date
      };

      await expect(service.createFitnessGoal('user-1', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('simulatePTTest', () => {
    it('should simulate PT test and save entries', async () => {
      const scores = {
        runTimeSeconds: 720,
        pushups: 50,
        situps: 60,
      };

      const mockResult = {
        branch: MilitaryBranch.ARMY,
        gender: Gender.MALE,
        age: 25,
        totalPoints: 250,
        maxPoints: 300,
        percentage: 83.3,
        passed: true,
        overallGrade: 'GOOD' as const,
        exerciseResults: [],
        recommendations: [],
      };

      mockFitnessStandardsService.calculatePTTestScore.mockResolvedValue(mockResult);
      mockPrismaService.fitnessEntry.createMany.mockResolvedValue({ count: 3 });

      const result = await service.simulatePTTest(
        'user-1',
        MilitaryBranch.ARMY,
        Gender.MALE,
        25,
        scores,
      );

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.fitnessEntry.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user-1',
            type: FitnessType.RUN,
            value: scores.runTimeSeconds,
            recordedAt: expect.any(Date),
            notes: 'PT Test Simulation',
          },
          {
            userId: 'user-1',
            type: FitnessType.PUSHUPS,
            value: scores.pushups,
            recordedAt: expect.any(Date),
            notes: 'PT Test Simulation',
          },
          {
            userId: 'user-1',
            type: FitnessType.SITUPS,
            value: scores.situps,
            recordedAt: expect.any(Date),
            notes: 'PT Test Simulation',
          },
        ],
      });
    });
  });

  describe('updateFitnessGoalProgress', () => {
    it('should update goal progress with latest entry', async () => {
      const mockGoal = {
        id: 'goal-1',
        userId: 'user-1',
        type: FitnessType.PUSHUPS,
        targetValue: 60,
        currentValue: 45,
        targetDate: new Date('2024-06-01'),
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLatestEntry = {
        value: 55,
        recordedAt: new Date(),
      };

      const mockUpdatedGoal = {
        ...mockGoal,
        currentValue: 55,
        isCompleted: false, // Still not completed (55 < 60)
      };

      mockPrismaService.fitnessGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrismaService.fitnessEntry.findFirst.mockResolvedValue(mockLatestEntry);
      mockPrismaService.fitnessGoal.update.mockResolvedValue(mockUpdatedGoal);

      const result = await service.updateFitnessGoalProgress('user-1', 'goal-1');

      expect(result).toEqual(mockUpdatedGoal);
      expect(mockPrismaService.fitnessGoal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: {
          currentValue: 55,
          isCompleted: false,
        },
      });
    });

    it('should mark goal as completed when target is reached', async () => {
      const mockGoal = {
        id: 'goal-1',
        userId: 'user-1',
        type: FitnessType.PUSHUPS,
        targetValue: 60,
        currentValue: 55,
        targetDate: new Date('2024-06-01'),
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLatestEntry = {
        value: 65, // Exceeds target
        recordedAt: new Date(),
      };

      mockPrismaService.fitnessGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrismaService.fitnessEntry.findFirst.mockResolvedValue(mockLatestEntry);
      mockPrismaService.fitnessGoal.update.mockResolvedValue({
        ...mockGoal,
        currentValue: 65,
        isCompleted: true,
      });

      const result = await service.updateFitnessGoalProgress('user-1', 'goal-1');

      expect(result.isCompleted).toBe(true);
    });

    it('should throw NotFoundException for invalid goal', async () => {
      mockPrismaService.fitnessGoal.findUnique.mockResolvedValue(null);

      await expect(
        service.updateFitnessGoalProgress('user-1', 'invalid-goal'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});