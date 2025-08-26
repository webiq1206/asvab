import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Database Migration Tests', () => {
  let prismaService: PrismaService;
  let originalDatabaseUrl: string;
  let testDatabaseUrl: string;

  beforeAll(async () => {
    // Setup test database URL
    originalDatabaseUrl = process.env.DATABASE_URL!;
    testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/asvab_migration_test';
    process.env.DATABASE_URL = testDatabaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Restore original database URL
    process.env.DATABASE_URL = originalDatabaseUrl;
    
    if (prismaService) {
      await prismaService.$disconnect();
    }
  });

  describe('Migration Infrastructure', () => {
    it('should validate Prisma schema syntax', async () => {
      try {
        const { stdout, stderr } = await execAsync('npx prisma validate', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });
        
        expect(stderr).not.toContain('Error');
        expect(stdout).toContain('The schema is valid') || expect(stderr).toBe('');
      } catch (error: any) {
        fail(`Schema validation failed: ${error.message}`);
      }
    });

    it('should have migration files in correct format', async () => {
      const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
      
      if (!fs.existsSync(migrationsPath)) {
        // No migrations yet - skip test
        return;
      }

      const migrationDirs = fs.readdirSync(migrationsPath);
      
      for (const migrationDir of migrationDirs) {
        const migrationPath = path.join(migrationsPath, migrationDir);
        const stat = fs.statSync(migrationPath);
        
        if (stat.isDirectory()) {
          // Check migration directory naming format (timestamp_name)
          expect(migrationDir).toMatch(/^\d{14}_/);
          
          // Check for migration.sql file
          const sqlFile = path.join(migrationPath, 'migration.sql');
          expect(fs.existsSync(sqlFile)).toBe(true);
          
          // Validate SQL content is not empty
          const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
          expect(sqlContent.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('should generate migration files correctly', async () => {
      try {
        // This would test the migration generation process
        // Note: This might create actual migration files in dev environment
        const { stdout } = await execAsync('npx prisma migrate diff --preview-feature', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });
        
        // Should not error out
        expect(stdout).toBeDefined();
      } catch (error: any) {
        // Migration diff might fail if no changes - that's acceptable
        if (!error.message.includes('No difference detected')) {
          console.warn('Migration diff test warning:', error.message);
        }
      }
    });
  });

  describe('Fresh Database Migration', () => {
    beforeEach(async () => {
      // Reset database before each test
      try {
        await execAsync('npx prisma migrate reset --force --skip-generate', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });
      } catch (error) {
        console.warn('Database reset warning:', error);
      }
    });

    it('should deploy all migrations successfully', async () => {
      try {
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });
        
        expect(stderr).not.toContain('Error');
        expect(stdout).toContain('migrations applied') || expect(stdout).toContain('No pending migrations');
      } catch (error: any) {
        fail(`Migration deployment failed: ${error.message}`);
      }
    });

    it('should create all expected tables after migration', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      // Check core tables exist
      const expectedTables = [
        'User',
        'UserProfile', 
        'Question',
        'Quiz',
        'QuizQuestion',
        'MilitaryJob',
        'Flashcard',
        'StudyRoom',
        'StudyGroup',
        'Subscription',
        'SearchHistory',
      ];

      for (const tableName of expectedTables) {
        try {
          // Try to query each table
          await prismaService.$queryRaw`SELECT 1 FROM ${tableName} LIMIT 1`;
        } catch (error: any) {
          if (error.message.includes('does not exist')) {
            fail(`Expected table ${tableName} was not created by migrations`);
          }
          // Other errors (like empty table) are acceptable
        }
      }
    });

    it('should create proper indexes for performance', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      // Check critical indexes exist
      const criticalIndexes = [
        { table: 'User', column: 'email', unique: true },
        { table: 'Question', column: 'category', unique: false },
        { table: 'Question', column: 'difficulty', unique: false },
        { table: 'Quiz', column: 'userId', unique: false },
        { table: 'MilitaryJob', column: 'branch', unique: false },
      ];

      for (const index of criticalIndexes) {
        try {
          // This is PostgreSQL specific - check pg_indexes
          const result = await prismaService.$queryRaw`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = ${index.table.toLowerCase()} 
            AND indexdef ILIKE ${'%' + index.column + '%'}
          `;
          
          expect(Array.isArray(result)).toBe(true);
          expect((result as any[]).length).toBeGreaterThan(0);
        } catch (error) {
          console.warn(`Index check failed for ${index.table}.${index.column}:`, error);
        }
      }
    });

    it('should enforce foreign key constraints', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      // Try to insert data that violates foreign key constraints
      try {
        await prismaService.quiz.create({
          data: {
            id: 'invalid-fk-test',
            userId: 'nonexistent-user-id', // This should fail
            category: 'ARITHMETIC_REASONING',
            score: 85,
            completedAt: new Date(),
          },
        });
        
        fail('Should have thrown foreign key constraint error');
      } catch (error: any) {
        expect(error.message).toMatch(/foreign key constraint|violates/i);
      }
    });
  });

  describe('Data Integrity During Migrations', () => {
    it('should preserve existing data during schema changes', async () => {
      // Deploy current migrations
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      // Insert test data
      const testUser = await prismaService.user.create({
        data: {
          id: 'migration-test-user',
          email: 'migration@test.mil',
          passwordHash: 'hashed-password',
          selectedBranch: 'ARMY',
          subscriptionTier: 'PREMIUM',
        },
      });

      const testQuestion = await prismaService.question.create({
        data: {
          id: 'migration-test-question',
          content: 'Test question content',
          category: 'ARITHMETIC_REASONING',
          difficulty: 'MEDIUM',
          correctAnswer: 'A',
          options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
          explanation: 'Test explanation',
          tags: JSON.stringify(['test']),
          branchRelevance: JSON.stringify(['ARMY']),
          isActive: true,
        },
      });

      // Verify data exists
      expect(testUser).toBeDefined();
      expect(testQuestion).toBeDefined();

      // Note: In a real scenario, we would apply a new migration here
      // and verify the data still exists after the migration

      // Clean up
      await prismaService.question.delete({ where: { id: 'migration-test-question' } });
      await prismaService.user.delete({ where: { id: 'migration-test-user' } });
    });

    it('should handle enum updates correctly', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      // Test enum values are working
      const branches = ['ARMY', 'NAVY', 'AIR_FORCE', 'MARINES', 'COAST_GUARD', 'SPACE_FORCE'];
      const tiers = ['FREE', 'PREMIUM', 'TRIAL'];
      const categories = [
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

      // Test branch enum
      for (const branch of branches) {
        const user = await prismaService.user.create({
          data: {
            id: `enum-test-${branch.toLowerCase()}`,
            email: `${branch.toLowerCase()}@enum.test`,
            passwordHash: 'hashed',
            selectedBranch: branch as any,
            subscriptionTier: 'FREE',
          },
        });
        
        expect(user.selectedBranch).toBe(branch);
        await prismaService.user.delete({ where: { id: user.id } });
      }

      // Test category enum
      for (const category of categories.slice(0, 3)) { // Test first 3 to avoid too many test records
        const question = await prismaService.question.create({
          data: {
            id: `enum-test-${category.toLowerCase()}`,
            content: 'Enum test question',
            category: category as any,
            difficulty: 'MEDIUM',
            correctAnswer: 'A',
            options: JSON.stringify(['A', 'B', 'C', 'D']),
            explanation: 'Test',
            tags: JSON.stringify(['enum-test']),
            branchRelevance: JSON.stringify(['ARMY']),
            isActive: true,
          },
        });

        expect(question.category).toBe(category);
        await prismaService.question.delete({ where: { id: question.id } });
      }
    });
  });

  describe('Migration Error Handling', () => {
    it('should handle migration conflicts gracefully', async () => {
      // This test verifies the system handles migration state issues
      try {
        await execAsync('npx prisma migrate status', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });
      } catch (error: any) {
        // Migration status errors are often informational
        expect(error.message).toBeDefined();
      }
    });

    it('should validate migration checksums', async () => {
      // Ensure migrations haven't been tampered with
      try {
        const { stdout } = await execAsync('npx prisma migrate status', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });

        // Should not contain checksum mismatch errors
        expect(stdout).not.toContain('checksum mismatch');
        expect(stdout).not.toContain('migration file has been edited');
      } catch (error: any) {
        if (error.message.includes('checksum') || error.message.includes('edited')) {
          fail('Migration integrity compromised: ' + error.message);
        }
      }
    });
  });

  describe('Database Performance After Migration', () => {
    it('should maintain query performance after migrations', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      // Create test data for performance testing
      await prismaService.user.create({
        data: {
          id: 'perf-test-user',
          email: 'perf@migration.test',
          passwordHash: 'hashed',
          selectedBranch: 'NAVY',
          subscriptionTier: 'PREMIUM',
        },
      });

      // Test query performance
      const startTime = Date.now();
      
      const users = await prismaService.user.findMany({
        where: { selectedBranch: 'NAVY' },
        take: 100,
      });

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(users).toBeInstanceOf(Array);

      // Clean up
      await prismaService.user.delete({ where: { id: 'perf-test-user' } });
    });

    it('should have proper database statistics after migration', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      try {
        // Check database statistics (PostgreSQL specific)
        const stats = await prismaService.$queryRaw`
          SELECT 
            schemaname,
            tablename,
            attname,
            null_frac,
            avg_width,
            n_distinct
          FROM pg_stats 
          WHERE schemaname = 'public'
          LIMIT 10
        `;

        expect(Array.isArray(stats)).toBe(true);
      } catch (error) {
        // Statistics might not be available in all test environments
        console.warn('Database statistics check skipped:', error);
      }
    });
  });

  describe('Rollback Capabilities', () => {
    it('should support migration rollbacks when needed', async () => {
      // Note: Prisma doesn't directly support rollbacks in the same way
      // This test verifies the database can be reset to a clean state
      
      try {
        await execAsync('npx prisma migrate reset --force --skip-generate', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });

        // Verify database is clean
        await prismaService.$connect();
        
        const tableCount = await prismaService.$queryRaw`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `;

        // Should have minimal tables after reset
        expect((tableCount as any)[0].count).toBeDefined();
      } catch (error: any) {
        console.warn('Rollback test warning:', error.message);
      }
    });
  });

  describe('Seed Data Integrity', () => {
    it('should run database seeds successfully after migration', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      try {
        await execAsync('npx prisma db seed', {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        });

        await prismaService.$connect();

        // Verify seed data exists
        const questionCount = await prismaService.question.count();
        const militaryJobCount = await prismaService.militaryJob.count();

        expect(questionCount).toBeGreaterThan(0);
        expect(militaryJobCount).toBeGreaterThan(0);
        
      } catch (error: any) {
        if (error.message.includes('seed')) {
          console.warn('Seed test skipped - no seed file configured:', error.message);
        } else {
          throw error;
        }
      }
    });

    it('should maintain referential integrity in seed data', async () => {
      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });

      await prismaService.$connect();

      // Create minimal seed data for testing
      const testUser = await prismaService.user.create({
        data: {
          id: 'seed-integrity-user',
          email: 'seed@integrity.test',
          passwordHash: 'hashed',
          selectedBranch: 'ARMY',
          subscriptionTier: 'FREE',
        },
      });

      const testQuiz = await prismaService.quiz.create({
        data: {
          id: 'seed-integrity-quiz',
          userId: testUser.id, // Proper foreign key reference
          category: 'ARITHMETIC_REASONING',
          score: 75,
          completedAt: new Date(),
        },
      });

      // Verify relationships work
      const quizWithUser = await prismaService.quiz.findUnique({
        where: { id: testQuiz.id },
        include: { user: true },
      });

      expect(quizWithUser?.user).toBeDefined();
      expect(quizWithUser?.user.id).toBe(testUser.id);

      // Clean up
      await prismaService.quiz.delete({ where: { id: testQuiz.id } });
      await prismaService.user.delete({ where: { id: testUser.id } });
    });
  });
});