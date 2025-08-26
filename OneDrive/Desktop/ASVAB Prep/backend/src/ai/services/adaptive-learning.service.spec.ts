import { Test, TestingModule } from '@nestjs/testing';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AdaptiveLearningService', () => {
  let service: AdaptiveLearningService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    quiz: {
      findMany: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    learningPath: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdaptiveLearningService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdaptiveLearningService>(AdaptiveLearningService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAdaptiveSequence', () => {
    it('should generate sequence starting with easy questions for new user', async () => {
      // Arrange
      const userId = 'new-user-123';
      const category = 'ARITHMETIC_REASONING';
      const mockUser = {
        id: userId,
        selectedBranch: 'ARMY',
        quizzes: [], // No quiz history - new user
      };

      const mockQuestions = [
        createMockQuestion({ difficulty: 'EASY', id: 'q1' }),
        createMockQuestion({ difficulty: 'EASY', id: 'q2' }),
        createMockQuestion({ difficulty: 'MEDIUM', id: 'q3' }),
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);

      // Act
      const sequence = await service.generateAdaptiveSequence(userId, category, 5);

      // Assert
      expect(sequence).toBeDefined();
      expect(sequence.questions).toHaveLength(3); // Based on available mock questions
      expect(sequence.difficulty).toBe('EASY'); // Should start easy for new user
      expect(sequence.reasoning).toContain('new learner');
      expect(sequence.category).toBe(category);
      
      // First questions should be easier
      expect(sequence.questions[0].difficulty).toBe('EASY');
    });

    it('should adapt difficulty based on user performance history', async () => {
      // Arrange
      const userId = 'experienced-user-123';
      const category = 'MATHEMATICS_KNOWLEDGE';
      const mockUser = {
        id: userId,
        selectedBranch: 'NAVY',
        quizzes: [
          {
            category: 'MATHEMATICS_KNOWLEDGE',
            score: 85,
            questions: [
              { category: 'MATHEMATICS_KNOWLEDGE', difficulty: 'MEDIUM', isCorrect: true },
              { category: 'MATHEMATICS_KNOWLEDGE', difficulty: 'MEDIUM', isCorrect: true },
            ],
          },
        ],
      };

      const mockQuestions = [
        createMockQuestion({ difficulty: 'MEDIUM', id: 'q1' }),
        createMockQuestion({ difficulty: 'HARD', id: 'q2' }),
        createMockQuestion({ difficulty: 'HARD', id: 'q3' }),
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);

      // Act
      const sequence = await service.generateAdaptiveSequence(userId, category, 5);

      // Assert
      expect(sequence.difficulty).toBe('MEDIUM'); // Should start at medium for good performer
      expect(sequence.reasoning).toContain('proficiency level');
      expect(sequence.questions.some(q => q.difficulty === 'HARD')).toBe(true);
    });

    it('should filter questions by military branch relevance', async () => {
      // Arrange
      const userId = 'marine-user-123';
      const category = 'GENERAL_SCIENCE';
      const mockUser = {
        id: userId,
        selectedBranch: 'MARINES',
        quizzes: [],
      };

      const mockQuestions = [
        createMockQuestion({ 
          id: 'q1', 
          branchRelevance: ['ARMY', 'MARINES'], 
          difficulty: 'EASY' 
        }),
        createMockQuestion({ 
          id: 'q2', 
          branchRelevance: ['NAVY', 'AIR_FORCE'], 
          difficulty: 'EASY' 
        }),
        createMockQuestion({ 
          id: 'q3', 
          branchRelevance: ['MARINES', 'COAST_GUARD'], 
          difficulty: 'EASY' 
        }),
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);

      // Act
      const sequence = await service.generateAdaptiveSequence(userId, category, 5);

      // Assert
      const relevantQuestions = sequence.questions.filter(q => 
        q.branchRelevance.includes('MARINES')
      );
      expect(relevantQuestions.length).toBeGreaterThan(0);
      expect(sequence.questions.every(q => q.branchRelevance.includes('MARINES'))).toBe(true);
    });

    it('should handle insufficient questions gracefully', async () => {
      // Arrange
      const userId = 'user-few-questions';
      const category = 'ELECTRONICS_INFORMATION';
      const mockUser = { id: userId, selectedBranch: 'AIR_FORCE', quizzes: [] };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.question.findMany.mockResolvedValue([]); // No questions available

      // Act
      const sequence = await service.generateAdaptiveSequence(userId, category, 10);

      // Assert
      expect(sequence.questions).toHaveLength(0);
      expect(sequence.reasoning).toContain('No questions available');
    });
  });

  describe('updateLearningProgress', () => {
    it('should increase difficulty after correct answers', async () => {
      // Arrange
      const userId = 'user-correct-answers';
      const responses = [
        { questionId: 'q1', isCorrect: true, timeSpent: 30 },
        { questionId: 'q2', isCorrect: true, timeSpent: 25 },
        { questionId: 'q3', isCorrect: true, timeSpent: 35 },
      ];

      const mockUser = { id: userId, selectedBranch: 'ARMY', quizzes: [] };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const progress = await service.updateLearningProgress(userId, responses);

      // Assert
      expect(progress).toBeDefined();
      expect(progress.accuracyRate).toBe(1.0); // 100% correct
      expect(progress.recommendedDifficulty).toBe('MEDIUM'); // Should increase
      expect(progress.masteryLevel).toBeGreaterThan(5); // Should improve
      expect(progress.feedback).toContain('Outstanding performance');
    });

    it('should decrease difficulty after incorrect answers', async () => {
      // Arrange
      const userId = 'user-incorrect-answers';
      const responses = [
        { questionId: 'q1', isCorrect: false, timeSpent: 60 },
        { questionId: 'q2', isCorrect: false, timeSpent: 45 },
        { questionId: 'q3', isCorrect: true, timeSpent: 30 },
      ];

      const mockUser = { id: userId, selectedBranch: 'NAVY', quizzes: [] };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const progress = await service.updateLearningProgress(userId, responses);

      // Assert
      expect(progress.accuracyRate).toBeCloseTo(0.33, 2); // 33% correct
      expect(progress.recommendedDifficulty).toBe('EASY'); // Should decrease
      expect(progress.masteryLevel).toBeLessThan(5); // Should decrease
      expect(progress.feedback).toContain('need additional practice');
    });

    it('should provide branch-specific motivational feedback', async () => {
      // Arrange
      const userId = 'space-force-user';
      const responses = [
        { questionId: 'q1', isCorrect: true, timeSpent: 30 },
        { questionId: 'q2', isCorrect: true, timeSpent: 25 },
      ];

      const mockUser = { id: userId, selectedBranch: 'SPACE_FORCE', quizzes: [] };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const progress = await service.updateLearningProgress(userId, responses);

      // Assert
      expect(progress.feedback).toContain('Guardian'); // Space Force terminology
      expect(progress.feedback).toContain('Semper Supra'); // Space Force motto
    });
  });

  describe('generateLearningPath', () => {
    it('should create comprehensive learning path for ASVAB categories', async () => {
      // Arrange
      const userId = 'path-user-123';
      const targetScore = 75;
      const mockUser = {
        id: userId,
        selectedBranch: 'MARINES',
        quizzes: [
          { category: 'ARITHMETIC_REASONING', score: 60 },
          { category: 'WORD_KNOWLEDGE', score: 70 },
          { category: 'MATHEMATICS_KNOWLEDGE', score: 50 },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.question.count.mockResolvedValue(100); // Mock question count

      // Act
      const learningPath = await service.generateLearningPath(userId, targetScore);

      // Assert
      expect(learningPath).toBeDefined();
      expect(learningPath.targetScore).toBe(targetScore);
      expect(learningPath.estimatedDuration).toBeGreaterThan(0);
      expect(learningPath.milestones).toHaveLength(4); // 4 weekly milestones
      
      // Should prioritize weak areas (Mathematics Knowledge with score 50)
      const mathNode = learningPath.learningNodes.find(node => 
        node.category === 'MATHEMATICS_KNOWLEDGE'
      );
      expect(mathNode).toBeDefined();
      expect(mathNode?.priority).toBe('HIGH');
    });

    it('should adapt path based on military branch requirements', async () => {
      // Arrange
      const userId = 'coast-guard-user';
      const mockUser = {
        id: userId,
        selectedBranch: 'COAST_GUARD',
        quizzes: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.question.count.mockResolvedValue(50);

      // Act
      const learningPath = await service.generateLearningPath(userId, 70);

      // Assert
      expect(learningPath.branchContext.branch).toBe('COAST_GUARD');
      expect(learningPath.branchContext.motto).toBe('Semper Paratus');
      expect(learningPath.branchContext.relevantJobs).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Marine Science'),
        ])
      );
    });

    it('should save learning path to database', async () => {
      // Arrange
      const userId = 'save-path-user';
      const mockUser = { id: userId, selectedBranch: 'AIR_FORCE', quizzes: [] };
      const mockSavedPath = { id: 'path-123', userId, targetScore: 80 };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.question.count.mockResolvedValue(75);
      mockPrismaService.learningPath.create.mockResolvedValue(mockSavedPath);

      // Act
      const learningPath = await service.generateLearningPath(userId, 80);

      // Assert
      expect(mockPrismaService.learningPath.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          targetScore: 80,
          currentMilestone: 0,
          isActive: true,
        }),
      });
      expect(learningPath.pathId).toBe('path-123');
    });
  });

  describe('calculateProficiencyLevel', () => {
    it('should calculate accurate proficiency levels', async () => {
      // Arrange
      const userId = 'proficiency-test-user';
      const category = 'PARAGRAPH_COMPREHENSION';
      const mockQuizzes = [
        {
          category: 'PARAGRAPH_COMPREHENSION',
          score: 85,
          completedAt: new Date('2023-12-01'),
          questions: [
            { category: 'PARAGRAPH_COMPREHENSION', difficulty: 'MEDIUM', isCorrect: true },
            { category: 'PARAGRAPH_COMPREHENSION', difficulty: 'HARD', isCorrect: false },
          ],
        },
        {
          category: 'PARAGRAPH_COMPREHENSION',
          score: 75,
          completedAt: new Date('2023-11-15'),
          questions: [
            { category: 'PARAGRAPH_COMPREHENSION', difficulty: 'EASY', isCorrect: true },
            { category: 'PARAGRAPH_COMPREHENSION', difficulty: 'MEDIUM', isCorrect: true },
          ],
        },
      ];

      mockPrismaService.quiz.findMany.mockResolvedValue(mockQuizzes);

      // Act
      const proficiencyLevel = await service.calculateProficiencyLevel(userId, category);

      // Assert
      expect(proficiencyLevel).toBeGreaterThan(0);
      expect(proficiencyLevel).toBeLessThanOrEqual(10);
      // With improving scores (75 -> 85), should be above average
      expect(proficiencyLevel).toBeGreaterThan(5);
    });

    it('should return default proficiency for new users', async () => {
      // Arrange
      const userId = 'new-user-proficiency';
      const category = 'ASSEMBLING_OBJECTS';
      mockPrismaService.quiz.findMany.mockResolvedValue([]);

      // Act
      const proficiencyLevel = await service.calculateProficiencyLevel(userId, category);

      // Assert
      expect(proficiencyLevel).toBe(5); // Default middle level for new users
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in adaptive sequence generation', async () => {
      // Arrange
      const userId = 'error-user';
      const category = 'GENERAL_SCIENCE';
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(
        service.generateAdaptiveSequence(userId, category, 5)
      ).rejects.toThrow('Failed to generate adaptive sequence');
    });

    it('should handle missing user gracefully', async () => {
      // Arrange
      const userId = 'missing-user';
      const category = 'WORD_KNOWLEDGE';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateAdaptiveSequence(userId, category, 5)
      ).rejects.toThrow('User not found');
    });
  });

  // Helper function to create mock questions
  function createMockQuestion(overrides = {}) {
    return {
      id: 'mock-question-id',
      content: 'Mock question content',
      category: 'ARITHMETIC_REASONING',
      difficulty: 'MEDIUM',
      correctAnswer: 'A',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      explanation: 'Mock explanation',
      tags: ['mock', 'test'],
      branchRelevance: ['ARMY', 'NAVY', 'AIR_FORCE', 'MARINES'],
      isActive: true,
      createdAt: new Date(),
      ...overrides,
    };
  }
});