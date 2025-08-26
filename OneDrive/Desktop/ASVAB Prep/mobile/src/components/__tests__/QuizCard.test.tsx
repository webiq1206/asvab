import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuizCard } from '../QuizCard';
import { createMockQuiz, mockTheme, mockNavigation } from '../../__tests__/setup';
import { ThemeProvider } from '../ThemeProvider';

// Mock the navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={mockTheme}>
    {children}
  </ThemeProvider>
);

describe('QuizCard Component', () => {
  const mockQuiz = createMockQuiz({
    id: 'quiz-card-test-123',
    category: 'ARITHMETIC_REASONING',
    difficulty: 'MEDIUM',
    score: 85,
    totalQuestions: 20,
    correctAnswers: 17,
    completedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render quiz information correctly', () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} />
        </TestWrapper>
      );

      expect(getByText('Arithmetic Reasoning')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('85%')).toBeTruthy();
      expect(getByText('17/20')).toBeTruthy();
      expect(getByTestId('quiz-card')).toBeTruthy();
    });

    it('should display military branch-specific styling', () => {
      const armyQuiz = createMockQuiz({
        branch: 'ARMY',
        userBranch: 'ARMY',
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={armyQuiz} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      expect(card.props.style).toEqual(
        expect.objectContaining({
          borderLeftColor: expect.any(String), // Army color
        })
      );
    });

    it('should show completion date in readable format', () => {
      const { getByText } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} />
        </TestWrapper>
      );

      expect(getByText(/Jan 15/)).toBeTruthy(); // Date formatting
    });

    it('should display score with appropriate color coding', () => {
      // High score - should be green
      const highScoreQuiz = createMockQuiz({ score: 95 });
      const { getByTestId: getByTestIdHigh } = render(
        <TestWrapper>
          <QuizCard quiz={highScoreQuiz} />
        </TestWrapper>
      );

      const highScoreText = getByTestIdHigh('quiz-score');
      expect(highScoreText.props.style).toEqual(
        expect.objectContaining({
          color: mockTheme.colors.status.success,
        })
      );

      // Low score - should be red
      const lowScoreQuiz = createMockQuiz({ score: 45 });
      const { getByTestId: getByTestIdLow } = render(
        <TestWrapper>
          <QuizCard quiz={lowScoreQuiz} />
        </TestWrapper>
      );

      const lowScoreText = getByTestIdLow('quiz-score');
      expect(lowScoreText.props.style).toEqual(
        expect.objectContaining({
          color: mockTheme.colors.status.error,
        })
      );
    });
  });

  describe('Interactions', () => {
    it('should navigate to quiz details when pressed', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} onPress={jest.fn()} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      fireEvent.press(card);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('QuizDetails', {
        quizId: mockQuiz.id,
      });
    });

    it('should call custom onPress handler when provided', () => {
      const customOnPress = jest.fn();
      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} onPress={customOnPress} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      fireEvent.press(card);

      expect(customOnPress).toHaveBeenCalledWith(mockQuiz);
    });

    it('should show haptic feedback on press', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} enableHaptics={true} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(require('expo-haptics').impactAsync).toHaveBeenCalledWith(
          require('expo-haptics').ImpactFeedbackStyle.Light
        );
      });
    });
  });

  describe('Military Branch Integration', () => {
    it('should display Army-specific elements', () => {
      const armyQuiz = createMockQuiz({
        userBranch: 'ARMY',
        score: 88,
      });

      const { getByText, getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={armyQuiz} showMilitaryContext={true} />
        </TestWrapper>
      );

      const militaryContext = getByTestId('military-context');
      expect(militaryContext).toBeTruthy();
      
      // Should show appropriate military terminology
      expect(getByText(/Soldier/)).toBeTruthy();
    });

    it('should display Navy-specific elements', () => {
      const navyQuiz = createMockQuiz({
        userBranch: 'NAVY',
        score: 92,
      });

      const { getByText } = render(
        <TestWrapper>
          <QuizCard quiz={navyQuiz} showMilitaryContext={true} />
        </TestWrapper>
      );

      expect(getByText(/Sailor/)).toBeTruthy();
      expect(getByText(/ship-shape/)).toBeTruthy(); // Navy terminology
    });

    it('should adapt messaging based on branch', () => {
      const marineQuiz = createMockQuiz({
        userBranch: 'MARINES',
        score: 76,
      });

      const { getByText } = render(
        <TestWrapper>
          <QuizCard quiz={marineQuiz} showMilitaryContext={true} />
        </TestWrapper>
      );

      expect(getByText(/Marine/)).toBeTruthy();
      expect(getByText(/Semper Fi/)).toBeTruthy();
    });
  });

  describe('Performance Indicators', () => {
    it('should show improvement indicator for better performance', () => {
      const improvingQuiz = createMockQuiz({
        score: 85,
        previousScore: 70, // Improvement from 70 to 85
        improvementTrend: 'IMPROVING',
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={improvingQuiz} showTrends={true} />
        </TestWrapper>
      );

      const trendIndicator = getByTestId('trend-indicator');
      expect(trendIndicator.props.children).toContain('↗️'); // Up arrow
    });

    it('should show decline indicator for worse performance', () => {
      const decliningQuiz = createMockQuiz({
        score: 65,
        previousScore: 80,
        improvementTrend: 'DECLINING',
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={decliningQuiz} showTrends={true} />
        </TestWrapper>
      );

      const trendIndicator = getByTestId('trend-indicator');
      expect(trendIndicator.props.children).toContain('↘️'); // Down arrow
    });

    it('should display category-specific performance metrics', () => {
      const detailedQuiz = createMockQuiz({
        categoryBreakdown: {
          'ARITHMETIC_REASONING': { correct: 8, total: 10 },
          'WORD_KNOWLEDGE': { correct: 9, total: 10 },
        },
      });

      const { getByText } = render(
        <TestWrapper>
          <QuizCard quiz={detailedQuiz} showCategoryBreakdown={true} />
        </TestWrapper>
      );

      expect(getByText('80%')).toBeTruthy(); // Arithmetic Reasoning
      expect(getByText('90%')).toBeTruthy(); // Word Knowledge
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} />
        </TestWrapper>
      );

      expect(
        getByLabelText(/Quiz completed.*Arithmetic Reasoning.*Medium difficulty.*Score 85%/)
      ).toBeTruthy();
    });

    it('should support screen reader navigation', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('should announce military context for screen readers', () => {
      const armyQuiz = createMockQuiz({ userBranch: 'ARMY' });
      
      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={armyQuiz} showMilitaryContext={true} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      expect(card.props.accessibilityHint).toContain('Army');
    });
  });

  describe('Subscription Tier Integration', () => {
    it('should show premium features for premium users', () => {
      const premiumQuiz = createMockQuiz({
        userSubscriptionTier: 'PREMIUM',
        hasDetailedAnalytics: true,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={premiumQuiz} />
        </TestWrapper>
      );

      expect(getByTestId('detailed-analytics-button')).toBeTruthy();
    });

    it('should show upgrade prompt for free users', () => {
      const freeUserQuiz = createMockQuiz({
        userSubscriptionTier: 'FREE',
        hasDetailedAnalytics: false,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={freeUserQuiz} />
        </TestWrapper>
      );

      expect(getByTestId('upgrade-prompt')).toBeTruthy();
    });

    it('should limit features for free tier users', () => {
      const freeUserQuiz = createMockQuiz({
        userSubscriptionTier: 'FREE',
      });

      const { queryByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={freeUserQuiz} />
        </TestWrapper>
      );

      // Premium features should not be visible
      expect(queryByTestId('export-results')).toBeNull();
      expect(queryByTestId('detailed-analysis')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing quiz data gracefully', () => {
      const incompleteQuiz = createMockQuiz({
        score: null,
        completedAt: null,
      });

      const { getByText } = render(
        <TestWrapper>
          <QuizCard quiz={incompleteQuiz} />
        </TestWrapper>
      );

      expect(getByText('In Progress')).toBeTruthy();
      expect(getByText('--')).toBeTruthy(); // Score placeholder
    });

    it('should handle network errors when loading additional data', async () => {
      fetch.mockRejectOnce(new Error('Network error'));

      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} loadAdditionalData={true} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      fireEvent.press(card);

      await waitFor(() => {
        // Should still navigate despite network error
        expect(mockNavigation.navigate).toHaveBeenCalled();
      });
    });
  });

  describe('Animation and Performance', () => {
    it('should render without performance issues', () => {
      const start = performance.now();
      
      render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} />
        </TestWrapper>
      );

      const renderTime = performance.now() - start;
      expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle multiple rapid presses', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <QuizCard quiz={mockQuiz} />
        </TestWrapper>
      );

      const card = getByTestId('quiz-card');
      
      // Rapid fire presses
      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      await waitFor(() => {
        // Should only navigate once due to debouncing
        expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      });
    });
  });
});