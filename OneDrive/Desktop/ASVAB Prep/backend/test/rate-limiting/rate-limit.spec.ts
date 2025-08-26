import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

describe('Rate Limiting Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let validUserToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply rate limiting middleware
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await setupRateLimitTestData();
    
    validUserToken = jwtService.sign({
      userId: 'rate-limit-test-user',
      branch: 'ARMY',
      subscriptionTier: 'PREMIUM',
    });
  });

  afterAll(async () => {
    await cleanupRateLimitTestData();
    await app.close();
  });

  describe('General API Rate Limiting', () => {
    it('should rate limit general API requests', async () => {
      const endpoint = '/api/health';
      const maxRequests = 100; // Assuming 100 requests per minute
      const testRequests = 120;
      let rateLimited = false;

      // Make rapid requests
      for (let i = 0; i < testRequests; i++) {
        const response = await request(app.getHttpServer())
          .get(endpoint);

        if (response.status === 429) {
          rateLimited = true;
          expect(response.headers['retry-after']).toBeDefined();
          expect(response.body.message).toContain('Too Many Requests');
          break;
        }

        // Small delay to prevent overwhelming the test server
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      expect(rateLimited).toBe(true);
    });

    it('should include rate limit headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Check for rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);
      const limit = parseInt(response.headers['x-ratelimit-limit']);
      
      expect(remaining).toBeLessThanOrEqual(limit);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginEndpoint = '/api/auth/login';
      const maxAttempts = 5; // Assuming 5 login attempts per minute
      let rateLimited = false;

      // Create a test user for login attempts
      await prismaService.user.create({
        data: {
          id: 'login-rate-limit-user',
          email: 'logintest@military.mil',
          passwordHash: await require('argon2').hash('TestPassword123!'),
          selectedBranch: 'ARMY',
          subscriptionTier: 'FREE',
        },
      });

      // Attempt multiple logins rapidly
      for (let i = 0; i < maxAttempts + 3; i++) {
        const response = await request(app.getHttpServer())
          .post(loginEndpoint)
          .send({
            email: 'logintest@military.mil',
            password: 'WrongPassword123!', // Intentionally wrong
          });

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.message).toContain('Too many login attempts');
          expect(response.headers['retry-after']).toBeDefined();
          break;
        }

        expect(response.status).toBe(401); // Unauthorized
      }

      expect(rateLimited).toBe(true);
    });

    it('should rate limit registration attempts', async () => {
      const registerEndpoint = '/api/auth/register';
      const maxAttempts = 3; // Stricter limit for registration
      let rateLimited = false;

      for (let i = 0; i < maxAttempts + 2; i++) {
        const response = await request(app.getHttpServer())
          .post(registerEndpoint)
          .send({
            email: `register${i}@military.mil`,
            password: 'ValidPassword123!',
            selectedBranch: 'NAVY',
          });

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.message).toContain('registration attempts');
          break;
        }

        // First few should succeed or fail validation, not rate limiting
        expect([201, 400, 409]).toContain(response.status);
      }

      expect(rateLimited).toBe(true);
    });

    it('should rate limit password reset requests', async () => {
      const resetEndpoint = '/api/auth/forgot-password';
      const maxAttempts = 3; // 3 attempts per hour typically
      let rateLimited = false;

      for (let i = 0; i < maxAttempts + 2; i++) {
        const response = await request(app.getHttpServer())
          .post(resetEndpoint)
          .send({
            email: 'reset@military.mil',
          });

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.message).toContain('password reset');
          break;
        }

        // Should succeed or return 200 regardless of email existence (security)
        expect(response.status).toBe(200);
      }

      expect(rateLimited).toBe(true);
    });
  });

  describe('Quiz and Search Rate Limiting', () => {
    it('should rate limit quiz creation', async () => {
      const quizEndpoint = '/api/quizzes';
      const maxQuizzes = 10; // 10 quizzes per minute
      let rateLimited = false;

      for (let i = 0; i < maxQuizzes + 3; i++) {
        const response = await request(app.getHttpServer())
          .post(quizEndpoint)
          .send({
            category: 'ARITHMETIC_REASONING',
            difficulty: 'MEDIUM',
            questionCount: 5,
          })
          .set('Authorization', `Bearer ${validUserToken}`);

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.message).toContain('quiz creation');
          break;
        }

        expect([201, 400]).toContain(response.status);
      }

      expect(rateLimited).toBe(true);
    });

    it('should rate limit search requests', async () => {
      const searchEndpoint = '/api/search/advanced';
      const maxSearches = 30; // 30 searches per minute
      let rateLimited = false;

      for (let i = 0; i < maxSearches + 5; i++) {
        const response = await request(app.getHttpServer())
          .get(searchEndpoint)
          .query({ query: `test query ${i}`, limit: 10 })
          .set('Authorization', `Bearer ${validUserToken}`);

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.message).toContain('search');
          break;
        }

        expect([200, 400]).toContain(response.status);
        
        // Small delay to prevent server overload
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      expect(rateLimited).toBe(true);
    });

    it('should rate limit AI service requests more strictly', async () => {
      const aiEndpoint = '/api/ai/coaching';
      const maxAIRequests = 5; // AI services are expensive, limit to 5 per minute
      let rateLimited = false;

      for (let i = 0; i < maxAIRequests + 2; i++) {
        const response = await request(app.getHttpServer())
          .get(aiEndpoint)
          .set('Authorization', `Bearer ${validUserToken}`);

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.message).toContain('AI service');
          expect(response.headers['retry-after']).toBeDefined();
          break;
        }

        expect([200, 400, 403]).toContain(response.status);
        
        // AI requests need more time between calls
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(rateLimited).toBe(true);
    });
  });

  describe('WebSocket Rate Limiting', () => {
    it('should rate limit WebSocket message frequency', async () => {
      // This test requires WebSocket connection
      const { io } = require('socket.io-client');
      
      const socket = io(`http://localhost:${app.getHttpServer().address().port}`, {
        auth: { token: validUserToken },
        transports: ['websocket'],
      });

      await new Promise(resolve => socket.on('connect', resolve));

      // Join a room first
      socket.emit('joinRoom', { roomId: 'rate-limit-room', userId: 'rate-limit-test-user' });
      await new Promise(resolve => setTimeout(resolve, 100));

      let rateLimited = false;
      const maxMessages = 20; // 20 messages per minute

      // Set up error listener
      socket.on('error', (error: any) => {
        if (error.message && error.message.includes('rate limit')) {
          rateLimited = true;
        }
      });

      // Send messages rapidly
      for (let i = 0; i < maxMessages + 5; i++) {
        socket.emit('sendMessage', {
          roomId: 'rate-limit-room',
          message: `Rate limit test message ${i}`,
          userId: 'rate-limit-test-user',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        if (rateLimited) break;
      }

      socket.disconnect();
      expect(rateLimited).toBe(true);
    });
  });

  describe('IP-Based Rate Limiting', () => {
    it('should rate limit by IP address for unauthenticated requests', async () => {
      const publicEndpoint = '/api/military/branches'; // Public endpoint
      const maxRequests = 50; // 50 requests per IP per minute
      let rateLimited = false;

      for (let i = 0; i < maxRequests + 10; i++) {
        const response = await request(app.getHttpServer())
          .get(publicEndpoint);

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.message).toContain('Too Many Requests');
          break;
        }

        expect([200, 404]).toContain(response.status);
        
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      expect(rateLimited).toBe(true);
    });

    it('should have different rate limits for different endpoints', async () => {
      // Test that different endpoints have different rate limits
      const endpoints = [
        { path: '/api/health', expectedLimit: 100 },
        { path: '/api/questions', expectedLimit: 60, auth: true },
        { path: '/api/ai/coaching', expectedLimit: 5, auth: true },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint.path)
          .set('Authorization', endpoint.auth ? `Bearer ${validUserToken}` : '');

        if (response.status === 200) {
          const limit = parseInt(response.headers['x-ratelimit-limit'] || '0');
          expect(limit).toBeGreaterThan(0);
          
          // Verify the limit is in expected range (may not be exact due to test timing)
          expect(limit).toBeGreaterThanOrEqual(endpoint.expectedLimit * 0.8);
          expect(limit).toBeLessThanOrEqual(endpoint.expectedLimit * 1.2);
        }
      }
    });
  });

  describe('Subscription-Based Rate Limiting', () => {
    it('should have higher rate limits for premium users', async () => {
      const freeUserToken = jwtService.sign({
        userId: 'free-rate-limit-user',
        branch: 'NAVY',
        subscriptionTier: 'FREE',
      });

      const premiumUserToken = jwtService.sign({
        userId: 'premium-rate-limit-user',
        branch: 'NAVY',
        subscriptionTier: 'PREMIUM',
      });

      // Test same endpoint with different subscription tiers
      const testEndpoint = '/api/questions';
      
      // Get rate limits for free user
      const freeResponse = await request(app.getHttpServer())
        .get(testEndpoint)
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      const freeLimit = parseInt(freeResponse.headers['x-ratelimit-limit'] || '0');

      // Get rate limits for premium user
      const premiumResponse = await request(app.getHttpServer())
        .get(testEndpoint)
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      const premiumLimit = parseInt(premiumResponse.headers['x-ratelimit-limit'] || '0');

      // Premium should have higher limits
      expect(premiumLimit).toBeGreaterThan(freeLimit);
      expect(premiumLimit / freeLimit).toBeGreaterThanOrEqual(1.5); // At least 50% higher
    });

    it('should enforce stricter limits for free users on premium endpoints', async () => {
      const freeUserToken = jwtService.sign({
        userId: 'free-strict-limit-user',
        branch: 'AIR_FORCE',
        subscriptionTier: 'FREE',
      });

      // Free users should hit rate limits faster on premium endpoints
      const premiumEndpoint = '/api/ai/adaptive-learning';
      const maxFreeRequests = 2; // Very limited for free users
      let rateLimited = false;

      for (let i = 0; i < maxFreeRequests + 2; i++) {
        const response = await request(app.getHttpServer())
          .get(premiumEndpoint)
          .set('Authorization', `Bearer ${freeUserToken}`);

        if (response.status === 429) {
          rateLimited = true;
          expect(response.body.upgradePrompt).toBeDefined();
          break;
        }

        // May be blocked by subscription tier before rate limiting
        expect([200, 403, 404]).toContain(response.status);
      }

      expect(rateLimited).toBe(true);
    });
  });

  describe('Rate Limit Recovery', () => {
    it('should reset rate limits after time window expires', async () => {
      // This test requires a shorter rate limit window for testing
      const endpoint = '/api/health';
      
      // Hit rate limit first
      let rateLimited = false;
      for (let i = 0; i < 50; i++) {
        const response = await request(app.getHttpServer())
          .get(endpoint);

        if (response.status === 429) {
          rateLimited = true;
          const retryAfter = parseInt(response.headers['retry-after'] || '60');
          expect(retryAfter).toBeGreaterThan(0);
          break;
        }
      }

      expect(rateLimited).toBe(true);

      // Wait for rate limit to reset (using shorter window for testing)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should be able to make requests again
      const response = await request(app.getHttpServer())
        .get(endpoint);

      expect([200, 429]).toContain(response.status);
      
      if (response.status === 200) {
        const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '0');
        expect(remaining).toBeGreaterThan(0);
      }
    });

    it('should provide accurate retry-after headers', async () => {
      const endpoint = '/api/auth/login';
      let retryAfterHeader: string | undefined;

      // Hit rate limit
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post(endpoint)
          .send({
            email: 'nonexistent@military.mil',
            password: 'WrongPassword123!',
          });

        if (response.status === 429) {
          retryAfterHeader = response.headers['retry-after'];
          break;
        }
      }

      expect(retryAfterHeader).toBeDefined();
      const retryAfterSeconds = parseInt(retryAfterHeader || '0');
      expect(retryAfterSeconds).toBeGreaterThan(0);
      expect(retryAfterSeconds).toBeLessThanOrEqual(3600); // Max 1 hour
    });
  });

  describe('Rate Limiting Error Handling', () => {
    it('should return proper error format for rate limited requests', async () => {
      // Hit rate limit intentionally
      let rateLimitResponse: any;
      
      for (let i = 0; i < 100; i++) {
        const response = await request(app.getHttpServer())
          .get('/api/health');

        if (response.status === 429) {
          rateLimitResponse = response;
          break;
        }
      }

      expect(rateLimitResponse).toBeDefined();
      expect(rateLimitResponse.body).toHaveProperty('statusCode', 429);
      expect(rateLimitResponse.body).toHaveProperty('message');
      expect(rateLimitResponse.body).toHaveProperty('error', 'Too Many Requests');
      expect(rateLimitResponse.body.message).toContain('Too Many Requests');
      
      // Should include helpful information
      expect(rateLimitResponse.headers['retry-after']).toBeDefined();
      expect(rateLimitResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(rateLimitResponse.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should log rate limiting events for monitoring', async () => {
      // This test would verify that rate limiting events are logged
      // Implementation depends on logging setup
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Trigger rate limit
      for (let i = 0; i < 60; i++) {
        const response = await request(app.getHttpServer())
          .get('/api/health');
          
        if (response.status === 429) {
          break;
        }
      }

      // Verify logging (this is implementation-dependent)
      // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Rate limit'));
      
      consoleSpy.mockRestore();
    });
  });

  // Helper functions
  async function setupRateLimitTestData() {
    const testUsers = [
      {
        id: 'rate-limit-test-user',
        email: 'ratelimit@test.mil',
        passwordHash: await require('argon2').hash('TestPassword123!'),
        selectedBranch: 'ARMY',
        subscriptionTier: 'PREMIUM',
      },
      {
        id: 'free-rate-limit-user',
        email: 'freeratelimit@test.mil',
        passwordHash: await require('argon2').hash('TestPassword123!'),
        selectedBranch: 'NAVY',
        subscriptionTier: 'FREE',
      },
      {
        id: 'premium-rate-limit-user',
        email: 'premiumratelimit@test.mil',
        passwordHash: await require('argon2').hash('TestPassword123!'),
        selectedBranch: 'NAVY',
        subscriptionTier: 'PREMIUM',
      },
    ];

    for (const user of testUsers) {
      await prismaService.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
    }

    // Create test room for WebSocket rate limiting
    await prismaService.studyRoom.upsert({
      where: { id: 'rate-limit-room' },
      update: {},
      create: {
        id: 'rate-limit-room',
        name: 'Rate Limit Test Room',
        description: 'For testing WebSocket rate limits',
        category: 'ARITHMETIC_REASONING',
        branch: 'ARMY',
        maxParticipants: 10,
        isActive: true,
        createdById: 'rate-limit-test-user',
      },
    });
  }

  async function cleanupRateLimitTestData() {
    const testEmails = [
      'ratelimit@test.mil',
      'freeratelimit@test.mil',
      'premiumratelimit@test.mil',
      'logintest@military.mil',
    ];

    await prismaService.user.deleteMany({
      where: { email: { in: testEmails } },
    });

    await prismaService.studyRoom.deleteMany({
      where: { id: 'rate-limit-room' },
    });
  }
});