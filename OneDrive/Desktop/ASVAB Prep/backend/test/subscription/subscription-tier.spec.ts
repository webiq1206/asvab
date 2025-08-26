import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { SubscriptionModule } from '../../src/subscriptions/subscription.module';
import { QuizModule } from '../../src/quizzes/quiz.module';
import { SearchModule } from '../../src/search/search.module';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

describe('Subscription Tier Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SubscriptionModule, QuizModule, SearchModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await setupSubscriptionTestData();
  });

  afterAll(async () => {
    await cleanupSubscriptionTestData();
    await app.close();
  });

  describe('Free Tier Limitations', () => {
    let freeUserToken: string;

    beforeEach(() => {
      freeUserToken = jwtService.sign({
        userId: 'free-tier-user',
        branch: 'ARMY',
        subscriptionTier: 'FREE',
      });
    });

    it('should limit free users to 50 total questions', async () => {
      // Attempt to access more than 50 questions
      const response = await request(app.getHttpServer())
        .get('/api/questions')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.questions.length).toBeLessThanOrEqual(50);
      expect(response.body.metadata.subscriptionLimit).toBe(50);
      expect(response.body.metadata.isLimited).toBe(true);
    });

    it('should restrict free users to 1 quiz per day with max 10 questions', async () => {
      // Take first quiz of the day
      const firstQuizResponse = await request(app.getHttpServer())
        .post('/api/quizzes')
        .send({
          category: 'ARITHMETIC_REASONING',
          difficulty: 'MEDIUM',
          questionCount: 5,
        })
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(201);

      expect(firstQuizResponse.body.id).toBeDefined();

      // Attempt second quiz same day - should be rejected
      const secondQuizResponse = await request(app.getHttpServer())
        .post('/api/quizzes')
        .send({
          category: 'MATHEMATICS_KNOWLEDGE',
          difficulty: 'EASY',
          questionCount: 5,
        })
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(403);

      expect(secondQuizResponse.body.message).toContain('daily quiz limit');
      expect(secondQuizResponse.body.upgradePrompt).toBeDefined();

      // Attempt quiz with more than 10 questions - should be limited
      const largeQuizResponse = await request(app.getHttpServer())
        .post('/api/quizzes')
        .send({
          category: 'WORD_KNOWLEDGE',
          difficulty: 'MEDIUM',
          questionCount: 15, // Exceeds free tier limit
        })
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(400);

      expect(largeQuizResponse.body.message).toContain('question limit');
    });

    it('should limit free users to 3 categories only', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/questions/categories')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.availableCategories.length).toBe(3);
      expect(response.body.lockedCategories.length).toBeGreaterThan(0);
      
      // Should include core categories for free tier
      const availableCategories = response.body.availableCategories.map((cat: any) => cat.name);
      expect(availableCategories).toContain('ARITHMETIC_REASONING');
      expect(availableCategories).toContain('WORD_KNOWLEDGE');
      expect(availableCategories).toContain('PARAGRAPH_COMPREHENSION');
    });

    it('should provide only basic explanations for free users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/questions/test-question-basic')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.explanation).toBeDefined();
      expect(response.body.explanationPremium).toBeUndefined();
      expect(response.body.explanationType).toBe('BASIC');
    });

    it('should limit free users to 5 quiz history entries', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/quizzes/history')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.quizzes.length).toBeLessThanOrEqual(5);
      expect(response.body.totalCount).toBeGreaterThanOrEqual(response.body.quizzes.length);
      
      if (response.body.totalCount > 5) {
        expect(response.body.isLimited).toBe(true);
        expect(response.body.upgradeMessage).toContain('premium');
      }
    });

    it('should restrict free users to weekly notifications only', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.maxFrequency).toBe('WEEKLY');
      expect(response.body.availableTypes).not.toContain('DAILY');
      expect(response.body.availableTypes).not.toContain('REAL_TIME');
    });

    it('should block premium features with upgrade prompts', async () => {
      const premiumEndpoints = [
        { path: '/api/quizzes/full-asvab', method: 'post' },
        { path: '/api/ai/coaching', method: 'get' },
        { path: '/api/flashcards', method: 'get' },
        { path: '/api/military/jobs', method: 'get' },
        { path: '/api/social/study-groups', method: 'get' },
        { path: '/api/analytics/detailed', method: 'get' },
      ];

      for (const endpoint of premiumEndpoints) {
        const response = await request(app.getHttpServer())
          [endpoint.method as keyof request.SuperTest<request.Test>](endpoint.path)
          .set('Authorization', `Bearer ${freeUserToken}`)
          .expect(403);

        expect(response.body.isPremiumFeature).toBe(true);
        expect(response.body.upgradePrompt).toBeDefined();
        expect(response.body.upgradePrompt.price).toBe('$9.97/month');
        expect(response.body.upgradePrompt.trialAvailable).toBe(true);
      }
    });
  });

  describe('Premium Tier Features', () => {
    let premiumUserToken: string;

    beforeEach(() => {
      premiumUserToken = jwtService.sign({
        userId: 'premium-tier-user',
        branch: 'NAVY',
        subscriptionTier: 'PREMIUM',
      });
    });

    it('should allow unlimited questions for premium users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/questions')
        .query({ limit: 500 })
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.questions.length).toBeGreaterThan(50);
      expect(response.body.metadata.subscriptionLimit).toBeNull();
      expect(response.body.metadata.isLimited).toBe(false);
    });

    it('should allow unlimited quizzes for premium users', async () => {
      // Take multiple quizzes in same day
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/quizzes')
          .send({
            category: 'MATHEMATICS_KNOWLEDGE',
            difficulty: 'MEDIUM',
            questionCount: 20, // More than free tier limit
          })
          .set('Authorization', `Bearer ${premiumUserToken}`)
          .expect(201);

        expect(response.body.id).toBeDefined();
        expect(response.body.questions.length).toBe(20);
      }
    });

    it('should provide access to all ASVAB categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/questions/categories')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.availableCategories.length).toBeGreaterThan(3);
      expect(response.body.lockedCategories.length).toBe(0);
      
      const allCategories = [
        'GENERAL_SCIENCE',
        'ARITHMETIC_REASONING',
        'WORD_KNOWLEDGE',
        'PARAGRAPH_COMPREHENSION',
        'MATHEMATICS_KNOWLEDGE',
        'ELECTRONICS_INFORMATION',
        'AUTO_INFORMATION',
        'SHOP_INFORMATION',
        'MECHANICAL_COMPREHENSION',
        'ASSEMBLING_OBJECTS',
      ];

      const availableNames = response.body.availableCategories.map((cat: any) => cat.name);
      allCategories.forEach(category => {
        expect(availableNames).toContain(category);
      });
    });

    it('should provide premium explanations with detailed content', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/questions/test-question-premium')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.explanation).toBeDefined();
      expect(response.body.explanationPremium).toBeDefined();
      expect(response.body.explanationType).toBe('PREMIUM');
      expect(response.body.explanationPremium.length).toBeGreaterThan(response.body.explanation.length);
    });

    it('should allow full ASVAB replica exam', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/quizzes/full-asvab')
        .send({
          includeAllCategories: true,
          timeLimit: 149, // Full ASVAB time limit in minutes
        })
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.isFullASVAB).toBe(true);
      expect(response.body.questions.length).toBeGreaterThan(100);
      expect(response.body.timeLimit).toBe(149 * 60); // Convert to seconds
    });

    it('should provide AI coaching features', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/ai/coaching')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.personalizedCoaching).toBeDefined();
      expect(response.body.personalizedCoaching.greeting).toContain('Sailor'); // Navy branch
      expect(response.body.personalizedCoaching.recommendations).toBeInstanceOf(Array);
      expect(response.body.personalizedCoaching.dailyMissions).toBeInstanceOf(Array);
    });

    it('should allow access to flashcards with spaced repetition', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/flashcards')
        .query({ category: 'WORD_KNOWLEDGE', limit: 50 })
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.flashcards).toBeInstanceOf(Array);
      expect(response.body.spacedRepetition).toBeDefined();
      expect(response.body.nextReviewDate).toBeDefined();
    });

    it('should provide access to military jobs database', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/military/jobs')
        .query({ branch: 'NAVY' })
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.jobs).toBeInstanceOf(Array);
      expect(response.body.jobs.length).toBeGreaterThan(0);
      
      response.body.jobs.forEach((job: any) => {
        expect(job.title).toBeDefined();
        expect(job.description).toBeDefined();
        expect(job.minAfqtScore).toBeDefined();
        expect(job.branch).toBe('NAVY');
      });
    });

    it('should allow social features and study groups', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/social/study-groups')
        .query({ branch: 'NAVY' })
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.studyGroups).toBeInstanceOf(Array);
      expect(response.body.canCreateGroups).toBe(true);
      expect(response.body.maxGroupMembership).toBeGreaterThan(0);
    });

    it('should provide detailed analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/detailed')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.performanceMetrics).toBeDefined();
      expect(response.body.learningTrends).toBeDefined();
      expect(response.body.categoryBreakdown).toBeDefined();
      expect(response.body.predictedScores).toBeDefined();
      expect(response.body.improvementSuggestions).toBeDefined();
    });

    it('should allow daily intelligent notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(response.body.maxFrequency).toBe('REAL_TIME');
      expect(response.body.availableTypes).toContain('DAILY');
      expect(response.body.availableTypes).toContain('SMART_REMINDERS');
      expect(response.body.availableTypes).toContain('PERFORMANCE_ALERTS');
    });
  });

  describe('Trial Management', () => {
    let trialUserToken: string;

    beforeEach(() => {
      trialUserToken = jwtService.sign({
        userId: 'trial-user',
        branch: 'AIR_FORCE',
        subscriptionTier: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
    });

    it('should provide full premium features during active trial', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/ai/coaching')
        .set('Authorization', `Bearer ${trialUserToken}`)
        .expect(200);

      expect(response.body.personalizedCoaching).toBeDefined();
      expect(response.body.trialStatus).toBeDefined();
      expect(response.body.trialStatus.isActive).toBe(true);
      expect(response.body.trialStatus.daysRemaining).toBeGreaterThan(0);
    });

    it('should show trial status and conversion prompts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${trialUserToken}`)
        .expect(200);

      expect(response.body.tier).toBe('TRIAL');
      expect(response.body.trialDaysRemaining).toBeGreaterThan(0);
      expect(response.body.conversionOffer).toBeDefined();
      expect(response.body.conversionOffer.discountPercent).toBeGreaterThan(0);
    });

    it('should handle expired trial gracefully', async () => {
      const expiredTrialToken = jwtService.sign({
        userId: 'expired-trial-user',
        branch: 'MARINES',
        subscriptionTier: 'TRIAL',
        trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      });

      const response = await request(app.getHttpServer())
        .get('/api/ai/coaching')
        .set('Authorization', `Bearer ${expiredTrialToken}`)
        .expect(403);

      expect(response.body.trialExpired).toBe(true);
      expect(response.body.upgradeRequired).toBe(true);
      expect(response.body.specialOffer).toBeDefined();
    });
  });

  describe('Subscription Transitions', () => {
    it('should handle free to premium upgrade', async () => {
      const userId = 'upgrade-test-user';
      const userToken = jwtService.sign({
        userId,
        branch: 'COAST_GUARD',
        subscriptionTier: 'FREE',
      });

      // Simulate subscription upgrade
      await request(app.getHttpServer())
        .post('/api/subscription/upgrade')
        .send({
          tier: 'PREMIUM',
          paymentToken: 'mock-payment-token',
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify upgrade in database
      const user = await prismaService.user.findUnique({
        where: { id: userId },
      });

      expect(user?.subscriptionTier).toBe('PREMIUM');
      expect(user?.subscriptionStartedAt).toBeDefined();
    });

    it('should handle premium to free downgrade', async () => {
      const userId = 'downgrade-test-user';
      const userToken = jwtService.sign({
        userId,
        branch: 'SPACE_FORCE',
        subscriptionTier: 'PREMIUM',
      });

      await request(app.getHttpServer())
        .post('/api/subscription/cancel')
        .send({
          reason: 'Testing downgrade',
          feedbackProvided: true,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should maintain premium until end of billing period
      const user = await prismaService.user.findUnique({
        where: { id: userId },
      });

      expect(user?.subscriptionTier).toBe('PREMIUM'); // Still premium
      expect(user?.subscriptionEndsAt).toBeDefined(); // But with end date
    });
  });

  describe('Payment Integration', () => {
    it('should validate App Store receipts', async () => {
      const userToken = jwtService.sign({
        userId: 'appstore-user',
        branch: 'ARMY',
        subscriptionTier: 'FREE',
      });

      const mockReceipt = {
        receiptData: 'mock-app-store-receipt-data',
        transactionId: 'mock-transaction-id',
        productId: 'com.asvabprep.premium.monthly',
      };

      await request(app.getHttpServer())
        .post('/api/subscription/apple/validate')
        .send(mockReceipt)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200); // Should validate (mocked)
    });

    it('should handle Google Play billing', async () => {
      const userToken = jwtService.sign({
        userId: 'googleplay-user',
        branch: 'NAVY',
        subscriptionTier: 'FREE',
      });

      const mockPurchase = {
        purchaseToken: 'mock-google-play-token',
        packageName: 'com.asvabprep.mobile',
        productId: 'premium_monthly',
      };

      await request(app.getHttpServer())
        .post('/api/subscription/google/validate')
        .send(mockPurchase)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  // Helper functions
  async function setupSubscriptionTestData() {
    const testUsers = [
      {
        id: 'free-tier-user',
        email: 'free@subscription.test',
        passwordHash: 'hashed',
        selectedBranch: 'ARMY',
        subscriptionTier: 'FREE',
      },
      {
        id: 'premium-tier-user',
        email: 'premium@subscription.test',
        passwordHash: 'hashed',
        selectedBranch: 'NAVY',
        subscriptionTier: 'PREMIUM',
        subscriptionStartedAt: new Date(),
      },
      {
        id: 'trial-user',
        email: 'trial@subscription.test',
        passwordHash: 'hashed',
        selectedBranch: 'AIR_FORCE',
        subscriptionTier: 'TRIAL',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'expired-trial-user',
        email: 'expired@subscription.test',
        passwordHash: 'hashed',
        selectedBranch: 'MARINES',
        subscriptionTier: 'TRIAL',
        trialStartedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'upgrade-test-user',
        email: 'upgrade@subscription.test',
        passwordHash: 'hashed',
        selectedBranch: 'COAST_GUARD',
        subscriptionTier: 'FREE',
      },
      {
        id: 'downgrade-test-user',
        email: 'downgrade@subscription.test',
        passwordHash: 'hashed',
        selectedBranch: 'SPACE_FORCE',
        subscriptionTier: 'PREMIUM',
        subscriptionStartedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const user of testUsers) {
      await prismaService.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
    }

    // Create test questions with different explanation levels
    const testQuestions = [
      {
        id: 'test-question-basic',
        content: 'What is 15% of 200?',
        category: 'ARITHMETIC_REASONING',
        difficulty: 'MEDIUM',
        correctAnswer: 'B',
        options: JSON.stringify(['25', '30', '35', '40']),
        explanation: 'To find 15% of 200, multiply 200 × 0.15 = 30',
        explanationPremium: 'To find 15% of 200: Convert 15% to decimal (15 ÷ 100 = 0.15), then multiply 200 × 0.15 = 30. Alternative method: 10% of 200 = 20, so 5% = 10, therefore 15% = 20 + 10 = 30. This type of percentage calculation is common in military logistics and resource allocation.',
        tags: JSON.stringify(['percentages', 'basic']),
        branchRelevance: JSON.stringify(['ARMY', 'NAVY']),
        isActive: true,
      },
      {
        id: 'test-question-premium',
        content: 'A military convoy travels at 45 mph for 2.5 hours, then 60 mph for 1.5 hours. What is the total distance?',
        category: 'MATHEMATICS_KNOWLEDGE',
        difficulty: 'HARD',
        correctAnswer: 'C',
        options: JSON.stringify(['180 miles', '195 miles', '202.5 miles', '210 miles']),
        explanation: 'Distance = Speed × Time. First leg: 45 × 2.5 = 112.5 miles. Second leg: 60 × 1.5 = 90 miles. Total: 112.5 + 90 = 202.5 miles',
        explanationPremium: 'This is a multi-part distance calculation common in military operations planning. Step-by-step: First segment: Distance₁ = 45 mph × 2.5 hours = 112.5 miles. Second segment: Distance₂ = 60 mph × 1.5 hours = 90 miles. Total distance = 112.5 + 90 = 202.5 miles. Military applications: convoy planning, supply route calculations, mission timing. Key insight: Always break complex problems into simpler parts. This problem type appears frequently on ASVAB Mathematics Knowledge sections.',
        tags: JSON.stringify(['distance', 'time', 'military', 'convoy']),
        branchRelevance: JSON.stringify(['ARMY', 'MARINES', 'AIR_FORCE']),
        isActive: true,
      },
    ];

    for (const question of testQuestions) {
      await prismaService.question.upsert({
        where: { id: question.id },
        update: {},
        create: question,
      });
    }
  }

  async function cleanupSubscriptionTestData() {
    const testEmails = [
      'free@subscription.test',
      'premium@subscription.test',
      'trial@subscription.test',
      'expired@subscription.test',
      'upgrade@subscription.test',
      'downgrade@subscription.test',
      'appstore@subscription.test',
      'googleplay@subscription.test',
    ];

    await prismaService.user.deleteMany({
      where: { email: { in: testEmails } },
    });

    await prismaService.question.deleteMany({
      where: { id: { in: ['test-question-basic', 'test-question-premium'] } },
    });
  }
});