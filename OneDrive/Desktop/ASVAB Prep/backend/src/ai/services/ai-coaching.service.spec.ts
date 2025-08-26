import { Test, TestingModule } from '@nestjs/testing';
import { AICoachingService } from './ai-coaching.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AICoachingService', () => {
  let service: AICoachingService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    quiz: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AICoachingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AICoachingService>(AICoachingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePersonalizedCoaching', () => {
    it('should generate Army-specific coaching for Army branch user', async () => {
      // Arrange
      const userId = 'test-soldier-1';
      const mockUser = {
        id: userId,
        selectedBranch: 'ARMY',
        subscriptionTier: 'PREMIUM',
        profile: {
          firstName: 'John',
          currentRank: 'Private',
          yearsOfService: 1,
        },
        quizzes: [
          {
            id: 'quiz-1',
            category: 'ARITHMETIC_REASONING',
            score: 75,
            completedAt: new Date(),
            questions: [
              { category: 'ARITHMETIC_REASONING', difficulty: 'MEDIUM', isCorrect: true },
              { category: 'ARITHMETIC_REASONING', difficulty: 'MEDIUM', isCorrect: false },
            ],
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const coaching = await service.generatePersonalizedCoaching(userId);

      // Assert
      expect(coaching).toBeDefined();
      expect(coaching.greeting).toContain('Soldier');
      expect(coaching.greeting).toContain('Hooah!');
      expect(coaching.greeting).toContain('John');
      expect(coaching.strengthAreas).toHaveProperty('ARITHMETIC_REASONING');
      expect(coaching.recommendations).toHaveLength(3);
      expect(coaching.dailyMissions).toHaveLength(3);
      expect(coaching.militaryContext.branch).toBe('ARMY');
      expect(coaching.militaryContext.motto).toBe('Army Strong');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          profile: true,
          quizzes: expect.any(Object),
        },
      });
    });

    it('should generate Navy-specific coaching for Navy branch user', async () => {
      // Arrange
      const userId = 'test-sailor-1';
      const mockUser = {
        id: userId,
        selectedBranch: 'NAVY',
        subscriptionTier: 'FREE',
        profile: {
          firstName: 'Jane',
          currentRank: 'Seaman',
          yearsOfService: 2,
        },
        quizzes: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const coaching = await service.generatePersonalizedCoaching(userId);

      // Assert
      expect(coaching.greeting).toContain('Sailor');
      expect(coaching.greeting).toContain('Hooyah!');
      expect(coaching.greeting).toContain('Jane');
      expect(coaching.militaryContext.branch).toBe('NAVY');
      expect(coaching.militaryContext.motto).toBe('Anchors Aweigh');
      expect(coaching.militaryContext.terminology).toContain('ship-shape');
    });

    it('should handle user without profile gracefully', async () => {
      // Arrange
      const userId = 'test-user-no-profile';
      const mockUser = {
        id: userId,
        selectedBranch: 'AIR_FORCE',
        subscriptionTier: 'PREMIUM',
        profile: null,
        quizzes: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const coaching = await service.generatePersonalizedCoaching(userId);

      // Assert
      expect(coaching.greeting).toContain('Airman');
      expect(coaching.greeting).toContain('Hoorah!');
      expect(coaching.greeting).not.toContain('null');
      expect(coaching.militaryContext.branch).toBe('AIR_FORCE');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generatePersonalizedCoaching(userId)).rejects.toThrow('User not found');
    });

    it('should calculate performance metrics correctly', async () => {
      // Arrange
      const userId = 'test-user-metrics';
      const mockUser = {
        id: userId,
        selectedBranch: 'MARINES',
        subscriptionTier: 'PREMIUM',
        profile: { firstName: 'Mike', currentRank: 'Lance Corporal' },
        quizzes: [
          {
            category: 'MATHEMATICS_KNOWLEDGE',
            score: 85,
            completedAt: new Date(),
            questions: [
              { category: 'MATHEMATICS_KNOWLEDGE', difficulty: 'EASY', isCorrect: true },
              { category: 'MATHEMATICS_KNOWLEDGE', difficulty: 'MEDIUM', isCorrect: true },
              { category: 'MATHEMATICS_KNOWLEDGE', difficulty: 'HARD', isCorrect: false },
            ],
          },
        ],
      };

      mockPrismaService.user.findUnique.mkResolvedValue(mockUser);

      // Act
      const coaching = await service.generatePersonalizedCoaching(userId);

      // Assert
      expect(coaching.performanceMetrics.overallAccuracy).toBeCloseTo(0.67, 2);
      expect(coaching.performanceMetrics.totalQuizzesTaken).toBe(1);
      expect(coaching.performanceMetrics.averageScore).toBe(85);
      expect(coaching.performanceMetrics.improvementTrend).toBe('STABLE');
    });

    it('should generate appropriate recommendations based on weak areas', async () => {
      // Arrange
      const userId = 'test-user-weak-areas';
      const mockUser = {
        id: userId,
        selectedBranch: 'SPACE_FORCE',
        subscriptionTier: 'PREMIUM',
        profile: { firstName: 'Alex', currentRank: 'Guardian' },
        quizzes: [
          {
            category: 'WORD_KNOWLEDGE',
            score: 45, // Low score indicates weakness
            questions: [
              { category: 'WORD_KNOWLEDGE', difficulty: 'EASY', isCorrect: false },
              { category: 'WORD_KNOWLEDGE', difficulty: 'EASY', isCorrect: false },
            ],
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const coaching = await service.generatePersonalizedCoaching(userId);

      // Assert
      expect(coaching.weakAreas).toContain('WORD_KNOWLEDGE');
      expect(coaching.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'WORD_KNOWLEDGE',
            priority: 'HIGH',
          }),
        ])
      );
    });
  });

  describe('generateDailyMission', () => {
    it('should generate branch-specific daily mission', async () => {
      // Arrange
      const userId = 'test-user-mission';
      const mockUser = {
        selectedBranch: 'COAST_GUARD',
        profile: { firstName: 'Sarah', currentRank: 'Petty Officer' },
        quizzes: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const mission = await service.generateDailyMission(userId);

      // Assert
      expect(mission).toBeDefined();
      expect(mission.title).toContain('Guardian'); // Coast Guard terminology
      expect(mission.description).toBeDefined();
      expect(mission.targetCategory).toBeDefined();
      expect(mission.difficulty).toBeDefined();
      expect(mission.questionCount).toBeGreaterThan(0);
      expect(mission.estimatedMinutes).toBeGreaterThan(0);
      expect(mission.motivationalMessage).toContain('Semper Paratus');
    });

    it('should adapt mission difficulty based on user performance', async () => {
      // Arrange - User with high performance
      const userId = 'test-user-high-perf';
      const mockUser = {
        selectedBranch: 'ARMY',
        profile: { firstName: 'Elite', currentRank: 'Sergeant' },
        quizzes: [
          { score: 95, category: 'ARITHMETIC_REASONING' },
          { score: 90, category: 'MATHEMATICS_KNOWLEDGE' },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const mission = await service.generateDailyMission(userId);

      // Assert
      expect(['MEDIUM', 'HARD']).toContain(mission.difficulty);
      expect(mission.questionCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getStudyPlan', () => {
    it('should create comprehensive 30-day study plan', async () => {
      // Arrange
      const userId = 'test-user-study-plan';
      const targetScore = 70;
      const mockUser = {
        selectedBranch: 'AIR_FORCE',
        profile: { firstName: 'Pilot', currentRank: 'Airman' },
        quizzes: [
          {
            category: 'ARITHMETIC_REASONING',
            score: 60,
            questions: [{ category: 'ARITHMETIC_REASONING', isCorrect: false }],
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const studyPlan = await service.getStudyPlan(userId, targetScore);

      // Assert
      expect(studyPlan).toBeDefined();
      expect(studyPlan.targetScore).toBe(targetScore);
      expect(studyPlan.duration).toBe(30);
      expect(studyPlan.weeklySchedule).toHaveLength(7);
      expect(studyPlan.milestones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            week: expect.any(Number),
            description: expect.any(String),
            targetImprovement: expect.any(String),
          }),
        ])
      );
      expect(studyPlan.militaryMotivation).toContain('Aim High');
    });

    it('should prioritize weak categories in study plan', async () => {
      // Arrange
      const userId = 'test-user-weak-cat';
      const mockUser = {
        selectedBranch: 'MARINES',
        profile: { firstName: 'Tough', currentRank: 'Marine' },
        quizzes: [
          { category: 'WORD_KNOWLEDGE', score: 40 }, // Weak area
          { category: 'ARITHMETIC_REASONING', score: 85 }, // Strong area
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const studyPlan = await service.getStudyPlan(userId, 75);

      // Assert
      const weeklySchedule = studyPlan.weeklySchedule;
      const wordKnowledgeSessions = weeklySchedule.filter(day => 
        day.sessions.some(session => session.category === 'WORD_KNOWLEDGE')
      );
      const arithmeticSessions = weeklySchedule.filter(day =>
        day.sessions.some(session => session.category === 'ARITHMETIC_REASONING')
      );

      // Weak category should have more sessions
      expect(wordKnowledgeSessions.length).toBeGreaterThan(arithmeticSessions.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'test-user-db-error';
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.generatePersonalizedCoaching(userId)).rejects.toThrow(
        'Failed to generate personalized coaching'
      );
    });

    it('should log appropriate error messages', async () => {
      // Arrange
      const userId = 'test-user-log-test';
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Test error'));

      // Act
      try {
        await service.generatePersonalizedCoaching(userId);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to generate personalized coaching:',
        expect.any(Error)
      );
    });
  });
});