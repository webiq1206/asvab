// Core types for the ASVAB Prep ecosystem

export enum MilitaryBranch {
  ARMY = 'ARMY',
  NAVY = 'NAVY',
  AIR_FORCE = 'AIR_FORCE',
  MARINES = 'MARINES',
  COAST_GUARD = 'COAST_GUARD',
  SPACE_FORCE = 'SPACE_FORCE',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export enum QuestionCategory {
  GENERAL_SCIENCE = 'GENERAL_SCIENCE',
  ARITHMETIC_REASONING = 'ARITHMETIC_REASONING',
  WORD_KNOWLEDGE = 'WORD_KNOWLEDGE',
  PARAGRAPH_COMPREHENSION = 'PARAGRAPH_COMPREHENSION',
  MATHEMATICS_KNOWLEDGE = 'MATHEMATICS_KNOWLEDGE',
  ELECTRONICS_INFORMATION = 'ELECTRONICS_INFORMATION',
  AUTO_SHOP = 'AUTO_SHOP',
  MECHANICAL_COMPREHENSION = 'MECHANICAL_COMPREHENSION',
  ASSEMBLING_OBJECTS = 'ASSEMBLING_OBJECTS',
}

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  selectedBranch: MilitaryBranch;
  subscriptionTier: SubscriptionTier;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  branchRelevance: MilitaryBranch[];
  explanationBasic: string;
  explanationPremium?: string;
  createdAt: Date;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  category?: QuestionCategory;
  isASVABReplica: boolean;
  questions: QuizQuestion[];
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  timeSpent?: number;
}

export interface QuizQuestion {
  questionId: string;
  userAnswer?: number;
  isCorrect?: boolean;
  timeSpent?: number;
}

export interface UserProgress {
  userId: string;
  category: QuestionCategory;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  lastStudied: Date;
  updatedAt: Date;
}

export interface MilitaryJob {
  id: string;
  branch: MilitaryBranch;
  title: string;
  mosCode: string;
  description: string;
  minAFQTScore: number;
  requiredLineScores: Record<string, number>;
  clearanceRequired?: string;
  trainingLength?: string;
  physicalRequirements?: string[];
}

export interface PhysicalStandard {
  id: string;
  branch: MilitaryBranch;
  gender: 'MALE' | 'FEMALE';
  ageMin: number;
  ageMax: number;
  runTimeMax: number; // seconds
  pushupsMin: number;
  situpsMin: number;
  planksMin?: number; // seconds
  bodyFatMax?: number; // percentage
}

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  branch: MilitaryBranch;
  isPublic: boolean;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  STUDY_REMINDER = 'STUDY_REMINDER',
  ACHIEVEMENT = 'ACHIEVEMENT',
  DAILY_MISSION = 'DAILY_MISSION',
  TRIAL_WARNING = 'TRIAL_WARNING',
  SOCIAL = 'SOCIAL',
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  selectedBranch: MilitaryBranch;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Quiz creation types
export interface CreateQuizRequest {
  category?: QuestionCategory;
  questionCount: number;
  difficulty?: QuestionDifficulty;
  isASVABReplica?: boolean;
}

export interface SubmitQuizRequest {
  answers: Record<string, number>;
  timeSpent: number;
}

// Subscription types
export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

// Military communication types
export interface BranchGreeting {
  branch: MilitaryBranch;
  greeting: string;
  motto: string;
  exclamation: string;
}

// Progress tracking types
export interface AFQTScore {
  wordKnowledge: number;
  paragraphComprehension: number;
  arithmeticReasoning: number;
  mathematicsKnowledge: number;
  composite: number;
  percentile: number;
}

export interface ReadinessAssessment {
  overall: number;
  academic: number;
  physical?: number;
  jobSpecific?: Record<string, number>;
  recommendations: string[];
}

// Flashcard System Types
export enum FlashcardDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum FlashcardType {
  BASIC = 'BASIC',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_BLANK = 'FILL_IN_BLANK',
}

export enum FlashcardStatus {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  REVIEW = 'REVIEW',
  MASTERED = 'MASTERED',
}

