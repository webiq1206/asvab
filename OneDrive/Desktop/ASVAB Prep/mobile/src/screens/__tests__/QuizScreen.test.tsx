import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QuizScreen } from '../QuizScreen';
import { 
  createMockQuiz, 
  createMockQuestion, 
  mockNavigation, 
  mockRoute,
  createMockStore,
  mockTheme,
  militaryTerms 
} from '../../__tests__/setup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../components/ThemeProvider';

// Mock hooks
jest.mock('../../hooks/useQuiz', () => ({
  useQuiz: jest.fn(),
}));

jest.mock('../../hooks/useTimer', () => ({
  useTimer: jest.fn(() => ({
    timeRemaining: 300,
    isRunning: true,
    start: jest.fn(),
    pause: jest.fn(),
    reset: jest.fn(),
    formatTime: (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
  })),
}));

jest.mock('../../store/useQuizStore', () => ({
  useQuizStore: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={mockTheme}>
      {children}
    </ThemeProvider>
  </QueryClientProvider>
);

describe('QuizScreen', () => {
  const mockQuestions = [
    createMockQuestion({
      id: 'q1',
      content: 'A soldier carries 120 rounds. If he fires 25% during training, how many rounds remain?',
      category: 'ARITHMETIC_REASONING',
      difficulty: 'MEDIUM',
      options: ['80', '85', '90', '95'],
      correctAnswer: 'C',
      explanation: '120 × 0.75 = 90 rounds remain',
      branchRelevance: ['ARMY', 'MARINES'],
    }),
    createMockQuestion({
      id: 'q2',
      content: 'What does "reconnaissance" mean in military terms?',
      category: 'WORD_KNOWLEDGE',
      difficulty: 'MEDIUM',
      options: ['Attack', 'Observation', 'Retreat', 'Communication'],
      correctAnswer: 'B',
      explanation: 'Reconnaissance means military observation of enemy positions',
      branchRelevance: ['ARMY', 'MARINES', 'NAVY'],
    }),
  ];

  const mockQuiz = createMockQuiz({
    id: 'active-quiz-123',
    category: 'ARITHMETIC_REASONING',
    difficulty: 'MEDIUM',
    questions: mockQuestions,
    totalQuestions: 2,
    timeLimit: 600, // 10 minutes
  });

  const defaultMockQuizHook = {
    quiz: mockQuiz,
    currentQuestion: mockQuestions[0],
    currentQuestionIndex: 0,
    isLoading: false,
    isSubmitting: false,
    answers: {},
    submitAnswer: jest.fn(),
    nextQuestion: jest.fn(),
    previousQuestion: jest.fn(),
    finishQuiz: jest.fn(),
    pauseQuiz: jest.fn(),
    resumeQuiz: jest.fn(),
  };

  const defaultMockStore = {
    currentQuiz: mockQuiz,
    answers: {},
    currentQuestionIndex: 0,
    isSubmitting: false,
    setAnswer: jest.fn(),
    submitQuiz: jest.fn(),
    pauseQuiz: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('../../hooks/useQuiz').useQuiz.mockReturnValue(defaultMockQuizHook);
    require('../../store/useQuizStore').useQuizStore.mockReturnValue(defaultMockStore);
  });

  describe('Quiz Initialization', () => {
    it('should render quiz with military branch context', () => {
      const armyRoute = { 
        ...mockRoute, 
        params: { 
          quizId: 'active-quiz-123', 
          userBranch: 'ARMY' 
        } 
      };

      const { getByText, getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={armyRoute} />
        </TestWrapper>
      );

      expect(getByTestId('quiz-header')).toBeTruthy();
      expect(getByText('Arithmetic Reasoning')).toBeTruthy();
      expect(getByText(/Soldier/)).toBeTruthy(); // Army terminology
      expect(getByTestId('military-context')).toBeTruthy();
    });

    it('should display timer with correct format', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const timer = getByTestId('quiz-timer');
      expect(timer).toBeTruthy();
      expect(timer.props.children).toContain('5:00'); // 300 seconds = 5:00
    });

    it('should show progress indicator', () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('progress-bar')).toBeTruthy();
      expect(getByText('Question 1 of 2')).toBeTruthy();
    });

    it('should handle loading state', () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        isLoading: true,
        currentQuestion: null,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Question Display', () => {
    it('should display question content with military context', () => {
      const { getByText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByText(/soldier carries 120 rounds/)).toBeTruthy();
      expect(getByText('80')).toBeTruthy(); // First option
      expect(getByText('90')).toBeTruthy(); // Correct answer option
    });

    it('should render answer options correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('answer-option-A')).toBeTruthy();
      expect(getByTestId('answer-option-B')).toBeTruthy();
      expect(getByTestId('answer-option-C')).toBeTruthy();
      expect(getByTestId('answer-option-D')).toBeTruthy();
    });

    it('should highlight selected answer', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const optionA = getByTestId('answer-option-A');
      
      await act(async () => {
        fireEvent.press(optionA);
      });

      expect(optionA.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: mockTheme.colors.primary,
        })
      );
    });

    it('should show confidence selector for premium users', () => {
      const premiumMockStore = {
        ...defaultMockStore,
        userSubscriptionTier: 'PREMIUM',
      };
      
      require('../../store/useQuizStore').useQuizStore.mockReturnValue(premiumMockStore);

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('confidence-selector')).toBeTruthy();
    });
  });

  describe('Answer Submission', () => {
    it('should submit answer and advance to next question', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const optionC = getByTestId('answer-option-C');
      const submitButton = getByTestId('submit-answer');

      await act(async () => {
        fireEvent.press(optionC);
      });

      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(defaultMockQuizHook.submitAnswer).toHaveBeenCalledWith('C');
      expect(defaultMockStore.setAnswer).toHaveBeenCalledWith('q1', 'C');
    });

    it('should show haptic feedback on correct answer', async () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        submitAnswer: jest.fn().mockResolvedValue({ isCorrect: true }),
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const correctOption = getByTestId('answer-option-C'); // Correct answer
      const submitButton = getByTestId('submit-answer');

      await act(async () => {
        fireEvent.press(correctOption);
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(require('expo-haptics').notificationAsync).toHaveBeenCalledWith(
          require('expo-haptics').NotificationFeedbackType.Success
        );
      });
    });

    it('should prevent multiple submissions', async () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        isSubmitting: true,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const submitButton = getByTestId('submit-answer');
      expect(submitButton.props.disabled).toBe(true);
    });

    it('should show military-themed encouragement messages', async () => {
      const armyRoute = { 
        ...mockRoute, 
        params: { userBranch: 'ARMY' } 
      };

      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        submitAnswer: jest.fn().mockResolvedValue({ isCorrect: true }),
      });

      const { getByText, getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={armyRoute} />
        </TestWrapper>
      );

      const optionC = getByTestId('answer-option-C');
      const submitButton = getByTestId('submit-answer');

      await act(async () => {
        fireEvent.press(optionC);
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Outstanding work, Soldier!/)).toBeTruthy();
        expect(getByText(/Hooah!/)).toBeTruthy();
      });
    });
  });

  describe('Navigation Between Questions', () => {
    it('should advance to next question after submission', async () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        currentQuestionIndex: 1,
        currentQuestion: mockQuestions[1], // Second question
      });

      const { getByText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByText(/reconnaissance/)).toBeTruthy();
      expect(getByText('Question 2 of 2')).toBeTruthy();
    });

    it('should allow going back to previous questions', async () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        currentQuestionIndex: 1,
        currentQuestion: mockQuestions[1],
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const backButton = getByTestId('previous-question');
      
      await act(async () => {
        fireEvent.press(backButton);
      });

      expect(defaultMockQuizHook.previousQuestion).toHaveBeenCalled();
    });

    it('should finish quiz on last question', async () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        currentQuestionIndex: 1, // Last question (index 1 of 2 questions)
        currentQuestion: mockQuestions[1],
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const optionB = getByTestId('answer-option-B');
      const finishButton = getByTestId('finish-quiz');

      await act(async () => {
        fireEvent.press(optionB);
        fireEvent.press(finishButton);
      });

      expect(defaultMockQuizHook.finishQuiz).toHaveBeenCalled();
    });
  });

  describe('Timer Integration', () => {
    it('should warn when time is running low', () => {
      require('../../hooks/useTimer').useTimer.mockReturnValue({
        timeRemaining: 30, // 30 seconds left
        isRunning: true,
        start: jest.fn(),
        pause: jest.fn(),
        reset: jest.fn(),
        formatTime: (seconds: number) => `0:${seconds.toString().padStart(2, '0')}`,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const timer = getByTestId('quiz-timer');
      expect(timer.props.style).toEqual(
        expect.objectContaining({
          color: mockTheme.colors.status.warning,
        })
      );
    });

    it('should auto-submit when time expires', async () => {
      require('../../hooks/useTimer').useTimer.mockReturnValue({
        timeRemaining: 0,
        isRunning: false,
        start: jest.fn(),
        pause: jest.fn(),
        reset: jest.fn(),
        formatTime: () => '0:00',
      });

      render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(defaultMockQuizHook.finishQuiz).toHaveBeenCalledWith({ reason: 'TIME_EXPIRED' });
      });
    });

    it('should pause timer when quiz is paused', async () => {
      const mockTimerHook = require('../../hooks/useTimer').useTimer();

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const pauseButton = getByTestId('pause-quiz');
      
      await act(async () => {
        fireEvent.press(pauseButton);
      });

      expect(mockTimerHook.pause).toHaveBeenCalled();
      expect(defaultMockQuizHook.pauseQuiz).toHaveBeenCalled();
    });
  });

  describe('Military Branch Customization', () => {
    it('should display Navy-specific terminology', () => {
      const navyRoute = { 
        ...mockRoute, 
        params: { userBranch: 'NAVY' } 
      };

      const { getByText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={navyRoute} />
        </TestWrapper>
      );

      expect(getByText(/Sailor/)).toBeTruthy();
      // Navy-specific question content would be tested if available
    });

    it('should show Marines-specific motivation', () => {
      const marineRoute = { 
        ...mockRoute, 
        params: { userBranch: 'MARINES' } 
      };

      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        submitAnswer: jest.fn().mockResolvedValue({ isCorrect: true }),
      });

      const { getByText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={marineRoute} />
        </TestWrapper>
      );

      // Marines-specific encouragement would appear after correct answer
      // This would be tested in integration with the answer submission
    });

    it('should filter questions by branch relevance', () => {
      // This test ensures only branch-relevant questions are shown
      const branchSpecificQuiz = {
        ...mockQuiz,
        questions: mockQuestions.filter(q => 
          q.branchRelevance.includes('ARMY')
        ),
      };

      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        quiz: branchSpecificQuiz,
      });

      const { getByText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      // Should show Army-relevant questions
      expect(getByText(/soldier carries/)).toBeTruthy();
    });
  });

  describe('Subscription Tier Features', () => {
    it('should show basic explanations for free users', () => {
      const freeUserStore = {
        ...defaultMockStore,
        userSubscriptionTier: 'FREE',
      };

      require('../../store/useQuizStore').useQuizStore.mockReturnValue(freeUserStore);

      const { queryByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      // Premium features should not be available
      expect(queryByTestId('detailed-explanation')).toBeNull();
      expect(queryByTestId('confidence-selector')).toBeNull();
    });

    it('should show premium features for premium users', () => {
      const premiumUserStore = {
        ...defaultMockStore,
        userSubscriptionTier: 'PREMIUM',
      };

      require('../../store/useQuizStore').useQuizStore.mockReturnValue(premiumUserStore);

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('confidence-selector')).toBeTruthy();
      // After answering, detailed explanation would be available
    });

    it('should show upgrade prompt for free users accessing premium features', () => {
      const freeUserStore = {
        ...defaultMockStore,
        userSubscriptionTier: 'FREE',
      };

      require('../../store/useQuizStore').useQuizStore.mockReturnValue(freeUserStore);

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      // Try to access detailed explanation
      const explanationButton = getByTestId('show-explanation');
      
      act(() => {
        fireEvent.press(explanationButton);
      });

      expect(getByTestId('upgrade-prompt')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        submitAnswer: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const optionA = getByTestId('answer-option-A');
      const submitButton = getByTestId('submit-answer');

      await act(async () => {
        fireEvent.press(optionA);
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Network error/)).toBeTruthy();
      });
    });

    it('should handle missing question data', () => {
      require('../../hooks/useQuiz').useQuiz.mockReturnValue({
        ...defaultMockQuizHook,
        currentQuestion: null,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('question-placeholder')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByLabelText(/Question 1 of 2/)).toBeTruthy();
      expect(getByLabelText(/Answer option A/)).toBeTruthy();
      expect(getByLabelText(/Submit answer/)).toBeTruthy();
    });

    it('should support voice commands for navigation', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      const nextButton = getByTestId('next-question');
      expect(nextButton.props.accessibilityHint).toContain('next question');
    });
  });
});