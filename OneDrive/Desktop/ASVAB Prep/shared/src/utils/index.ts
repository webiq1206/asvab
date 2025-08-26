import { 
  MilitaryBranch, 
  QuestionCategory, 
  AFQTScore,
  QuizQuestion 
} from '../types';
import { 
  BRANCH_INFO, 
  AFQT_CATEGORIES,
  BRANCH_RELEVANT_CATEGORIES,
  PERFORMANCE_MESSAGES 
} from '../constants';

/**
 * Get military greeting for a specific branch
 */
export const getBranchGreeting = (branch: MilitaryBranch): string => {
  return BRANCH_INFO[branch].greeting;
};

/**
 * Get military motto for a specific branch
 */
export const getBranchMotto = (branch: MilitaryBranch): string => {
  return BRANCH_INFO[branch].motto;
};

/**
 * Get military exclamation for a specific branch
 */
export const getBranchExclamation = (branch: MilitaryBranch): string => {
  return BRANCH_INFO[branch].exclamation;
};

/**
 * Get personnel title for a specific branch
 */
export const getPersonnelTitle = (branch: MilitaryBranch): string => {
  const titles = {
    [MilitaryBranch.ARMY]: 'Soldier',
    [MilitaryBranch.NAVY]: 'Sailor',
    [MilitaryBranch.AIR_FORCE]: 'Airman',
    [MilitaryBranch.MARINES]: 'Marine',
    [MilitaryBranch.COAST_GUARD]: 'Coastie',
    [MilitaryBranch.SPACE_FORCE]: 'Guardian',
  };
  return titles[branch];
};

/**
 * Check if a question category is relevant to a military branch
 */
export const isCategoryRelevantToBranch = (
  category: QuestionCategory, 
  branch: MilitaryBranch
): boolean => {
  return BRANCH_RELEVANT_CATEGORIES[branch].includes(category);
};

/**
 * Get relevant categories for a military branch
 */
export const getRelevantCategories = (branch: MilitaryBranch): QuestionCategory[] => {
  return BRANCH_RELEVANT_CATEGORIES[branch];
};

/**
 * Calculate AFQT score from quiz results
 */
export const calculateAFQTScore = (quizQuestions: QuizQuestion[]): AFQTScore => {
  const categoryScores: Record<QuestionCategory, { correct: number; total: number }> = {
    [QuestionCategory.WORD_KNOWLEDGE]: { correct: 0, total: 0 },
    [QuestionCategory.PARAGRAPH_COMPREHENSION]: { correct: 0, total: 0 },
    [QuestionCategory.ARITHMETIC_REASONING]: { correct: 0, total: 0 },
    [QuestionCategory.MATHEMATICS_KNOWLEDGE]: { correct: 0, total: 0 },
    [QuestionCategory.GENERAL_SCIENCE]: { correct: 0, total: 0 },
    [QuestionCategory.ELECTRONICS_INFORMATION]: { correct: 0, total: 0 },
    [QuestionCategory.AUTO_SHOP]: { correct: 0, total: 0 },
    [QuestionCategory.MECHANICAL_COMPREHENSION]: { correct: 0, total: 0 },
    [QuestionCategory.ASSEMBLING_OBJECTS]: { correct: 0, total: 0 },
  };

  // This would need to be implemented with actual question data
  // For now, return a mock calculation
  const wordKnowledge = Math.floor(Math.random() * 100);
  const paragraphComprehension = Math.floor(Math.random() * 100);
  const arithmeticReasoning = Math.floor(Math.random() * 100);
  const mathematicsKnowledge = Math.floor(Math.random() * 100);

  // AFQT composite calculation (simplified)
  const composite = Math.round(
    (wordKnowledge + paragraphComprehension + arithmeticReasoning + mathematicsKnowledge) / 4
  );

  const percentile = scoreToPercentile(composite);

  return {
    wordKnowledge,
    paragraphComprehension,
    arithmeticReasoning,
    mathematicsKnowledge,
    composite,
    percentile,
  };
};

