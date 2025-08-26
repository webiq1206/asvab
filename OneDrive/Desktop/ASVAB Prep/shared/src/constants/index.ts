import { MilitaryBranch, QuestionCategory, BranchGreeting } from '../types';

// Military branch information
export const BRANCH_INFO: Record<MilitaryBranch, BranchGreeting> = {
  [MilitaryBranch.ARMY]: {
    branch: MilitaryBranch.ARMY,
    greeting: 'LISTEN UP, SOLDIER!',
    motto: 'ARMY STRONG',
    exclamation: 'HOOAH!',
  },
  [MilitaryBranch.NAVY]: {
    branch: MilitaryBranch.NAVY,
    greeting: 'ATTENTION ON DECK, SAILOR!',
    motto: 'ANCHORS AWEIGH',
    exclamation: 'HOOYAH!',
  },
  [MilitaryBranch.AIR_FORCE]: {
    branch: MilitaryBranch.AIR_FORCE,
    greeting: 'AIRMAN, STAND READY!',
    motto: 'AIM HIGH',
    exclamation: 'HOORAH!',
  },
  [MilitaryBranch.MARINES]: {
    branch: MilitaryBranch.MARINES,
    greeting: 'OORAH, MARINE!',
    motto: 'SEMPER FI',
    exclamation: 'OORAH!',
  },
  [MilitaryBranch.COAST_GUARD]: {
    branch: MilitaryBranch.COAST_GUARD,
    greeting: 'GUARDIAN, SEMPER PARATUS!',
    motto: 'SEMPER PARATUS',
    exclamation: 'HOOYAH!',
  },
  [MilitaryBranch.SPACE_FORCE]: {
    branch: MilitaryBranch.SPACE_FORCE,
    greeting: 'GUARDIAN, SEMPER SUPRA!',
    motto: 'SEMPER SUPRA',
    exclamation: 'HOORAH!',
  },
};

// Branch display names
export const BRANCH_DISPLAY_NAMES: Record<MilitaryBranch, string> = {
  [MilitaryBranch.ARMY]: 'Army',
  [MilitaryBranch.NAVY]: 'Navy',
  [MilitaryBranch.AIR_FORCE]: 'Air Force',
  [MilitaryBranch.MARINES]: 'Marines',
  [MilitaryBranch.COAST_GUARD]: 'Coast Guard',
  [MilitaryBranch.SPACE_FORCE]: 'Space Force',
};

// Personnel titles by branch
export const BRANCH_PERSONNEL_TITLES: Record<MilitaryBranch, string> = {
  [MilitaryBranch.ARMY]: 'Soldier',
  [MilitaryBranch.NAVY]: 'Sailor',
  [MilitaryBranch.AIR_FORCE]: 'Airman',
  [MilitaryBranch.MARINES]: 'Marine',
  [MilitaryBranch.COAST_GUARD]: 'Coastie',
  [MilitaryBranch.SPACE_FORCE]: 'Guardian',
};

// Question category display names
export const CATEGORY_DISPLAY_NAMES: Record<QuestionCategory, string> = {
  [QuestionCategory.GENERAL_SCIENCE]: 'General Science',
  [QuestionCategory.ARITHMETIC_REASONING]: 'Arithmetic Reasoning',
  [QuestionCategory.WORD_KNOWLEDGE]: 'Word Knowledge',
  [QuestionCategory.PARAGRAPH_COMPREHENSION]: 'Paragraph Comprehension',
  [QuestionCategory.MATHEMATICS_KNOWLEDGE]: 'Mathematics Knowledge',
  [QuestionCategory.ELECTRONICS_INFORMATION]: 'Electronics Information',
  [QuestionCategory.AUTO_SHOP]: 'Auto & Shop Information',
  [QuestionCategory.MECHANICAL_COMPREHENSION]: 'Mechanical Comprehension',
  [QuestionCategory.ASSEMBLING_OBJECTS]: 'Assembling Objects',
};

