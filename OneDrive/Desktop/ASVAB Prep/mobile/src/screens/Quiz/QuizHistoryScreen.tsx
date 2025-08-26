import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { QuestionLimitNotice } from '@/components/Question/QuestionLimitNotice';
import { useUserStore } from '@/store/userStore';
import { quizService, QuizHistoryItem } from '@/services/quizService';
import { CATEGORY_DISPLAY_NAMES, FREE_TIER_LIMITS } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

export const QuizHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUserStore();
  const [showLimitNotice, setShowLimitNotice] = React.useState(false);

  const isPremium = user?.subscriptionTier === 'PREMIUM';
  const branchColor = theme.branchColors[user?.selectedBranch || 'ARMY'];

  const {
    data: historyData,
    isLoading,
    isRefreshing,
    refetch,
  } = useQuery({
    queryKey: ['quizHistory'],
    queryFn: () => quizService.getQuizHistory(1, isPremium ? 50 : FREE_TIER_LIMITS.QUIZ_HISTORY_LIMIT),
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return theme.colors.SUCCESS;
    if (score >= 80) return branchColor;
    if (score >= 70) return theme.colors.TACTICAL_ORANGE;
    if (score >= 60) return theme.colors.WARNING;
    return theme.colors.DANGER;
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return 'star';
    if (score >= 80) return 'trophy';
    if (score >= 70) return 'ribbon';
    if (score >= 60) return 'medal';
    return 'warning';
  };

  const handleQuizPress = (quiz: QuizHistoryItem) => {
    navigation.navigate('QuizReview', { quizId: quiz.id });
  };

  const handleCreateNewQuiz = () => {
    navigation.navigate('QuizSetup');
  };

  const renderQuizItem = ({ item }: { item: QuizHistoryItem }) => {
    const scoreColor = getScoreColor(item.score);
    const scoreIcon = getScoreIcon(item.score);

    return (
      <TouchableOpacity onPress={() => handleQuizPress(item)}>
        <View style={styles.quizItem}>
          <View style={styles.quizHeader}>
            <View style={styles.quizTitleSection}>
              <Text style={styles.quizTitle}>{item.title}</Text>
              <View style={styles.quizMeta}>
                {item.category && (
                  <Text style={styles.categoryText}>
                    {CATEGORY_DISPLAY_NAMES[item.category]}
                  </Text>
                )}
                {item.isASVABReplica && (
                  <View style={styles.asvabBadge}>
                    <Text style={styles.asvabBadgeText}>ASVAB</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.scoreSection}>
              <Ionicons name={scoreIcon} size={20} color={scoreColor} />
              <Text style={[styles.scoreText, { color: scoreColor }]}>
                {item.score}%
              </Text>
            </View>
          </View>

          <View style={styles.quizStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.correctAnswers}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.totalQuestions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(item.timeSpent)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDate(item.completedAt)}</Text>
              <Text style={styles.statLabel}>Date</Text>
            </View>
          </View>

          <View style={[styles.progressBar, { backgroundColor: `${branchColor}20` }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${item.score}%`,
                  backgroundColor: scoreColor,
                },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={64} color={theme.colors.KHAKI} />
      <Text style={styles.emptyTitle}>No Quiz History</Text>
      <Text style={styles.emptyMessage}>
        Complete your first quiz to see your performance history here.
      </Text>
      <MilitaryButton
        title="Start Your First Quiz"
        onPress={handleCreateNewQuiz}
        variant="primary"
        branch={user?.selectedBranch}
        style={styles.emptyButton}
        icon="rocket"
      />
    </View>
  );

  const renderFooter = () => {
    if (!isPremium && historyData?.quizzes && historyData.quizzes.length >= FREE_TIER_LIMITS.QUIZ_HISTORY_LIMIT) {
      return (
        <View style={styles.limitFooter}>
          <Ionicons name="information-circle" size={20} color={theme.colors.TACTICAL_ORANGE} />
          <Text style={styles.limitText}>
            Free tier shows last {FREE_TIER_LIMITS.QUIZ_HISTORY_LIMIT} quizzes. 
            Upgrade to Premium for unlimited history.
          </Text>
        </View>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Quiz History...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MilitaryCard variant="command" branch={user?.selectedBranch} style={styles.headerCard}>
        <MilitaryCardHeader
          title="QUIZ HISTORY"
          subtitle={`Your completed quiz performance ${!isPremium ? `(Last ${FREE_TIER_LIMITS.QUIZ_HISTORY_LIMIT})` : ''}`}
          variant="command"
        />
      </MilitaryCard>

      <FlatList
        data={historyData?.quizzes || []}
        renderItem={renderQuizItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={branchColor}
            colors={[branchColor]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
      />

      <QuestionLimitNotice
        visible={showLimitNotice}
        onClose={() => setShowLimitNotice(false)}
        branch={user?.selectedBranch || 'ARMY'}
        message="Upgrade to Premium for unlimited quiz history and advanced analytics."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  loadingText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: '#FFFFFF',
  },
  headerCard: {
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  listContainer: {
    padding: theme.spacing[4],
    paddingTop: theme.spacing[2],
  },
  quizItem: {
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.KHAKI,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[4],
  },
  quizTitleSection: {
    flex: 1,
    marginRight: theme.spacing[3],
  },
  quizTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  quizMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  categoryText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  asvabBadge: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  asvabBadgeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  scoreText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
  },
  quizStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  statLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
  },
  emptyTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: '#FFFFFF',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptyMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing[6],
  },
  emptyButton: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
  },
  limitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}20`,
    borderRadius: theme.borderRadius.base,
    marginTop: theme.spacing[2],
  },
  limitText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginLeft: theme.spacing[2],
    flex: 1,
    lineHeight: 18,
  },
});