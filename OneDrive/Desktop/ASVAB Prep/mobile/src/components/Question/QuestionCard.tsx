import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryButton } from '../UI/MilitaryButton';
import { Question, MilitaryBranch } from '@asvab-prep/shared';

interface QuestionCardProps {
  question: Question;
  selectedAnswer?: number;
  onAnswerSelect: (answerIndex: number) => void;
  onSubmit: () => void;
  showAnswer?: boolean;
  correctAnswer?: number;
  explanation?: string;
  isPremiumExplanation?: boolean;
  branch: MilitaryBranch;
  questionNumber?: number;
  totalQuestions?: number;
  disabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  onSubmit,
  showAnswer = false,
  correctAnswer,
  explanation,
  isPremiumExplanation = false,
  branch,
  questionNumber,
  totalQuestions,
  disabled = false,
}) => {
  const [fadeAnim] = useState(new Animated.Value(1));

  const handleAnswerSelect = (answerIndex: number) => {
    if (disabled || showAnswer) return;
    
    // Animate selection
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onAnswerSelect(answerIndex);
  };

  const getAnswerOptionStyle = (index: number) => {
    const baseStyle = styles.answerOption;
    
    if (showAnswer && correctAnswer !== undefined) {
      if (index === correctAnswer) {
        return [baseStyle, styles.correctAnswer];
      } else if (index === selectedAnswer && index !== correctAnswer) {
        return [baseStyle, styles.incorrectAnswer];
      }
    } else if (selectedAnswer === index) {
      return [baseStyle, styles.selectedAnswer, { borderColor: theme.branchColors[branch] }];
    }
    
    return baseStyle;
  };

  const getAnswerTextStyle = (index: number) => {
    const baseStyle = styles.answerText;
    
    if (showAnswer && correctAnswer !== undefined) {
      if (index === correctAnswer || (index === selectedAnswer && index !== correctAnswer)) {
        return [baseStyle, styles.answerTextHighlight];
      }
    } else if (selectedAnswer === index) {
      return [baseStyle, styles.selectedAnswerText];
    }
    
    return baseStyle;
  };

  const getCategoryDisplay = () => {
    return question.category.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDifficultyColor = () => {
    switch (question.difficulty) {
      case 'EASY': return theme.colors.SUCCESS;
      case 'MEDIUM': return theme.colors.WARNING;
      case 'HARD': return theme.colors.DANGER;
      default: return theme.colors.INFO;
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <MilitaryCard variant="standard" branch={branch}>
        <MilitaryCardHeader
          title={`Question ${questionNumber || 1}${totalQuestions ? ` of ${totalQuestions}` : ''}`}
          subtitle={`${getCategoryDisplay()} • ${question.difficulty}`}
        />
        
        <MilitaryCardContent>
          <View style={styles.questionHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{getCategoryDisplay()}</Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() }]}>
              <Text style={styles.difficultyText}>{question.difficulty}</Text>
            </View>
          </View>

          <ScrollView style={styles.questionContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.questionText}>{question.content}</Text>
            
            <View style={styles.answersContainer}>
              {question.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={getAnswerOptionStyle(index)}
                  onPress={() => handleAnswerSelect(index)}
                  disabled={disabled || showAnswer}
                  activeOpacity={0.8}
                >
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>
                      {String.fromCharCode(65 + index)}.
                    </Text>
                    <Text style={getAnswerTextStyle(index)}>{option}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {!showAnswer && selectedAnswer !== undefined && (
              <View style={styles.submitContainer}>
                <MilitaryButton
                  title="Submit Answer"
                  onPress={onSubmit}
                  variant="primary"
                  branch={branch}
                  style={styles.submitButton}
                />
              </View>
            )}

            {showAnswer && explanation && (
              <View style={styles.explanationContainer}>
                <View style={styles.explanationHeader}>
                  <Text style={styles.explanationTitle}>
                    EXPLANATION{isPremiumExplanation ? ' (PREMIUM)' : ''}
                  </Text>
                  {isPremiumExplanation && (
                    <View style={styles.premiumBadge}>
                      <Text style={styles.premiumBadgeText}>★ PREMIUM</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.explanationText}>{explanation}</Text>
              </View>
            )}
          </ScrollView>
        </MilitaryCardContent>
      </MilitaryCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing[4],
    marginVertical: theme.spacing[2],
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[4],
  },
  categoryBadge: {
    backgroundColor: theme.colors.DESERT_SAND,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.base,
  },
  categoryText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.DARK_OLIVE,
  },
  difficultyBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.base,
  },
  difficultyText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  questionContent: {
    maxHeight: 500,
  },
  questionText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: theme.spacing[6],
  },
  answersContainer: {
    marginBottom: theme.spacing[4],
  },
  answerOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.sm,
  },
  selectedAnswer: {
    borderColor: theme.colors.MILITARY_GREEN,
    backgroundColor: `${theme.colors.MILITARY_GREEN}10`,
  },
  correctAnswer: {
    borderColor: theme.colors.SUCCESS,
    backgroundColor: `${theme.colors.SUCCESS}10`,
  },
  incorrectAnswer: {
    borderColor: theme.colors.DANGER,
    backgroundColor: `${theme.colors.DANGER}10`,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  answerLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DARK_OLIVE,
    marginRight: theme.spacing[3],
    minWidth: 20,
  },
  answerText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
  selectedAnswerText: {
    fontFamily: theme.fonts.body.semiBold,
    color: theme.colors.DARK_OLIVE,
  },
  answerTextHighlight: {
    fontFamily: theme.fonts.body.semiBold,
    color: '#FFFFFF',
  },
  submitContainer: {
    alignItems: 'center',
    marginTop: theme.spacing[4],
  },
  submitButton: {
    minWidth: 200,
  },
  explanationContainer: {
    marginTop: theme.spacing[6],
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.base,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.MILITARY_GREEN,
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  explanationTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DARK_OLIVE,
  },
  premiumBadge: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  premiumBadgeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  explanationText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
});