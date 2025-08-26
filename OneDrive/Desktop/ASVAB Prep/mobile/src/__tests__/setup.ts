import { configure } from '@testing-library/react-native';

// Configure Testing Library
configure({
  testIdAttribute: 'testID',
});

// Mock military branch data for tests
export const mockMilitaryBranches = [
  {
    id: 'ARMY',
    name: 'Army',
    motto: 'Army Strong',
    greeting: 'Hooah!',
    color: '#4B5320',
  },
  {
    id: 'NAVY',
    name: 'Navy', 
    motto: 'Anchors Aweigh',
    greeting: 'Hooyah!',
    color: '#000080',
  },
  {
    id: 'AIR_FORCE',
    name: 'Air Force',
    motto: 'Aim High',
    greeting: 'Hoorah!',
    color: '#00308F',
  },
  {
    id: 'MARINES',
    name: 'Marines',
    motto: 'Semper Fi',
    greeting: 'Oorah!',
    color: '#CC0000',
  },
  {
    id: 'COAST_GUARD',
    name: 'Coast Guard',
    motto: 'Semper Paratus',
    greeting: 'Hooyah!',
    color: '#FF8C00',
  },
  {
    id: 'SPACE_FORCE',
    name: 'Space Force',
    motto: 'Semper Supra',
    greeting: 'Hoorah!',
    color: '#1C39BB',
  },
];

// Mock user factory
export const createMockUser = (overrides = {}) => ({
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Mock quiz factory
export const createMockQuiz = (overrides = {}) => ({
  id: 'test-quiz-123',
  userId: 'test-user-123',
  category: 'ARITHMETIC_REASONING',
  difficulty: 'MEDIUM',
  score: 85,
  totalQuestions: 10,
  correctAnswers: 8,
  completedAt: new Date().toISOString(),
  questions: [],
  ...overrides,
});

// Mock question factory
export const createMockQuestion = (overrides = {}) => ({
  id: 'test-question-123',
  content: 'What is 2 + 2?',
  category: 'ARITHMETIC_REASONING',
  difficulty: 'EASY',
  correctAnswer: 'A',
  options: ['4', '3', '5', '6'],
  explanation: 'Basic addition: 2 + 2 equals 4.',
  explanationPremium: 'Detailed explanation: Addition is combining numbers...',
  tags: ['addition', 'basic'],
  branchRelevance: ['ARMY', 'NAVY', 'AIR_FORCE'],
  isActive: true,
  ...overrides,
});

// Mock flashcard factory
export const createMockFlashcard = (overrides = {}) => ({
  id: 'test-flashcard-123',
  category: 'WORD_KNOWLEDGE',
  difficulty: 'MEDIUM',
  front: 'What does "reconnaissance" mean?',
  back: 'Military observation of enemy positions or activities',
  tags: ['vocabulary', 'military'],
  branchRelevance: ['ARMY', 'MARINES'],
  ...overrides,
});

// Mock API responses
export const mockApiResponses = {
  auth: {
    login: {
      success: {
        user: createMockUser(),
        token: 'mock-jwt-token-12345',
        refreshToken: 'mock-refresh-token',
      },
      error: {
        message: 'Invalid credentials',
        statusCode: 401,
      },
    },
    register: {
      success: {
        user: createMockUser(),
        token: 'mock-jwt-token-12345',
      },
      error: {
        message: 'Email already exists',
        statusCode: 409,
      },
    },
  },
  questions: {
    list: {
      success: {
        questions: [createMockQuestion(), createMockQuestion({ id: 'q2', content: 'What is 3 + 3?' })],
        totalCount: 2,
        hasMore: false,
      },
    },
    single: {
      success: createMockQuestion(),
    },
  },
  quizzes: {
    create: {
      success: createMockQuiz(),
    },
    list: {
      success: {
        quizzes: [createMockQuiz()],
        totalCount: 1,
      },
    },
  },
  subscription: {
    status: {
      free: {
        tier: 'FREE',
        isActive: true,
        limits: {
          questionsPerDay: 50,
          quizzesPerDay: 1,
          categoriesAccess: 3,
        },
      },
      premium: {
        tier: 'PREMIUM',
        isActive: true,
        limits: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  },
};

// Mock navigation helpers
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
};

export const mockRoute = {
  params: {},
  name: 'TestScreen',
  key: 'test-screen-key',
};

// Mock store helpers
export const createMockStore = (initialState = {}) => {
  const defaultState = {
    auth: {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    },
    quiz: {
      currentQuiz: null,
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      isLoading: false,
    },
    subscription: {
      tier: 'FREE',
      isActive: false,
      limits: null,
    },
    ...initialState,
  };

  return {
    getState: () => defaultState,
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  };
};

// Test utilities
export const waitFor = (callback: () => void, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkCondition = () => {
      try {
        callback();
        resolve(true);
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(checkCondition, 100);
        }
      }
    };
    checkCondition();
  });
};

// Mock theme for styled components
export const mockTheme = {
  colors: {
    primary: '#4B5320',
    secondary: '#C2B280',
    background: '#3C3D37',
    surface: '#BDB76B',
    accent: '#FF8C00',
    text: {
      primary: '#FFFFFF',
      secondary: '#BDB76B',
      disabled: '#808080',
    },
    status: {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8',
    },
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

// Military terminology for consistent testing
export const militaryTerms = {
  ARMY: {
    greeting: 'Hooah!',
    title: 'Soldier',
    motto: 'Army Strong',
  },
  NAVY: {
    greeting: 'Hooyah!',
    title: 'Sailor',
    motto: 'Anchors Aweigh',
  },
  AIR_FORCE: {
    greeting: 'Hoorah!',
    title: 'Airman',
    motto: 'Aim High',
  },
  MARINES: {
    greeting: 'Oorah!',
    title: 'Marine',
    motto: 'Semper Fi',
  },
  COAST_GUARD: {
    greeting: 'Hooyah!',
    title: 'Coastie',
    motto: 'Semper Paratus',
  },
  SPACE_FORCE: {
    greeting: 'Hoorah!',
    title: 'Guardian',
    motto: 'Semper Supra',
  },
};

// Setup global mocks
beforeEach(() => {
  fetch.resetMocks();
  jest.clearAllMocks();
});

console.log('📱 Mobile test environment configured for ASVAB Prep');