export interface FlashcardDeck {
  id: string;
  createdBy: string;
  name: string;
  description: string;
  category: QuestionCategory;
  branchRelevance: MilitaryBranch[];
  isPublic: boolean;
  isActive: boolean;
  tags: string[];
  colorTheme?: string;
  iconName?: string;
  createdAt: Date;
  updatedAt: Date;
  flashcards?: Flashcard[];
  statistics?: {
    totalCards: number;
    dueCards: number;
    newCards: number;
    masteredCards: number;
  };
}

export interface Flashcard {
  id: string;
  createdBy: string;
  deckId?: string;
  question: string;
  answer: string;
  category: QuestionCategory;
  difficulty: FlashcardDifficulty;
  type: FlashcardType;
  explanation?: string;
  hint?: string;
  tags: string[];
  choices: string[];
  branchRelevance: MilitaryBranch[];
  isPublic: boolean;
  isActive: boolean;
  cardStatus: FlashcardStatus;
  lastReviewed?: Date;
  createdAt: Date;
  updatedAt: Date;
  reviews?: FlashcardReview[];
  spacedRepetitionData?: {
    interval: number;
    repetitions: number;
    easeFactor: number;
    nextReviewDate: Date;
    lastReviewDate?: Date;
    rating: number;
  };
}

export interface FlashcardReview {
  id: string;
  userId: string;
  flashcardId: string;
  rating: number; // 0-5 scale
  timeSpent: number; // seconds
  wasCorrect?: boolean;
  userAnswer?: string;
  notes?: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
  reviewDate: Date;
}

export interface StudySession {
  cards: Flashcard[];
  studyLoad: {
    newCards: number;
    reviewCards: number;
    estimatedTime: number;
  };
  sessionConfig: {
    maxCards: number;
    timeLimit?: number;
    includeNew?: boolean;
    includeDue?: boolean;
    difficulties?: FlashcardDifficulty[];
    tags?: string[];
  };
}

export interface FlashcardProgress {
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  dueCards: number;
  streakDays: number;
  lastStudied: string;
  totalStudyTime: number;
  averageRating: number;
  retentionRate: number;
}

// Military Jobs System Types
export interface AFQTScore {
  wordKnowledge: number;
  paragraphComprehension: number;
  arithmeticReasoning: number;
  mathematicsKnowledge: number;
  composite: number;
  percentile: number;
}

export interface LineScores {
  GT?: number;  // General Technical
  CL?: number;  // Clerical
  CO?: number;  // Combat
  EL?: number;  // Electronics
  FA?: number;  // Field Artillery
  GM?: number;  // General Maintenance
  MM?: number;  // Mechanical Maintenance
  OF?: number;  // Operators and Food
  SC?: number;  // Surveillance and Communications
  ST?: number;  // Skilled Technical
  AR?: number;  // Arithmetic Reasoning
  MK?: number;  // Mathematics Knowledge
  EI?: number;  // Electronics Information
  GS?: number;  // General Science
  A?: number;   // Administrative
  G?: number;   // General
  M?: number;   // Mechanical
  E?: number;   // Electrical
}

export interface MilitaryJobDetails {
  id: string;
  title: string;
  mosCode: string;
  description: string;
  minAFQTScore: number;
  requiredLineScores: Record<string, number>;
  clearanceRequired?: string;
  trainingLength?: string;
  physicalRequirements: string[];
  branch: MilitaryBranch;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobMatchResult {
  job: MilitaryJobDetails;
  matchScore: number;
  qualifications: {
    afqtQualified: boolean;
    afqtRequired: number;
    afqtCurrent: number;
    lineScoresQualified: boolean;
    lineScoresStatus: Array<{
      score: string;
      required: number;
      current: number;
      qualified: boolean;
    }>;
    physicalQualified: boolean;
    clearanceRequired: string | null;
  };
  recommendations: string[];
}

export interface JobRecommendations {
  afqtScore: AFQTScore;
  lineScores: LineScores;
  recommendations: {
    fullyQualified: JobMatchResult[];
    partiallyQualified: JobMatchResult[];
    needsImprovement: JobMatchResult[];
  };
  studyPlan: {
    priority: string[];
    goals: Array<{
      category: string;
      currentScore: number;
      targetScore: number;
      improvement: number;
    }>;
    timeframe: string;
  };
}

// Social Features System Types
export enum GroupRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum FriendRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface StudyGroupDetails {
  id: string;
  name: string;
  description: string | null;
  branch: MilitaryBranch;
  isPublic: boolean;
  maxMembers: number;
  memberCount: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
    } | null;
  };
  userRole?: GroupRole;
  isJoined?: boolean;
}

