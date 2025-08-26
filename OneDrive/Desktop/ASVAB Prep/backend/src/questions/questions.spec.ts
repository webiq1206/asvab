import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionTier, QuestionCategory, QuestionDifficulty } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    question: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
    questionAttempt: {
      create: jest.fn(),
      count: jest.fn(),
    },
    userProgress: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    questionSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuestions', () => {
    it('should return standardized ASVAB questions', async () => {
      const mockQuestions = [
        {
          id: '1',
          content: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          category: QuestionCategory.ARITHMETIC_REASONING,
          difficulty: QuestionDifficulty.MEDIUM,
          tags: ['test'],
        },
      ];

      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);
      mockPrismaService.question.count.mockResolvedValue(1);
      mockPrismaService.questionAttempt.count.mockResolvedValue(10);

      const result = await service.getQuestions(
        { limit: 10, offset: 0 },
        SubscriptionTier.FREE
      );

      expect(result.questions).toEqual(mockQuestions);
      expect(result.totalCount).toBe(1);
      expect(result.remainingQuestions).toBe(40); // 50 - 10 attempts
      expect(mockPrismaService.question.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
        select: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw ForbiddenException when free user exceeds question limit', async () => {
      mockPrismaService.questionAttempt.count.mockResolvedValue(50);

      await expect(
        service.getQuestions(
          { limit: 10, offset: 0, userId: 'user1' },
          SubscriptionTier.FREE
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not check limits for premium users', async () => {
      const mockQuestions = [];
      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);
      mockPrismaService.question.count.mockResolvedValue(0);

      const result = await service.getQuestions(
        { limit: 10, offset: 0, userId: 'user1' },
        SubscriptionTier.PREMIUM
      );

      expect(result.remainingQuestions).toBe(-1); // Unlimited
      expect(mockPrismaService.questionAttempt.count).not.toHaveBeenCalled();
    });
  });

  describe('getQuestionById', () => {
    it('should return question with premium explanation for premium user', async () => {
      const mockQuestion = {
        id: '1',
        content: 'Test question',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 1,
        category: QuestionCategory.ARITHMETIC_REASONING,
        difficulty: QuestionDifficulty.MEDIUM,
        tags: ['test'],
        explanationBasic: 'Basic explanation',
        explanationPremium: 'Premium explanation with military context',
        isActive: true,
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await service.getQuestionById(
        '1',
        SubscriptionTier.PREMIUM
      );

      expect(result.explanation).toBe('Premium explanation with military context');
      expect(result.isPremiumExplanation).toBe(true);
    });

    it('should return question with basic explanation for free user', async () => {
      const mockQuestion = {
        id: '1',
        content: 'Test question',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 1,
        category: QuestionCategory.ARITHMETIC_REASONING,
        difficulty: QuestionDifficulty.MEDIUM,
        tags: ['test'],
        explanationBasic: 'Basic explanation',
        explanationPremium: 'Premium explanation',
        isActive: true,
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await service.getQuestionById(
        '1',
        SubscriptionTier.FREE
      );

      expect(result.explanation).toBe('Basic explanation');
      expect(result.isPremiumExplanation).toBe(false);
    });

    it('should throw NotFoundException for inactive question', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue({
        isActive: false,
      });

      await expect(
        service.getQuestionById('1', SubscriptionTier.FREE)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitAnswer', () => {
    it('should create question attempt and return result', async () => {
      const mockQuestion = {
        id: '1',
        correctAnswer: 1,
        category: QuestionCategory.ARITHMETIC_REASONING,
        explanationBasic: 'Basic explanation',
        isActive: true,
      };

      const mockAttempt = {
        id: 'attempt1',
        userId: 'user1',
        questionId: '1',
        userAnswer: 1,
        isCorrect: true,
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.questionAttempt.create.mockResolvedValue(mockAttempt);
      
      // Mock updateUserProgress dependencies
      mockPrismaService.userProgress.findUnique.mockResolvedValue(null);
      mockPrismaService.userProgress.create.mockResolvedValue({});

      const result = await service.submitAnswer('1', 1, 'user1');

      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe(1);
      expect(result.explanation).toBe('Basic explanation');
      expect(result.attemptId).toBe('attempt1');
      expect(mockPrismaService.questionAttempt.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          questionId: '1',
          userAnswer: 1,
          isCorrect: true,
          timeSpent: 0,
        },
      });
    });

    it('should return incorrect result for wrong answer', async () => {
      const mockQuestion = {
        id: '1',
        correctAnswer: 1,
        category: QuestionCategory.ARITHMETIC_REASONING,
        explanationBasic: 'Basic explanation',
        isActive: true,
      };

      const mockAttempt = {
        id: 'attempt1',
        userId: 'user1',
        questionId: '1',
        userAnswer: 2,
        isCorrect: false,
      };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.questionAttempt.create.mockResolvedValue(mockAttempt);
      
      // Mock updateUserProgress dependencies
      mockPrismaService.userProgress.findUnique.mockResolvedValue(null);
      mockPrismaService.userProgress.create.mockResolvedValue({});

      const result = await service.submitAnswer('1', 2, 'user1');

      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswer).toBe(1);
    });
  });

  describe('getCategories', () => {
    it('should return all ASVAB categories with question counts', async () => {
      // Mock groupBy result for categories
      mockPrismaService.question.groupBy.mockResolvedValue([
        {
          category: QuestionCategory.ARITHMETIC_REASONING,
          _count: { id: 25 }
        },
        {
          category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
          _count: { id: 30 }
        }
      ]);

      const result = await service.getCategories();

      expect(result).toEqual([
        {
          category: QuestionCategory.ARITHMETIC_REASONING,
          questionCount: 25,
        },
        {
          category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
          questionCount: 30,
        }
      ]);

      // Should filter out categories with 0 questions
      expect(result.every(cat => cat.questionCount > 0)).toBe(true);
    });
  });

  describe('searchQuestions', () => {
    it('should return search results for ASVAB questions', async () => {
      const mockResults = [
        {
          id: '1',
          content: 'Algebra question',
          category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
          difficulty: QuestionDifficulty.MEDIUM,
          tags: ['algebra'],
        },
      ];

      mockPrismaService.question.findMany.mockResolvedValue(mockResults);

      const result = await service.searchQuestions('algebra', 10);

      expect(result).toEqual(mockResults);
      expect(mockPrismaService.question.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { content: { contains: 'algebra', mode: 'insensitive' } },
            { tags: { has: 'algebra' } },
          ],
        },
        select: expect.any(Object),
        take: 10,
      });
    });
  });
});