// ASVAB section information
export const ASVAB_SECTIONS = [
  {
    category: QuestionCategory.GENERAL_SCIENCE,
    timeLimit: 11 * 60, // 11 minutes in seconds
    questionCount: 25,
    order: 1,
  },
  {
    category: QuestionCategory.ARITHMETIC_REASONING,
    timeLimit: 36 * 60, // 36 minutes in seconds
    questionCount: 30,
    order: 2,
  },
  {
    category: QuestionCategory.WORD_KNOWLEDGE,
    timeLimit: 11 * 60, // 11 minutes in seconds
    questionCount: 35,
    order: 3,
  },
  {
    category: QuestionCategory.PARAGRAPH_COMPREHENSION,
    timeLimit: 13 * 60, // 13 minutes in seconds
    questionCount: 15,
    order: 4,
  },
  {
    category: QuestionCategory.MATHEMATICS_KNOWLEDGE,
    timeLimit: 24 * 60, // 24 minutes in seconds
    questionCount: 25,
    order: 5,
  },
  {
    category: QuestionCategory.ELECTRONICS_INFORMATION,
    timeLimit: 9 * 60, // 9 minutes in seconds
    questionCount: 20,
    order: 6,
  },
  {
    category: QuestionCategory.AUTO_SHOP,
    timeLimit: 11 * 60, // 11 minutes in seconds
    questionCount: 25,
    order: 7,
  },
  {
    category: QuestionCategory.MECHANICAL_COMPREHENSION,
    timeLimit: 19 * 60, // 19 minutes in seconds
    questionCount: 25,
    order: 8,
  },
  {
    category: QuestionCategory.ASSEMBLING_OBJECTS,
    timeLimit: 15 * 60, // 15 minutes in seconds
    questionCount: 25,
    order: 9,
  },
];

// AFQT calculation categories (used for overall ASVAB score)
export const AFQT_CATEGORIES = [
  QuestionCategory.WORD_KNOWLEDGE,
  QuestionCategory.PARAGRAPH_COMPREHENSION,
  QuestionCategory.ARITHMETIC_REASONING,
  QuestionCategory.MATHEMATICS_KNOWLEDGE,
];

// All ASVAB categories (standardized across all branches)
export const ALL_ASVAB_CATEGORIES: QuestionCategory[] = [
  QuestionCategory.GENERAL_SCIENCE,
  QuestionCategory.ARITHMETIC_REASONING,
  QuestionCategory.WORD_KNOWLEDGE,
  QuestionCategory.PARAGRAPH_COMPREHENSION,
  QuestionCategory.MATHEMATICS_KNOWLEDGE,
  QuestionCategory.ELECTRONICS_INFORMATION,
  QuestionCategory.AUTO_SHOP,
  QuestionCategory.MECHANICAL_COMPREHENSION,
  QuestionCategory.ASSEMBLING_OBJECTS,
];

// Subscription limits
export const FREE_TIER_LIMITS = {
  TOTAL_QUESTIONS: 50,
  DAILY_QUIZZES: 1,
  QUIZ_QUESTION_LIMIT: 10,
  AVAILABLE_CATEGORIES: 3,
  QUIZ_HISTORY_LIMIT: 5,
  NOTIFICATIONS_PER_WEEK: 1,
};

export const PREMIUM_FEATURES = [
  'Unlimited questions and quizzes',
  'Full ASVAB replica exam (2h 29min)',
  'Digital whiteboard/scratch paper',
  'Flashcards with spaced repetition',
  'Military jobs database',
  'Physical fitness tracking',
  'AI coaching and daily missions',
  'Social features and study groups',
  'Advanced progress analytics',
  'Export progress reports',
  'Daily intelligent notifications',
];