export interface StudyGroupMember {
  id: string;
  role: GroupRole;
  joinedAt: Date;
  user: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
      studyStreak: number;
    } | null;
  };
}

export interface StudyGroupMessage {
  id: string;
  content: string;
  sentAt: Date;
  sender: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
    } | null;
  };
}

export interface DetailedStudyGroup extends StudyGroupDetails {
  members: StudyGroupMember[];
  recentMessages: StudyGroupMessage[];
}

export interface CreateStudyGroupRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  maxMembers?: number;
}

export interface UpdateStudyGroupRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  maxMembers?: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  sentAt: Date;
  respondedAt?: Date;
  sender: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
    } | null;
  };
  receiver: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
    } | null;
  };
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: Date;
  readAt?: Date;
  sender: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
    } | null;
  };
}

export interface GroupChallenge {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  type: ChallengeType;
  startDate: Date;
  endDate: Date;
  status: ChallengeStatus;
  rules: Record<string, any>;
  prizes: Record<string, any>;
  createdAt: Date;
  participantCount: number;
  userParticipation?: {
    score: number;
    rank?: number;
    completedAt?: Date;
    joinedAt: Date;
  };
}

export enum ChallengeType {
  QUIZ_BATTLE = 'QUIZ_BATTLE',
  STUDY_STREAK = 'STUDY_STREAK',
  SCORE_CHALLENGE = 'SCORE_CHALLENGE',
  CATEGORY_FOCUS = 'CATEGORY_FOCUS',
}

export enum ChallengeStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  score: number;
  rank?: number;
  completedAt?: Date;
  joinedAt: Date;
  user: {
    firstName: string | null;
    lastName: string | null;
    profile: {
      avatarUrl: string | null;
      currentRank: string | null;
    } | null;
  };
}

// Physical Fitness System Types
export enum FitnessType {
  RUN = 'RUN',
  PUSHUPS = 'PUSHUPS',
  SITUPS = 'SITUPS',
  PLANK = 'PLANK',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export interface FitnessEntry {
  id: string;
  userId: string;
  type: FitnessType;
  value: number;
  recordedAt: Date;
  notes?: string;
}

export interface FitnessGoal {
  id: string;
  userId: string;
  type: FitnessType;
  targetValue: number;
  currentValue: number;
  targetDate: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FitnessStandard {
  id: string;
  branch: MilitaryBranch;
  gender: Gender;
  ageMin: number;
  ageMax: number;
  runTimeMax: number;
  pushupsMin: number;
  situpsMin: number;
  planksMin?: number;
  bodyFatMax?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FitnessScoreResult {
  exercise: string;
  userValue: number;
  requiredValue: number;
  maxPoints: number;
  earnedPoints: number;
  passed: boolean;
  grade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE';
}

export interface PTTestResult {
  branch: MilitaryBranch;
  gender: Gender;
  age: number;
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  passed: boolean;
  overallGrade: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'MARGINAL' | 'FAILURE';
  exerciseResults: FitnessScoreResult[];
  recommendations: string[];
}

export interface FitnessProgress {
  type: FitnessType;
  current: number;
  best: number;
  average: number;
  improvement: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  lastRecorded: Date;
  totalEntries: number;
}

export interface FitnessAnalytics {
  userId: string;
  overallProgress: FitnessProgress[];
  weeklyStats: {
    week: string;
    workouts: number;
    totalTime: number;
    averageIntensity: number;
  }[];
  monthlyTrends: {
    month: string;
    [key in FitnessType]: number;
  }[];
  achievements: {
    personalRecords: number;
    consistencyStreak: number;
    goalsCompleted: number;
  };
  nextPTTest?: {
    daysRemaining: number;
    readinessScore: number;
    recommendedTraining: string[];
  };
}

export interface CreateFitnessEntryRequest {
  type: FitnessType;
  value: number;
  recordedAt?: Date;
  notes?: string;
}

export interface CreateFitnessGoalRequest {
  type: FitnessType;
  targetValue: number;
  targetDate: Date;
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: Date;
  duration: number;
  exercises: FitnessEntry[];
  notes?: string;
  caloriesEstimate?: number;
}

export interface BodyCompositionStandards {
  minWeight: number;
  maxWeight: number;
  maxBodyFat?: number;
}