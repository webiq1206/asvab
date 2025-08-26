import { PrismaClient } from '@prisma/client';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/asvab_test',
      },
    },
  });

  try {
    // Clean up test data
    await prisma.searchHistory.deleteMany({});
    await prisma.searchFeedback.deleteMany({});
    await prisma.filterPreset.deleteMany({});
    await prisma.quizQuestion.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.userProfile.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.flashcard.deleteMany({});
    await prisma.militaryJob.deleteMany({});
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('✅ Test environment teardown complete');
}