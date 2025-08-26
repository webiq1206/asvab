import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/asvab_test';
  
  // Initialize test database
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
});

// Clean up after each test
afterEach(async () => {
  // Reset any global state if needed
  jest.clearAllMocks();
});

// Global test utilities
global.createTestModule = async (providers: any[] = [], imports: any[] = []) => {
  const moduleRef = await Test.createTestingModule({
    imports,
    providers,
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return { moduleRef, app };
};

// Mock military branch data
global.mockMilitaryBranches = [
  { id: 'army', name: 'Army', motto: 'Army Strong', greeting: 'Hooah!' },
  { id: 'navy', name: 'Navy', motto: 'Anchors Aweigh', greeting: 'Hooyah!' },
  { id: 'air_force', name: 'Air Force', motto: 'Aim High', greeting: 'Hoorah!' },
  { id: 'marines', name: 'Marines', motto: 'Semper Fi', greeting: 'Oorah!' },
  { id: 'coast_guard', name: 'Coast Guard', motto: 'Semper Paratus', greeting: 'Hooyah!' },
  { id: 'space_force', name: 'Space Force', motto: 'Semper Supra', greeting: 'Hoorah!' },
];

// Mock user data factory
global.createMockUser = (overrides = {}) => ({
  id: 'test-user-123',
  email: 'test.soldier@military.mil',
  selectedBranch: 'ARMY',
  subscriptionTier: 'PREMIUM',
  profile: {
    firstName: 'Test',
    lastName: 'Soldier',
    currentRank: 'Private',
    yearsOfService: 2,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock quiz data factory
global.createMockQuiz = (overrides = {}) => ({
  id: 'test-quiz-123',
  userId: 'test-user-123',
  category: 'ARITHMETIC_REASONING',
  difficulty: 'MEDIUM',
  score: 85,
  completedAt: new Date(),
  questions: [],
  ...overrides,
});

// Mock question data factory
global.createMockQuestion = (overrides = {}) => ({
  id: 'test-question-123',
  content: 'What is 2 + 2?',
  category: 'ARITHMETIC_REASONING',
  difficulty: 'EASY',
  correctAnswer: 'A',
  options: ['4', '3', '5', '6'],
  explanation: 'Basic addition: 2 + 2 equals 4.',
  tags: ['addition', 'basic'],
  isActive: true,
  branchRelevance: ['ARMY', 'NAVY', 'AIR_FORCE'],
  createdAt: new Date(),
  ...overrides,
});

console.log('🔧 Test environment configured for ASVAB Backend');