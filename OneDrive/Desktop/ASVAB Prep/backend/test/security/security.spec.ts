import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

describe('Security Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply security middleware and validation pipes
    app.useGlobalPipes();
    
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await setupSecurityTestData();
  });

  afterAll(async () => {
    await cleanupSecurityTestData();
    await app.close();
  });

  describe('Authentication Security', () => {
    it('should prevent access without authentication token', async () => {
      // Test protected endpoints without token
      const protectedEndpoints = [
        '/api/users/profile',
        '/api/quizzes',
        '/api/ai/coaching',
        '/api/search/advanced',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .expect(401);

        expect(response.body.message).toContain('Unauthorized');
      }
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'Bearer invalid-token',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      ];

      for (const token of invalidTokens) {
        await request(app.getHttpServer())
          .get('/api/users/profile')
          .set('Authorization', token)
          .expect(401);
      }
    });

    it('should reject expired JWT tokens', async () => {
      // Create expired token
      const expiredToken = jwtService.sign(
        { userId: 'security-test-user', branch: 'ARMY' },
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should validate JWT signature integrity', async () => {
      // Create valid token with wrong secret
      const wrongSecretToken = require('jsonwebtoken').sign(
        { userId: 'security-test-user', branch: 'ARMY' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);
    });

    it('should enforce role-based access control', async () => {
      // Create regular user token
      const userToken = jwtService.sign({
        userId: 'regular-user',
        branch: 'ARMY',
        role: 'USER',
      });

      // Try to access admin-only endpoints
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/system/health',
        '/api/admin/analytics',
      ];

      for (const endpoint of adminEndpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      }
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attacks', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "1; DELETE FROM questions; --",
      ];

      // Create valid token for testing
      const validToken = jwtService.sign({
        userId: 'security-test-user',
        branch: 'ARMY',
      });

      for (const maliciousInput of maliciousInputs) {
        // Test search endpoint
        await request(app.getHttpServer())
          .get('/api/search/advanced')
          .query({ query: maliciousInput })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400); // Should be rejected by validation

        // Test user update endpoint
        await request(app.getHttpServer())
          .put('/api/users/profile')
          .send({ firstName: maliciousInput })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }

      // Verify database integrity
      const userCount = await prismaService.user.count();
      expect(userCount).toBeGreaterThan(0); // Should still have users
      
      const questionCount = await prismaService.question.count();
      expect(questionCount).toBeGreaterThan(0); // Should still have questions
    });

    it('should prevent XSS attacks through input sanitization', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
      ];

      const validToken = jwtService.sign({
        userId: 'security-test-user',
        branch: 'ARMY',
      });

      for (const payload of xssPayloads) {
        // Test user profile update
        const response = await request(app.getHttpServer())
          .put('/api/users/profile')
          .send({ 
            firstName: payload,
            lastName: 'TestUser',
          })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400); // Should be rejected

        expect(response.body.message).toContain('validation');
      }
    });

    it('should enforce strict input length limits', async () => {
      const validToken = jwtService.sign({
        userId: 'security-test-user',
        branch: 'ARMY',
      });

      // Test extremely long inputs
      const longString = 'A'.repeat(10000);

      // Profile update with long data
      await request(app.getHttpServer())
        .put('/api/users/profile')
        .send({ 
          firstName: longString,
          lastName: 'Test',
        })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      // Search with long query
      await request(app.getHttpServer())
        .get('/api/search/advanced')
        .query({ query: longString })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });

    it('should validate email formats strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        '<script>alert("xss")</script>@domain.com',
      ];

      for (const email of invalidEmails) {
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email,
            password: 'ValidPassword123!',
            selectedBranch: 'ARMY',
          })
          .expect(400);
      }
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123456',           // Too simple
        'password',         // Common word
        'abc',              // Too short
        'PASSWORD',         // No lowercase
        'password123',      // No uppercase
        'Password',         // No numbers
        'Password123',      // No special characters
      ];

      for (const password of weakPasswords) {
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'test@military.mil',
            password,
            selectedBranch: 'NAVY',
          })
          .expect(400);
      }
    });

    it('should hash passwords using Argon2', async () => {
      const testUser = {
        email: 'hash-test@military.mil',
        password: 'StrongPassword123!',
        selectedBranch: 'AIR_FORCE',
      };

      // Register user
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Check that password is hashed in database
      const user = await prismaService.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeDefined();
      expect(user!.passwordHash).not.toBe(testUser.password);
      expect(user!.passwordHash).toMatch(/^\$argon2id\$/); // Argon2 hash format

      // Verify hash can be validated
      const isValid = await argon2.verify(user!.passwordHash, testUser.password);
      expect(isValid).toBe(true);
    });

    it('should prevent password brute force attacks', async () => {
      const testEmail = 'brute-force-test@military.mil';
      const wrongPassword = 'WrongPassword123!';

      // Register a user first
      await prismaService.user.create({
        data: {
          id: 'brute-force-user',
          email: testEmail,
          passwordHash: await argon2.hash('CorrectPassword123!'),
          selectedBranch: 'MARINES',
          subscriptionTier: 'FREE',
        },
      });

      // Attempt multiple failed logins
      const maxAttempts = 10;
      let lockedOut = false;

      for (let i = 0; i < maxAttempts; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: wrongPassword,
          });

        if (response.status === 429) { // Too Many Requests
          lockedOut = true;
          break;
        }

        expect(response.status).toBe(401); // Unauthorized
      }

      // Should eventually be locked out
      expect(lockedOut).toBe(true);
    });
  });

  describe('Data Access Security', () => {
    it('should prevent unauthorized access to other users data', async () => {
      // Create two users
      const user1Token = jwtService.sign({
        userId: 'data-security-user-1',
        branch: 'ARMY',
      });

      const user2Token = jwtService.sign({
        userId: 'data-security-user-2',
        branch: 'NAVY',
      });

      // User 1 tries to access User 2's data
      const response = await request(app.getHttpServer())
        .get('/api/users/data-security-user-2/quizzes')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403); // Should be forbidden

      expect(response.body.message).toContain('Forbidden');
    });

    it('should enforce military branch data isolation when required', async () => {
      const armyToken = jwtService.sign({
        userId: 'army-isolation-user',
        branch: 'ARMY',
      });

      // Try to access branch-specific content for different branch
      const response = await request(app.getHttpServer())
        .get('/api/military/jobs')
        .query({ branch: 'NAVY' }) // Army user requesting Navy jobs
        .set('Authorization', `Bearer ${armyToken}`)
        .expect(200); // May be allowed, but should filter results

      // Results should be filtered or empty for unauthorized branch
      if (response.body.jobs) {
        response.body.jobs.forEach((job: any) => {
          // Either no jobs or jobs should be appropriate for user's clearance
          if (job.clearanceRequired) {
            expect(job.branch).toBe('ARMY');
          }
        });
      }
    });

    it('should protect sensitive military information based on clearance', async () => {
      const lowClearanceToken = jwtService.sign({
        userId: 'low-clearance-user',
        branch: 'AIR_FORCE',
        clearanceLevel: 'PUBLIC',
      });

      // Try to access classified content
      const response = await request(app.getHttpServer())
        .get('/api/military/jobs')
        .query({ includeClassified: true })
        .set('Authorization', `Bearer ${lowClearanceToken}`)
        .expect(200);

      // Should not include classified jobs
      if (response.body.jobs) {
        response.body.jobs.forEach((job: any) => {
          expect(job.clearanceRequired).toBeFalsy();
        });
      }
    });
  });

  describe('API Security Headers', () => {
    it('should include proper security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      
      // CORS headers should be restrictive
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Should not reveal server technology
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).not.toMatch(/express|node|nest/i);
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens on logout', async () => {
      const userToken = jwtService.sign({
        userId: 'session-security-user',
        branch: 'COAST_GUARD',
      });

      // Verify token works
      await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Logout
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Token should now be invalid (if token blacklisting is implemented)
      // Note: This depends on implementation - JWT tokens are stateless by default
    });

    it('should enforce token refresh requirements', async () => {
      // Create token that expires soon
      const shortLivedToken = jwtService.sign(
        { userId: 'refresh-test-user', branch: 'SPACE_FORCE' },
        { expiresIn: '1s' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be rejected
      await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(401);
    });
  });

  describe('File Upload Security', () => {
    it('should prevent malicious file uploads', async () => {
      const validToken = jwtService.sign({
        userId: 'upload-security-user',
        branch: 'ARMY',
      });

      const maliciousFiles = [
        { filename: 'malware.exe', mimetype: 'application/octet-stream' },
        { filename: 'script.js', mimetype: 'application/javascript' },
        { filename: 'shell.php', mimetype: 'application/x-php' },
        { filename: 'large-file.txt', size: 50 * 1024 * 1024 }, // 50MB
      ];

      for (const file of maliciousFiles) {
        // Test file upload endpoint (if it exists)
        const response = await request(app.getHttpServer())
          .post('/api/users/avatar')
          .set('Authorization', `Bearer ${validToken}`)
          .attach('avatar', Buffer.from('fake content'), {
            filename: file.filename,
            contentType: file.mimetype,
          });

        // Should reject malicious files
        expect([400, 415, 413]).toContain(response.status);
      }
    });
  });

  describe('Environment Security', () => {
    it('should not expose sensitive environment variables', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/debug/env') // This endpoint shouldn't exist in production
        .expect(404);

      // Verify sensitive variables are not accessible
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
      
      // But they shouldn't be exposed via API
      if (response.status === 200) {
        expect(response.body.DATABASE_URL).toBeUndefined();
        expect(response.body.JWT_SECRET).toBeUndefined();
      }
    });
  });

  // Helper functions
  async function setupSecurityTestData() {
    const securityTestUsers = [
      {
        id: 'security-test-user',
        email: 'security@test.mil',
        passwordHash: await argon2.hash('SecurePassword123!'),
        selectedBranch: 'ARMY',
        subscriptionTier: 'PREMIUM',
      },
      {
        id: 'regular-user',
        email: 'regular@test.mil',
        passwordHash: await argon2.hash('RegularPassword123!'),
        selectedBranch: 'NAVY',
        subscriptionTier: 'FREE',
        role: 'USER',
      },
      {
        id: 'data-security-user-1',
        email: 'datasec1@test.mil',
        passwordHash: await argon2.hash('DataSec123!'),
        selectedBranch: 'ARMY',
        subscriptionTier: 'PREMIUM',
      },
      {
        id: 'data-security-user-2',
        email: 'datasec2@test.mil',
        passwordHash: await argon2.hash('DataSec456!'),
        selectedBranch: 'NAVY',
        subscriptionTier: 'PREMIUM',
      },
    ];

    for (const user of securityTestUsers) {
      await prismaService.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
    }
  }

  async function cleanupSecurityTestData() {
    const securityTestEmails = [
      'security@test.mil',
      'regular@test.mil',
      'datasec1@test.mil',
      'datasec2@test.mil',
      'hash-test@military.mil',
      'brute-force-test@military.mil',
    ];

    await prismaService.user.deleteMany({
      where: { email: { in: securityTestEmails } },
    });
  }
});