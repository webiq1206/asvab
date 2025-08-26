import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');

  // Ensure test database exists
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/asvab_test',
      },
    },
  });

  try {
    // Reset database schema
    await execAsync('npx prisma migrate reset --force --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    });

    // Apply latest migrations
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    });

    // Generate Prisma client for test environment
    await execAsync('npx prisma generate');

    // Seed test data
    await seedTestData(prisma);

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTestData(prisma: PrismaClient) {
  console.log('🌱 Seeding test data...');

  // Create test military branches
  const branches = [
    { id: 'ARMY', name: 'Army', motto: 'Army Strong', greeting: 'Hooah!' },
    { id: 'NAVY', name: 'Navy', motto: 'Anchors Aweigh', greeting: 'Hooyah!' },
    { id: 'AIR_FORCE', name: 'Air Force', motto: 'Aim High', greeting: 'Hoorah!' },
    { id: 'MARINES', name: 'Marines', motto: 'Semper Fi', greeting: 'Oorah!' },
    { id: 'COAST_GUARD', name: 'Coast Guard', motto: 'Semper Paratus', greeting: 'Hooyah!' },
    { id: 'SPACE_FORCE', name: 'Space Force', motto: 'Semper Supra', greeting: 'Hoorah!' },
  ];

  // Create test users
  const testUsers = [
    {
      id: 'test-soldier-1',
      email: 'soldier1@test.military.mil',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$testhashedpassword1',
      selectedBranch: 'ARMY',
      subscriptionTier: 'PREMIUM',
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Soldier',
          currentRank: 'Private',
          yearsOfService: 1,
        },
      },
    },
    {
      id: 'test-sailor-1',
      email: 'sailor1@test.military.mil',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$testhashedpassword2',
      selectedBranch: 'NAVY',
      subscriptionTier: 'FREE',
      profile: {
        create: {
          firstName: 'Jane',
          lastName: 'Sailor',
          currentRank: 'Seaman',
          yearsOfService: 2,
        },
      },
    },
  ];

  // Create test questions
  const testQuestions = [
    {
      id: 'test-question-ar-1',
      content: 'A soldier has 24 rounds of ammunition. If he fires 3/8 of them during training, how many rounds does he have left?',
      category: 'ARITHMETIC_REASONING',
      difficulty: 'MEDIUM',
      correctAnswer: 'B',
      options: JSON.stringify(['12', '15', '18', '21']),
      explanation: 'Basic fraction calculation: 24 × (1 - 3/8) = 24 × 5/8 = 15 rounds remaining',
      tags: JSON.stringify(['fractions', 'military', 'ammunition']),
      branchRelevance: JSON.stringify(['ARMY', 'NAVY', 'AIR_FORCE', 'MARINES']),
      isActive: true,
    },
    {
      id: 'test-question-mk-1',
      content: 'What is the value of x in the equation 2x + 5 = 17?',
      category: 'MATHEMATICS_KNOWLEDGE',
      difficulty: 'EASY',
      correctAnswer: 'A',
      options: JSON.stringify(['6', '7', '8', '9']),
      explanation: 'Solve for x: 2x + 5 = 17, therefore 2x = 12, so x = 6',
      tags: JSON.stringify(['algebra', 'equations']),
      branchRelevance: JSON.stringify(['ARMY', 'NAVY', 'AIR_FORCE', 'MARINES', 'COAST_GUARD', 'SPACE_FORCE']),
      isActive: true,
    },
  ];

  // Insert test data
  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  for (const question of testQuestions) {
    await prisma.question.upsert({
      where: { id: question.id },
      update: {},
      create: question,
    });
  }

  // Create test military jobs
  const testJobs = [
    {
      id: 'test-job-army-1',
      branch: 'ARMY',
      title: 'Infantry',
      mosCode: '11B',
      description: 'Primary combat role in ground operations',
      minAfqtScore: 31,
      requiredLineScores: JSON.stringify({ CO: 87 }),
      clearanceRequired: false,
      isActive: true,
    },
    {
      id: 'test-job-navy-1',
      branch: 'NAVY',
      title: 'Electronics Technician',
      mosCode: 'ET',
      description: 'Maintain and repair electronic systems',
      minAfqtScore: 50,
      requiredLineScores: JSON.stringify({ EL: 65, GS: 60 }),
      clearanceRequired: true,
      isActive: true,
    },
  ];

  for (const job of testJobs) {
    await prisma.militaryJob.upsert({
      where: { id: job.id },
      update: {},
      create: job,
    });
  }

  console.log('✅ Test data seeded successfully');
}