// Military performance feedback messages
export const PERFORMANCE_MESSAGES = {
  EXCELLENT: [
    'OUTSTANDING PERFORMANCE!',
    'MISSION ACCOMPLISHED!',
    'EXEMPLARY WORK!',
    'SUPERIOR DEDICATION!',
  ],
  GOOD: [
    'SOLID PERFORMANCE!',
    'WELL DONE!',
    'KEEP UP THE GOOD WORK!',
    'PROGRESS NOTED!',
  ],
  NEEDS_IMPROVEMENT: [
    'MORE TRAINING REQUIRED!',
    'STEP UP YOUR GAME!',
    'ADDITIONAL STUDY NEEDED!',
    'IMPROVEMENT EXPECTED!',
  ],
  UNACCEPTABLE: [
    'UNACCEPTABLE! HIT THE BOOKS!',
    'REMEDIAL TRAINING REQUIRED!',
    'SERIOUS WORK NEEDED!',
    'IMMEDIATE IMPROVEMENT DEMANDED!',
  ],
};

// Color palette
export const COLORS = {
  DARK_OLIVE: '#3C3D37',
  MILITARY_GREEN: '#4B5320',
  DESERT_SAND: '#C2B280',
  KHAKI: '#BDB76B',
  TACTICAL_ORANGE: '#FF8C00',
  SUCCESS: '#228B22',
  WARNING: '#FFD700',
  DANGER: '#DC143C',
  INFO: '#4682B4',
};

// Branch accent colors
export const BRANCH_COLORS: Record<MilitaryBranch, string> = {
  [MilitaryBranch.ARMY]: '#FFD700', // Army Gold
  [MilitaryBranch.NAVY]: '#000080', // Navy Blue
  [MilitaryBranch.AIR_FORCE]: '#00308F', // Air Force Blue
  [MilitaryBranch.MARINES]: '#DC143C', // Marine Red
  [MilitaryBranch.COAST_GUARD]: '#003366', // Coast Guard Blue
  [MilitaryBranch.SPACE_FORCE]: '#C0C0C0', // Space Force Silver
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    MAGIC_LINK: '/auth/magic-link',
    GOOGLE_OAUTH: '/auth/oauth/google',
    APPLE_OAUTH: '/auth/oauth/apple',
  },
  USERS: {
    PROFILE: '/users/profile',
    PROGRESS: '/users/progress',
    BRANCH: '/users/branch',
    DELETE: '/users/account',
  },
  QUESTIONS: {
    LIST: '/questions',
    CATEGORIES: '/questions/categories',
    DETAIL: '/questions/:id',
    ANSWER: '/questions/:id/answer',
  },
  QUIZZES: {
    CREATE: '/quizzes',
    DETAIL: '/quizzes/:id',
    SUBMIT: '/quizzes/:id/submit',
    HISTORY: '/quizzes/history',
    ASVAB_REPLICA: '/quizzes/asvab-replica',
  },
  SUBSCRIPTIONS: {
    PLANS: '/subscriptions/plans',
    PURCHASE: '/subscriptions/purchase',
    STATUS: '/subscriptions/status',
    CANCEL: '/subscriptions/cancel',
    RESTORE: '/subscriptions/restore',
  },
  MILITARY: {
    JOBS: '/military/jobs',
    JOB_DETAIL: '/military/jobs/:id',
    JOB_SEARCH: '/military/jobs/search',
    PHYSICAL_STANDARDS: '/military/physical-standards',
  },
  SOCIAL: {
    GROUPS: '/social/groups',
    GROUP_JOIN: '/social/groups/:id/join',
    FRIENDS: '/social/friends',
    FRIEND_ADD: '/social/friends/add',
  },
  NOTIFICATIONS: {
    REGISTER: '/notifications/register',
    PREFERENCES: '/notifications/preferences',
    HISTORY: '/notifications/history',
  },
};

// Validation rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  QUIZ_QUESTION_MIN: 5,
  QUIZ_QUESTION_MAX: 50,
  GROUP_NAME_MIN_LENGTH: 3,
  GROUP_NAME_MAX_LENGTH: 50,
  GROUP_MAX_MEMBERS: 20,
};