/**
 * Convert raw score to percentile
 */
export const scoreToPercentile = (score: number): number => {
  // Simplified percentile calculation
  if (score >= 90) return 99;
  if (score >= 80) return 95;
  if (score >= 70) return 85;
  if (score >= 60) return 70;
  if (score >= 50) return 50;
  if (score >= 40) return 30;
  if (score >= 30) return 15;
  return 5;
};

/**
 * Get performance category from score
 */
export const getPerformanceCategory = (score: number): 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'UNACCEPTABLE' => {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'NEEDS_IMPROVEMENT';
  return 'UNACCEPTABLE';
};

/**
 * Get random military performance message
 */
export const getPerformanceMessage = (score: number): string => {
  const category = getPerformanceCategory(score);
  const messages = PERFORMANCE_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Format time duration in seconds to human readable format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

/**
 * Format time for display (MM:SS or HH:MM:SS)
 */
export const formatTimeDisplay = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Calculate quiz score percentage
 */
export const calculateQuizScore = (quizQuestions: QuizQuestion[]): number => {
  const answeredQuestions = quizQuestions.filter(q => q.userAnswer !== undefined);
  if (answeredQuestions.length === 0) return 0;
  
  const correctAnswers = answeredQuestions.filter(q => q.isCorrect).length;
  return Math.round((correctAnswers / answeredQuestions.length) * 100);
};

/**
 * Generate military-style daily mission
 */
export const generateDailyMission = (
  branch: MilitaryBranch, 
  weakestCategory?: QuestionCategory
): string => {
  const personnelTitle = getPersonnelTitle(branch).toLowerCase();
  const exclamation = getBranchExclamation(branch);
  
  const missions = [
    `Your objective: Complete 10 practice questions before 2100 hours, ${personnelTitle}!`,
    `Daily orders: Master ${weakestCategory ? weakestCategory.toLowerCase().replace('_', ' ') : 'arithmetic reasoning'} questions today!`,
    `Mission briefing: Achieve 80% accuracy on today's quiz challenge!`,
    `Training directive: Study for 30 minutes and report back, ${personnelTitle}!`,
    `Tactical objective: Review weak areas and strengthen your readiness!`,
  ];

  const mission = missions[Math.floor(Math.random() * missions.length)];
  return `${mission} ${exclamation}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

/**
 * Get subscription status color
 */
export const getSubscriptionStatusColor = (isActive: boolean, trialEndsAt?: Date): string => {
  if (!isActive) return '#DC143C'; // Danger red
  if (trialEndsAt && new Date() > trialEndsAt) return '#FFD700'; // Warning gold
  return '#228B22'; // Success green
};

/**
 * Check if user is in trial period
 */
export const isInTrialPeriod = (trialEndsAt?: Date): boolean => {
  if (!trialEndsAt) return false;
  return new Date() < trialEndsAt;
};

/**
 * Get days remaining in trial
 */
export const getTrialDaysRemaining = (trialEndsAt?: Date): number => {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const trial = new Date(trialEndsAt);
  if (now > trial) return 0;
  
  const diffTime = trial.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Format score for display
 */
export const formatScore = (score: number): string => {
  return `${score}%`;
};

/**
 * Get readiness level from percentage
 */
export const getReadinessLevel = (percentage: number): 'READY' | 'CLOSE' | 'NEEDS_WORK' => {
  if (percentage >= 80) return 'READY';
  if (percentage >= 60) return 'CLOSE';
  return 'NEEDS_WORK';
};

/**
 * Get readiness color
 */
export const getReadinessColor = (percentage: number): string => {
  const level = getReadinessLevel(percentage);
  switch (level) {
    case 'READY': return '#228B22'; // Green
    case 'CLOSE': return '#FFD700'; // Yellow  
    case 'NEEDS_WORK': return '#DC143C'; // Red
    default: return '#4682B4'; // Blue
  }
};

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};