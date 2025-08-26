import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch, Question } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { QuizTimer } from '../Timer/QuizTimer';
import { Whiteboard } from '../Whiteboard/Whiteboard';
import { Calculator } from '../Calculator/Calculator';
import { QuestionBookmark } from '../Review/QuestionBookmark';
import { OfflineIndicator } from '../Offline/OfflineIndicator';
import { SubscriptionGate } from '../../Premium/SubscriptionGate';
import { purchaseService } from '@/services/purchaseService';
import { MilitaryCard, MilitaryCardContent } from '../../UI/MilitaryCard';

interface EnhancedQuizScreenProps {
  question: Question;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeLimit?: number;
  onAnswer: (answer: string) => void;
  onTimeUp: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onBookmark: (questionId: string, note?: string) => void;
  onFlag: (questionId: string) => void;
  selectedAnswer?: string;
  isBookmarked?: boolean;
  isFlagged?: boolean;
  branch?: MilitaryBranch;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export const EnhancedQuizScreen: React.FC<EnhancedQuizScreenProps> = ({
  question,
  currentQuestionIndex,
  totalQuestions,
  timeLimit,
  onAnswer,
  onTimeUp,
  onNext,
  onPrevious,
  onBookmark,
  onFlag,
  selectedAnswer,
  isBookmarked = false,
  isFlagged = false,
  branch,
  isPaused = false,
  onPause,
  onResume,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState<string>('');
  const [hasWhiteboardAccess, setHasWhiteboardAccess] = useState(false);
  const [hasCalculatorAccess, setHasCalculatorAccess] = useState(true); // Basic calculator is free

  const timerRef = useRef<any>(null);

  useEffect(() => {
    checkPremiumAccess();
  }, []);

  const checkPremiumAccess = async () => {
    try {
      const whiteboardAccess = await purchaseService.checkSubscriptionGate('whiteboard');
      setHasWhiteboardAccess(whiteboardAccess);
    } catch (error) {
      console.error('Failed to check premium access:', error);
    }
  };

  const handleWhiteboardPress = async () => {
    if (hasWhiteboardAccess) {
      setShowWhiteboard(true);
    } else {
      setShowUpgradePrompt(true);
    }
  };

  const handleCalculatorPress = () => {
    setShowCalculator(true);
  };

  const handleFlagPress = () => {
    Alert.alert(
      'Flag Question',
      'Flag this question for review at the end of the quiz?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Flag', 
          onPress: () => onFlag(question.id),
          style: 'default'
        },
      ]
    );
  };

  const getMilitaryEncouragement = (): string => {
    const progress = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);
    
    if (progress >= 90) {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "Final push, Soldier! Victory is within reach!";
        case MilitaryBranch.NAVY:
          return "Approaching port, Sailor! Steady as she goes!";
        case MilitaryBranch.AIR_FORCE:
          return "Final approach, Airman! Prepare for landing!";
        case MilitaryBranch.MARINES:
          return "Mission almost complete, Marine! Finish strong!";
        case MilitaryBranch.COAST_GUARD:
          return "Rescue nearly complete, Coastie! Stay focused!";
        case MilitaryBranch.SPACE_FORCE:
          return "Mission completion imminent, Guardian! Hold course!";
        default:
          return "Almost there! Keep going!";
      }
    } else if (progress >= 50) {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "Halfway point secured, Soldier! Maintain momentum!";
        case MilitaryBranch.NAVY:
          return "Mid-voyage checkpoint, Sailor! Full steam ahead!";
        case MilitaryBranch.AIR_FORCE:
          return "Cruising altitude achieved, Airman! Stay on course!";
        case MilitaryBranch.MARINES:
          return "Objective 50% complete, Marine! Push forward!";
        case MilitaryBranch.COAST_GUARD:
          return "Halfway to rescue, Coastie! Keep it steady!";
        case MilitaryBranch.SPACE_FORCE:
          return "Mid-orbit achieved, Guardian! Continue trajectory!";
        default:
          return "Halfway there! You're doing great!";
      }
    } else {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "Mission underway, Soldier! Stay sharp and focused!";
        case MilitaryBranch.NAVY:
          return "Underway and making way, Sailor! Keep bearing!";
        case MilitaryBranch.AIR_FORCE:
          return "Airborne and climbing, Airman! Maintain heading!";
        case MilitaryBranch.MARINES:
          return "Advancing on objective, Marine! Stay strong!";
        case MilitaryBranch.COAST_GUARD:
          return "Rescue mission active, Coastie! Stay ready!";
        case MilitaryBranch.SPACE_FORCE:
          return "Launch successful, Guardian! Achieving orbit!";
        default:
          return "You're off to a great start!";
      }
    }
  };

  const getDifficultyColor = (): string => {
    switch (question.difficulty) {
      case 'EASY': return theme.colors.SUCCESS;
      case 'MEDIUM': return theme.colors.TACTICAL_ORANGE;
      case 'HARD': return theme.colors.DANGER;
      default: return branchColor;
    }
  };

  const getCategoryIcon = (): string => {
    const icons: { [key: string]: string } = {
      'GENERAL_SCIENCE': 'flask',
      'ARITHMETIC_REASONING': 'calculator',
      'WORD_KNOWLEDGE': 'book',
      'PARAGRAPH_COMPREHENSION': 'document-text',
      'MATHEMATICS_KNOWLEDGE': 'stats-chart',
      'ELECTRONICS_INFORMATION': 'hardware-chip',
      'AUTO_SHOP': 'build',
      'MECHANICAL_COMPREHENSION': 'cog',
      'ASSEMBLING_OBJECTS': 'cube',
    };
    return icons[question.category] || 'help-circle';
  };

  return (
    <View style={styles.container}>
      {/* Header with Timer and Tools */}
      <View style={[styles.header, { borderBottomColor: branchColor }]}>
        <View style={styles.headerLeft}>
          <OfflineIndicator branch={userBranch} />
        </View>

        <View style={styles.headerCenter}>
          {timeLimit && (
            <QuizTimer
              ref={timerRef}
              initialTime={timeLimit}
              onTimeUp={onTimeUp}
              isPaused={isPaused}
              showMinimized={true}
              branch={userBranch}
            />
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={handleCalculatorPress}
          >
            <Ionicons name="calculator" size={20} color={branchColor} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toolButton,
              !hasWhiteboardAccess && styles.premiumToolButton,
            ]}
            onPress={handleWhiteboardPress}
          >
            <Ionicons name="create" size={20} color={hasWhiteboardAccess ? branchColor : theme.colors.KHAKI} />
            {!hasWhiteboardAccess && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={8} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {(onPause || onResume) && (
            <TouchableOpacity
              style={styles.toolButton}
              onPress={isPaused ? onResume : onPause}
            >
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={20} 
                color={branchColor} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress and Question Info */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressText, { color: branchColor }]}>
            QUESTION {currentQuestionIndex + 1} OF {totalQuestions}
          </Text>
          <Text style={styles.encouragementText}>
            {getMilitaryEncouragement()}
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                backgroundColor: branchColor,
              },
            ]}
          />
        </View>

        <View style={styles.questionMeta}>
          <View style={styles.categoryInfo}>
            <View style={[styles.categoryIcon, { backgroundColor: `${branchColor}20` }]}>
              <Ionicons name={getCategoryIcon()} size={16} color={branchColor} />
            </View>
            <Text style={styles.categoryText}>
              {question.category.replace(/_/g, ' ')}
            </Text>
          </View>

          <View style={styles.questionActions}>
            <QuestionBookmark
              question={question}
              isBookmarked={isBookmarked}
              onToggleBookmark={onBookmark}
              branch={userBranch}
            />
            
            <TouchableOpacity
              style={[
                styles.flagButton,
                isFlagged && { backgroundColor: `${theme.colors.TACTICAL_ORANGE}20` },
              ]}
              onPress={handleFlagPress}
            >
              <Ionicons
                name={isFlagged ? "flag" : "flag-outline"}
                size={20}
                color={isFlagged ? theme.colors.TACTICAL_ORANGE : theme.colors.KHAKI}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Question Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <MilitaryCard variant="intel" branch={userBranch} style={styles.questionCard}>
          <MilitaryCardContent>
            <View style={styles.difficultyBadge}>
              <View
                style={[
                  styles.difficultyIndicator,
                  { backgroundColor: getDifficultyColor() },
                ]}
              >
                <Text style={styles.difficultyText}>
                  {question.difficulty}
                </Text>
              </View>
            </View>

            <Text style={styles.questionText}>
              {question.content}
            </Text>

            {/* Answer Options */}
            <View style={styles.answersContainer}>
              {question.options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = selectedAnswer === optionLetter;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.answerOption,
                      { borderColor: branchColor },
                      isSelected && { backgroundColor: `${branchColor}20`, borderWidth: 3 },
                    ]}
                    onPress={() => onAnswer(optionLetter)}
                  >
                    <View style={[
                      styles.optionLetter,
                      { backgroundColor: isSelected ? branchColor : 'transparent' },
                    ]}>
                      <Text style={[
                        styles.optionLetterText,
                        { color: isSelected ? '#FFFFFF' : branchColor },
                      ]}>
                        {optionLetter}
                      </Text>
                    </View>
                    <Text style={styles.optionText}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </MilitaryCardContent>
        </MilitaryCard>
      </ScrollView>

      {/* Navigation */}
      <View style={[styles.navigation, { borderTopColor: branchColor }]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentQuestionIndex === 0 && styles.disabledButton,
          ]}
          onPress={onPrevious}
          disabled={currentQuestionIndex === 0}
        >
          <Ionicons name="chevron-back" size={20} color={branchColor} />
          <Text style={[styles.navButtonText, { color: branchColor }]}>
            PREVIOUS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: branchColor }]}
          onPress={onNext}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex === totalQuestions - 1 ? 'FINISH' : 'NEXT'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <Whiteboard
        isVisible={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        onUpgradeRequired={() => {
          setShowWhiteboard(false);
          setShowUpgradePrompt(true);
        }}
        savedData={whiteboardData}
        onSaveData={setWhiteboardData}
        branch={userBranch}
      />

      <Calculator
        isVisible={showCalculator}
        onClose={() => setShowCalculator(false)}
        mode="scientific"
        branch={userBranch}
      />

      <SubscriptionGate
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          setShowUpgradePrompt(false);
          // Handle upgrade flow
        }}
        feature="whiteboard"
        featureTitle="Digital Whiteboard"
        featureDescription="Access the tactical planning board to work out complex calculations and visualize problems."
        branch={userBranch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
  },
  toolButton: {
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    position: 'relative',
  },
  premiumToolButton: {
    opacity: 0.6,
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    padding: theme.spacing[4],
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  progressText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    marginBottom: theme.spacing[2],
  },
  encouragementText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressBar: {
    height: 8,
    backgroundColor: `${theme.colors.KHAKI}20`,
    borderRadius: 4,
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  questionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  questionActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  flagButton: {
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  questionCard: {
    marginBottom: theme.spacing[4],
  },
  difficultyBadge: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing[3],
  },
  difficultyIndicator: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  difficultyText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  questionText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.lg,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: theme.spacing[6],
  },
  answersContainer: {
    gap: theme.spacing[3],
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    gap: theme.spacing[3],
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'currentColor',
  },
  optionLetterText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  optionText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 22,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    borderTopWidth: 2,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[2],
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  nextButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
  },
});