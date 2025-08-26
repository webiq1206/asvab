import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { navigationHelpers, NavigationProps } from '@/navigation/navigationHelpers';

import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { CircularProgressMeter } from '@/components/Dashboard/CircularProgressMeter';
import { TacticalGrid } from '@/components/Dashboard/TacticalGrid';
import { DailyOrdersCard } from '@/components/Dashboard/DailyOrdersCard';
import { QuickActionsGrid } from '@/components/Dashboard/QuickActionsGrid';
import { StudyStreakCard } from '@/components/Dashboard/StudyStreakCard';
import { RecentActivityCard } from '@/components/Dashboard/RecentActivityCard';
import { useUserStore } from '@/store/userStore';
import { dashboardService, DashboardData } from '@/services/dashboardService';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProps>();
  const { user } = useUserStore();

  const {
    data: dashboardData,
    isLoading,
    isRefreshing,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboardData,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const branchColor = theme.branchColors[user?.selectedBranch || 'ARMY'];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'practice':
        // Keep existing quiz functionality
        navigation.navigate('MainTabs'); // Navigate to Quiz tab
        break;
      case 'categories':
        // Could navigate to categories or study features
        navigation.navigate('MainTabs');
        break;
      case 'progress':
        navigationHelpers.navigateToAdvancedAnalytics(navigation);
        break;
      case 'flashcards':
        navigationHelpers.navigateToFlashcardStudy(navigation);
        break;
      case 'jobs':
        // For now, navigate to a general job (could be improved with job search)
        navigationHelpers.navigateToJobDetail(navigation, 'example-job-id');
        break;
      case 'asvab':
        // Keep existing ASVAB functionality
        navigation.navigate('MainTabs');
        break;
      // Add new actions
      case 'ai-coaching':
        navigationHelpers.navigateToAICoaching(navigation);
        break;
      case 'gamification':
        navigationHelpers.navigateToGamificationDashboard(navigation);
        break;
      case 'fitness':
        navigationHelpers.navigateToPTTest(navigation);
        break;
      case 'meps':
        navigationHelpers.navigateToMEPSPreparation(navigation);
        break;
      default:
        break;
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="rocket" size={48} color={branchColor} />
        <Text style={styles.loadingText}>Preparing Your Mission Briefing...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refetch}
          tintColor={branchColor}
          colors={[branchColor]}
        />
      }
    >
      {/* Military Greeting */}
      <MilitaryCard variant="command" branch={user?.selectedBranch} style={styles.greetingCard}>
        <MilitaryCardContent>
          <View style={styles.greetingContainer}>
            <View style={styles.greetingIconContainer}>
              <Ionicons name="flag" size={24} color={branchColor} />
            </View>
            <Text style={styles.greetingText}>
              {dashboardData?.greeting || 'Welcome to your ASVAB training, Recruit!'}
            </Text>
          </View>
        </MilitaryCardContent>
      </MilitaryCard>

      {/* Main Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          {/* Circular Progress Meter */}
          <View style={styles.progressMeterContainer}>
            <CircularProgressMeter
              percentage={dashboardData?.readinessPercentage || 0}
              afqtScore={dashboardData?.afqtScore || 0}
              branch={user?.selectedBranch || 'ARMY'}
            />
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStatsContainer}>
            <MilitaryCard variant="tactical" branch={user?.selectedBranch} style={styles.quickStatsCard}>
              <MilitaryCardHeader
                title="QUICK STATS"
                subtitle="Your current status"
                variant="tactical"
              />
              <MilitaryCardContent>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{dashboardData?.quickStats.totalQuestions || 0}</Text>
                    <Text style={styles.statLabel}>Questions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{dashboardData?.quickStats.avgScore || 0}%</Text>
                    <Text style={styles.statLabel}>Avg Score</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{dashboardData?.quickStats.quizzesCompleted || 0}</Text>
                    <Text style={styles.statLabel}>Quizzes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{dashboardData?.quickStats.hoursStudied || 0}h</Text>
                    <Text style={styles.statLabel}>Study Time</Text>
                  </View>
                </View>
                <Text style={styles.rankText}>
                  Rank: {dashboardData?.quickStats.rank || 'Recruit'}
                </Text>
              </MilitaryCardContent>
            </MilitaryCard>
          </View>
        </View>
      </View>

      {/* Tactical Grid - Category Performance */}
      <TacticalGrid
        categoryPerformance={dashboardData?.categoryPerformance || []}
        branch={user?.selectedBranch || 'ARMY'}
        onCategoryPress={(category) => navigation.navigate('CategoryDetail', { category })}
      />

      {/* Daily Orders */}
      <DailyOrdersCard
        orders={dashboardData?.dailyOrders || []}
        branch={user?.selectedBranch || 'ARMY'}
        onOrderComplete={(orderId) => {
          // Handle order completion
          dashboardService.completeDailyOrder(orderId);
          refetch();
        }}
        onOrderPress={(order) => {
          if (order.category) {
            navigation.navigate('QuizSetup', { category: order.category });
          } else {
            navigation.navigate('QuizSetup');
          }
        }}
      />

      {/* Study Streak */}
      <StudyStreakCard
        streakData={dashboardData?.studyStreak}
        branch={user?.selectedBranch || 'ARMY'}
        onStreakPress={() => navigation.navigate('Progress')}
      />

      {/* Quick Actions */}
      <QuickActionsGrid
        branch={user?.selectedBranch || 'ARMY'}
        onActionPress={handleQuickAction}
      />

      {/* Recent Activity */}
      <RecentActivityCard
        activities={dashboardData?.recentActivity || []}
        branch={user?.selectedBranch || 'ARMY'}
        onViewAll={() => navigation.navigate('Progress')}
      />

      {/* Footer Padding */}
      <View style={styles.footer} />
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
    marginTop: theme.spacing[4],
    textAlign: 'center',
  },
  greetingCard: {
    marginBottom: theme.spacing[4],
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingIconContainer: {
    marginRight: theme.spacing[3],
  },
  greetingText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 22,
  },
  progressSection: {
    marginBottom: theme.spacing[4],
  },
  progressRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  progressMeterContainer: {
    flex: 0.45,
  },
  quickStatsContainer: {
    flex: 0.55,
  },
  quickStatsCard: {
    margin: 0,
    height: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: theme.spacing[2],
  },
  statValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  statLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  rankText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.TACTICAL_ORANGE,
    textAlign: 'center',
  },
  footer: {
    height: theme.spacing[8],
  },
});