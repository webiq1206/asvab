import { PrismaClient, MilitaryBranch, SubscriptionTier, QuestionCategory, QuestionDifficulty } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users for each military branch
  const testUsers = await Promise.all([
    // Army user
    prisma.user.create({
      data: {
        email: 'army.soldier@example.com',
        passwordHash: await argon2.hash('TestPassword123!'),
        firstName: 'John',
        lastName: 'Smith',
        selectedBranch: MilitaryBranch.ARMY,
        subscriptionTier: SubscriptionTier.PREMIUM,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        profile: {
          create: {
            bio: 'Future Army soldier preparing for ASVAB',
            currentRank: 'Private (E-1)',
            studyStreak: 5,
            lastStudyDate: new Date(),
          },
        },
      },
      include: { profile: true },
    }),
    
    // Navy user
    prisma.user.create({
      data: {
        email: 'navy.sailor@example.com',
        passwordHash: await argon2.hash('TestPassword123!'),
        firstName: 'Sarah',
        lastName: 'Johnson',
        selectedBranch: MilitaryBranch.NAVY,
        subscriptionTier: SubscriptionTier.FREE,
        trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        profile: {
          create: {
            bio: 'Aspiring Navy sailor',
            currentRank: 'Seaman Recruit (E-1)',
            studyStreak: 12,
            lastStudyDate: new Date(),
          },
        },
      },
      include: { profile: true },
    }),

    // Air Force user
    prisma.user.create({
      data: {
        email: 'airforce.airman@example.com',
        passwordHash: await argon2.hash('TestPassword123!'),
        firstName: 'Mike',
        lastName: 'Davis',
        selectedBranch: MilitaryBranch.AIR_FORCE,
        subscriptionTier: SubscriptionTier.FREE,
        profile: {
          create: {
            bio: 'Ready to serve in the Air Force',
            currentRank: 'Airman Basic (E-1)',
            studyStreak: 3,
            lastStudyDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          },
        },
      },
      include: { profile: true },
    }),
  ]);

  console.log('👥 Created test users:', testUsers.length);

  // Create sample questions
  const sampleQuestions = [
    {
      content: 'What is the atomic number of carbon?',
      options: ['6', '8', '12', '14'],
      correctAnswer: 0,
      category: QuestionCategory.GENERAL_SCIENCE,
      difficulty: QuestionDifficulty.EASY,
      explanationBasic: 'Carbon has an atomic number of 6, meaning it has 6 protons in its nucleus.',
      explanationPremium: 'Carbon has an atomic number of 6, which means it has 6 protons in its nucleus. This places carbon in the second period and fourth group of the periodic table. Carbon is essential for all known life forms and forms the basis of organic chemistry.',
    },
    {
      content: 'If a car travels 60 miles in 2 hours, what is its average speed?',
      options: ['20 mph', '30 mph', '40 mph', '50 mph'],
      correctAnswer: 1,
      category: QuestionCategory.ARITHMETIC_REASONING,
      difficulty: QuestionDifficulty.EASY,
      explanationBasic: 'Speed = Distance ÷ Time. 60 miles ÷ 2 hours = 30 mph.',
      explanationPremium: 'To find average speed, divide total distance by total time. Speed = Distance ÷ Time = 60 miles ÷ 2 hours = 30 miles per hour. This is a fundamental physics formula used in many military applications for navigation and logistics.',
    },
    {
      content: 'What does the word "meticulous" mean?',
      options: ['Careless', 'Very careful and precise', 'Quick', 'Loud'],
      correctAnswer: 1,
      category: QuestionCategory.WORD_KNOWLEDGE,
      difficulty: QuestionDifficulty.MEDIUM,
      branchRelevance: [MilitaryBranch.ARMY, MilitaryBranch.NAVY, MilitaryBranch.AIR_FORCE, MilitaryBranch.MARINES, MilitaryBranch.COAST_GUARD, MilitaryBranch.SPACE_FORCE],
      explanationBasic: 'Meticulous means showing great attention to detail; very careful and precise.',
      explanationPremium: 'Meticulous means showing great attention to detail; very careful and precise. In military contexts, being meticulous is crucial for mission success, equipment maintenance, and following protocols. The word comes from the Latin "meticulosus," meaning fearful or careful.',
    },
    {
      content: 'What is the square root of 144?',
      options: ['10', '11', '12', '13'],
      correctAnswer: 2,
      category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
      difficulty: QuestionDifficulty.EASY,
      branchRelevance: [MilitaryBranch.ARMY, MilitaryBranch.NAVY, MilitaryBranch.AIR_FORCE, MilitaryBranch.SPACE_FORCE],
      explanationBasic: 'The square root of 144 is 12 because 12 × 12 = 144.',
      explanationPremium: 'The square root of 144 is 12 because 12 × 12 = 144. Square roots are fundamental in military applications including ballistics calculations, radar systems, and navigation. Perfect squares like 144 are useful to memorize for quick mental math.',
    },
    {
      content: 'Which component controls the flow of electric current in a circuit?',
      options: ['Capacitor', 'Resistor', 'Inductor', 'Transistor'],
      correctAnswer: 1,
      category: QuestionCategory.ELECTRONICS_INFORMATION,
      difficulty: QuestionDifficulty.MEDIUM,
      branchRelevance: [MilitaryBranch.NAVY, MilitaryBranch.AIR_FORCE, MilitaryBranch.SPACE_FORCE],
      explanationBasic: 'A resistor controls the flow of electric current by providing resistance.',
      explanationPremium: 'A resistor controls the flow of electric current by providing electrical resistance. Resistors are fundamental components in electronic circuits, used to limit current, divide voltages, and protect sensitive components. In military electronics, proper current control is critical for reliable operation of communication and weapon systems.',
    },
  ];

  const createdQuestions = await Promise.all(
    sampleQuestions.map(question => 
      prisma.question.create({
        data: question,
      })
    )
  );

  console.log('❓ Created sample questions:', createdQuestions.length);

  // Create sample military jobs
  const sampleJobs = [
    {
      branch: MilitaryBranch.ARMY,
      title: 'Infantry',
      mosCode: '11B',
      description: 'The infantry is the main land combat force of the Army. Infantry soldiers engage the enemy in close combat and coordinate with other combat arms.',
      minAFQTScore: 31,
      requiredLineScores: { CO: 87 },
      trainingLength: '22 weeks',
      physicalRequirements: ['Combat fitness test', 'Ruck marching', 'Obstacle course'],
    },
    {
      branch: MilitaryBranch.NAVY,
      title: 'Electronics Technician',
      mosCode: 'ET',
      description: 'Electronics Technicians maintain and repair electronic equipment used for communications, weapons systems, and navigation.',
      minAFQTScore: 50,
      requiredLineScores: { AR: 52, MK: 52, EI: 52, GS: 52 },
      clearanceRequired: 'Secret',
      trainingLength: '26 weeks',
      physicalRequirements: ['Normal color vision', 'Hearing within normal limits'],
    },
    {
      branch: MilitaryBranch.AIR_FORCE,
      title: 'Cyber Warfare Operations',
      mosCode: '1B4X1',
      description: 'Cyber Warfare Operations specialists plan, direct, and execute cyberspace operations to protect Air Force networks and systems.',
      minAFQTScore: 64,
      requiredLineScores: { G: 62 },
      clearanceRequired: 'Top Secret',
      trainingLength: '52 weeks',
      physicalRequirements: ['Normal color vision', 'Type 40 WPM'],
    },
  ];

  const createdJobs = await Promise.all(
    sampleJobs.map(job => 
      prisma.militaryJob.create({
        data: job,
      })
    )
  );

  console.log('💼 Created sample military jobs:', createdJobs.length);

  // Create physical standards
  const physicalStandards = [
    {
      branch: MilitaryBranch.ARMY,
      gender: 'MALE' as const,
      ageMin: 17,
      ageMax: 21,
      runTimeMax: 15 * 60 + 54, // 15:54 in seconds
      pushupsMin: 35,
      situpsMin: 47,
      planksMin: 2 * 60 + 30, // 2:30 in seconds
    },
    {
      branch: MilitaryBranch.ARMY,
      gender: 'FEMALE' as const,
      ageMin: 17,
      ageMax: 21,
      runTimeMax: 18 * 60 + 54, // 18:54 in seconds
      pushupsMin: 13,
      situpsMin: 47,
      planksMin: 2 * 60 + 30, // 2:30 in seconds
    },
    {
      branch: MilitaryBranch.NAVY,
      gender: 'MALE' as const,
      ageMin: 17,
      ageMax: 19,
      runTimeMax: 16 * 60 + 10, // 16:10 in seconds
      pushupsMin: 50,
      situpsMin: 50,
      planksMin: 2 * 60 + 10, // 2:10 in seconds
    },
    {
      branch: MilitaryBranch.NAVY,
      gender: 'FEMALE' as const,
      ageMin: 17,
      ageMax: 19,
      runTimeMax: 18 * 60 + 37, // 18:37 in seconds
      pushupsMin: 50,
      situpsMin: 50,
      planksMin: 2 * 60 + 10, // 2:10 in seconds
    },
  ];

  const createdStandards = await Promise.all(
    physicalStandards.map(standard => 
      prisma.physicalStandard.create({
        data: standard,
      })
    )
  );

  console.log('💪 Created physical standards:', createdStandards.length);

  // Create achievements
  const achievements = [
    {
      name: 'First Steps',
      description: 'Complete your first quiz',
      type: 'QUIZ_SCORE',
      category: 'BRONZE',
      requirement: { quizzes_completed: 1 },
    },
    {
      name: 'Dedicated Recruit',
      description: 'Study for 7 consecutive days',
      type: 'STUDY_STREAK',
      category: 'SILVER',
      requirement: { study_streak: 7 },
    },
    {
      name: 'Math Master',
      description: 'Score 90% or higher on Mathematics Knowledge',
      type: 'CATEGORY_MASTERY',
      category: 'GOLD',
      requirement: { category: 'MATHEMATICS_KNOWLEDGE', score: 90 },
    },
    {
      name: 'Army Strong',
      description: 'Complete 100 Army-relevant questions',
      type: 'CATEGORY_MASTERY',
      category: 'SILVER',
      branch: MilitaryBranch.ARMY,
      requirement: { branch_questions: 100 },
    },
  ];

  const createdAchievements = await Promise.all(
    achievements.map(achievement => 
      prisma.achievement.create({
        data: achievement,
      })
    )
  );

  console.log('🏆 Created achievements:', createdAchievements.length);

  // Create app configuration
  const appConfigs = [
    {
      key: 'free_question_limit',
      value: 50,
      description: 'Maximum number of questions for free users',
    },
    {
      key: 'free_quiz_limit_per_day',
      value: 1,
      description: 'Maximum number of quizzes per day for free users',
    },
    {
      key: 'premium_trial_days',
      value: 7,
      description: 'Number of days for premium trial',
    },
    {
      key: 'premium_monthly_price',
      value: 9.97,
      description: 'Monthly price for premium subscription in USD',
    },
  ];

  await Promise.all(
    appConfigs.map(config => 
      prisma.appConfig.create({
        data: config,
      })
    )
  );

  console.log('⚙️ Created app configuration');

  // Create feature flags
  const featureFlags = [
    {
      name: 'ai_coaching',
      isEnabled: true,
      description: 'Enable AI-powered coaching features',
    },
    {
      name: 'social_features',
      isEnabled: true,
      description: 'Enable study groups and social features',
    },
    {
      name: 'whiteboard_feature',
      isEnabled: true,
      description: 'Enable digital whiteboard during quizzes',
    },
    {
      name: 'beta_asvab_replica',
      isEnabled: false,
      description: 'Enable beta version of full ASVAB replica exam',
    },
  ];

  await Promise.all(
    featureFlags.map(flag => 
      prisma.featureFlag.create({
        data: flag,
      })
    )
  );

  console.log('🚩 Created feature flags');

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Users: ${testUsers.length}`);
  console.log(`   - Questions: ${createdQuestions.length}`);
  console.log(`   - Military Jobs: ${createdJobs.length}`);
  console.log(`   - Physical Standards: ${createdStandards.length}`);
  console.log(`   - Achievements: ${createdAchievements.length}`);
  console.log('\n🔑 Test User Credentials:');
  console.log('   Army (Premium): army.soldier@example.com / TestPassword123!');
  console.log('   Navy (Free): navy.sailor@example.com / TestPassword123!');
  console.log('   Air Force (Free): airforce.airman@example.com / TestPassword123!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });