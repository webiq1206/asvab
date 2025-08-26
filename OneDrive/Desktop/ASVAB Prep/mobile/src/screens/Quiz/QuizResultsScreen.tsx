import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '@/constants/theme';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { useUserStore } from '@/store/userStore';
import { QuizResult, quizService } from '@/services/quizService';
import { CATEGORY_DISPLAY_NAMES } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface RouteParams {
  quizId: string;
  result: QuizResult;
}

const { width } = Dimensions.get('window');

export const QuizResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { quizId, result } = route.params as RouteParams;
  
  const { user } = useUserStore();
  const { quiz, performanceMessage, recommendations } = result;
  
  const scorePercentage = quiz.score || 0;
  const branchColor = theme.branchColors[user?.selectedBranch || 'ARMY'];
  
  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'OUTSTANDING';
    if (score >= 80) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 60) return 'ADEQUATE';
    return 'NEEDS IMPROVEMENT';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return theme.colors.SUCCESS;
    if (score >= 80) return branchColor;
    if (score >= 70) return theme.colors.TACTICAL_ORANGE;
    if (score >= 60) return theme.colors.WARNING;
    return theme.colors.DANGER;
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 90) return 'star';
    if (score >= 80) return 'trophy';
    if (score >= 70) return 'ribbon';
    if (score >= 60) return 'medal';
    return 'warning';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleRetakeQuiz = () => {
    Alert.alert(
      'Retake Quiz',
      'Would you like to create a new quiz with the same settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create New Quiz', 
          onPress: () => navigation.navigate('QuizSetup', {
            retakeSettings: {
              title: quiz.title,
              category: quiz.category,
              isASVABReplica: quiz.isASVABReplica,
              questionCount: quiz.totalQuestions,
            }
          })
        },
      ]
    );
  };

  const handleViewQuestions = () => {
    navigation.navigate('QuizReview', { quiz });
  };

  const handleBackToHome = () => {
    navigation.navigate('Home');
  };

  const performanceColor = getPerformanceColor(scorePercentage);
  const performanceLevel = getPerformanceLevel(scorePercentage);
  const performanceIcon = getPerformanceIcon(scorePercentage);

  // Calculate category breakdown
  const categoryStats = quiz.questions.reduce((acc, q) => {
    const category = q.question.category;
    if (!acc[category]) {
      acc[category] = { total: 0, correct: 0 };
    }
    acc[category].total++;
    if (q.isCorrect) {
      acc[category].correct++;
    }
    return acc;
  }, {} as Record<string, { total: number; correct: number }>);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Main Results Card */}
      <MilitaryCard variant="command" branch={user?.selectedBranch} style={styles.resultsCard}>
        <MilitaryCardHeader
          title="MISSION COMPLETE"
          subtitle={quiz.title}
          variant="command"
        />

        <MilitaryCardContent>
          {/* Score Display */}
          <View style={styles.scoreSection}>
            <LinearGradient
              colors={[`${performanceColor}20`, `${performanceColor}40`]}
              style={styles.scoreBackground}
            >
              <View style={styles.scoreContent}>
                <Ionicons
                  name={performanceIcon}
                  size={32}
                  color={performanceColor}
                  style={styles.scoreIcon}
                />
                <Text style={[styles.scoreText, { color: performanceColor }]}>
                  {scorePercentage}%
                </Text>
                <Text style={[styles.performanceLevel, { color: performanceColor }]}>
                  {performanceLevel}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Performance Message */}
          <View style={styles.messageSection}>
            <Text style={styles.performanceMessage}>{performanceMessage}</Text>
          </View>

          {/* Quiz Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quiz.correctAnswers}</Text>
              <Text style={styles.statLabel}>CORRECT</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quiz.totalQuestions - quiz.correctAnswers}</Text>
              <Text style={styles.statLabel}>INCORRECT</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quiz.totalQuestions}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(quiz.timeSpent || 0)}</Text>
              <Text style={styles.statLabel}>TIME</Text>
            </View>
          </View>
        </MilitaryCardContent>
      </MilitaryCard>

      {/* Category Breakdown */}
      {Object.keys(categoryStats).length > 1 && (
        <MilitaryCard variant="tactical" branch={user?.selectedBranch} style={styles.breakdownCard}>
          <MilitaryCardHeader
            title="CATEGORY BREAKDOWN"
            subtitle="Performance by question category"
            variant="tactical"
          />

          <MilitaryCardContent>
            {Object.entries(categoryStats).map(([category, stats]) => {
              const categoryScore = Math.round((stats.correct / stats.total) * 100);
              const categoryColor = getPerformanceColor(categoryScore);

              return (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>
                      {CATEGORY_DISPLAY_NAMES[category as keyof typeof CATEGORY_DISPLAY_NAMES] || category}
                    </Text>
                    <Text style={[styles.categoryScore, { color: categoryColor }]}>
                      {stats.correct}/{stats.total} ({categoryScore}%)
                    </Text>
                  </View>
                  <View style={styles.categoryProgress}>
                    <View style={[styles.categoryProgressBar, { backgroundColor: `${branchColor}20` }]}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          {
                            width: `${categoryScore}%`,
                            backgroundColor: categoryColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </MilitaryCardContent>
        </MilitaryCard>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <MilitaryCard variant="intel" branch={user?.selectedBranch} style={styles.recommendationsCard}>
          <MilitaryCardHeader
            title="TRAINING RECOMMENDATIONS"
            subtitle="Areas for improvement"
            variant="intel"
          />

          <MilitaryCardContent>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.colors.TACTICAL_ORANGE}
                  style={styles.recommendationIcon}
                />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </MilitaryCardContent>
        </MilitaryCard>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <MilitaryButton
          title="Review Questions"
          onPress={handleViewQuestions}
          variant="secondary"
          style={styles.actionButton}
          icon="book"
        />

        <MilitaryButton
          title="Retake Quiz"
          onPress={handleRetakeQuiz}
          variant="secondary"
          style={styles.actionButton}
          icon="refresh"
        />

        <MilitaryButton
          title="Back to Home"
          onPress={handleBackToHome}
          variant="primary"
          branch={user?.selectedBranch}
          style={styles.actionButton}
          icon="home"
        />
      </View>

      {/* ASVAB Replica Badge */}
      {quiz.isASVABReplica && (
        <View style={styles.asvabBadge}>
          <Ionicons name="star" size={20} color={theme.colors.TACTICAL_ORANGE} />
          <Text style={styles.asvabBadgeText}>OFFICIAL ASVAB REPLICA COMPLETED</Text>
          <Ionicons name="star" size={20} color={theme.colors.TACTICAL_ORANGE} />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  contentContainer: {
    padding: theme.spacing[4],
  },
  resultsCard: {
    marginBottom: theme.spacing[4],
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  scoreBackground: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[6],
    width: '100%',
    alignItems: 'center',
  },
  scoreContent: {
    alignItems: 'center',
  },
  scoreIcon: {
    marginBottom: theme.spacing[2],
  },
  scoreText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: 48,
    letterSpacing: 2,
    marginBottom: theme.spacing[1],
  },
  performanceLevel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    letterSpacing: 1,
  },
  messageSection: {
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}20`,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing[6],
    borderWidth: 1,
    borderColor: theme.colors.TACTICAL_ORANGE,
  },
  performanceMessage: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  statLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    letterSpacing: 0.5,
  },
  breakdownCard: {
    marginBottom: theme.spacing[4],
  },
  categoryItem: {
    marginBottom: theme.spacing[4],
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  categoryName: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    flex: 1,
  },
  categoryScore: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
  },
  categoryProgress: {
    marginTop: theme.spacing[1],
  },
  categoryProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  recommendationsCard: {
    marginBottom: theme.spacing[4],
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  recommendationIcon: {
    marginRight: theme.spacing[3],
  },
  recommendationText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  actionButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.KHAKI,
  },
  asvabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[4],
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}20`,
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    borderColor: theme.colors.TACTICAL_ORANGE,
    borderStyle: 'dashed',
  },
  asvabBadgeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.TACTICAL_ORANGE,
    marginHorizontal: theme.spacing[3],
    textAlign: 'center',
    letterSpacing: 1,
  },
});