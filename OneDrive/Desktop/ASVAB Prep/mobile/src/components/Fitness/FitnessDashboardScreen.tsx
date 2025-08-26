import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { FitnessType, MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { fitnessService } from '../../services/fitnessService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';

interface Props {
  onNavigate?: (screen: string, params?: any) => void;
  onExit?: () => void;
}

export const FitnessDashboardScreen: React.FC<Props> = ({ onNavigate, onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch fitness analytics
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['fitnessAnalytics'],
    queryFn: fitnessService.getFitnessAnalytics,
  });

  // Fetch active goals
  const { data: goals = [] } = useQuery({
    queryKey: ['fitnessGoals'],
    queryFn: () => fitnessService.getFitnessGoals(true),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getBranchTitle = (branch?: MilitaryBranch): string => {
    const titles = {
      ARMY: 'Soldier',
      NAVY: 'Sailor',
      AIR_FORCE: 'Airman',
      MARINES: 'Marine',
      COAST_GUARD: 'Coastie',
      SPACE_FORCE: 'Guardian',
    };
    return titles[branch || 'ARMY'];
  };

  const renderQuickActions = () => (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
          onPress={() => onNavigate?.('LogWorkout')}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Log Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accent + '20' }]}
          onPress={() => onNavigate?.('PTTest')}
        >
          <Ionicons name="trophy" size={24} color={colors.accent} />
          <Text style={[styles.actionText, { color: colors.accent }]}>PT Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
          onPress={() => onNavigate?.('Progress')}
        >
          <Ionicons name="trending-up" size={24} color={colors.success} />
          <Text style={[styles.actionText, { color: colors.success }]}>Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
          onPress={() => onNavigate?.('Goals')}
        >
          <Ionicons name="flag" size={24} color={colors.info} />
          <Text style={[styles.actionText, { color: colors.info }]}>Goals</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFitnessOverview = () => {
    if (!analytics?.overallProgress) return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Fitness Overview</Text>
        
        <View style={styles.overviewGrid}>
          {analytics.overallProgress.map((progress) => (
            <View key={progress.type} style={[styles.progressCard, { backgroundColor: colors.background }]}>
              <View style={styles.progressHeader}>
                <Ionicons
                  name={fitnessService.getFitnessTypeIcon(progress.type)}
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.progressType, { color: colors.text }]}>
                  {fitnessService.getFitnessTypeDisplayName(progress.type)}
                </Text>
              </View>
              
              <Text style={[styles.progressValue, { color: colors.primary }]}>
                {fitnessService.getFormattedValue(progress.type, progress.current)}
              </Text>
              
              <View style={styles.progressMeta}>
                <View style={styles.trendIndicator}>
                  <Ionicons
                    name={fitnessService.getTrendIcon(progress.trend)}
                    size={14}
                    color={fitnessService.getTrendColor(progress.trend)}
                  />
                  <Text style={[styles.improvementText, { color: fitnessService.getTrendColor(progress.trend) }]}>
                    {progress.improvement > 0 ? '+' : ''}{progress.improvement.toFixed(1)}%
                  </Text>
                </View>
                <Text style={[styles.entriesCount, { color: colors.textSecondary }]}>
                  {progress.totalEntries} entries
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPTReadiness = () => {
    if (!analytics?.nextPTTest) return null;

    const { daysRemaining, readinessScore, recommendedTraining } = analytics.nextPTTest;
    const readinessColor = readinessScore >= 80 ? colors.success : 
                          readinessScore >= 60 ? colors.warning : colors.error;

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>PT Test Readiness</Text>
        
        <View style={[styles.readinessCard, { backgroundColor: colors.background }]}>
          <View style={styles.readinessHeader}>
            <View style={styles.readinessScore}>
              <Text style={[styles.scoreValue, { color: readinessColor }]}>
                {Math.round(readinessScore)}%
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Ready</Text>
            </View>
            
            <View style={styles.daysRemaining}>
              <Text style={[styles.daysValue, { color: colors.primary }]}>{daysRemaining}</Text>
              <Text style={[styles.daysLabel, { color: colors.textSecondary }]}>days left</Text>
            </View>
          </View>

          {recommendedTraining.length > 0 && (
            <View style={styles.recommendations}>
              <Text style={[styles.recommendationsTitle, { color: colors.text }]}>
                Training Focus:
              </Text>
              {recommendedTraining.slice(0, 2).map((rec, index) => (
                <Text key={index} style={[styles.recommendationText, { color: colors.textSecondary }]}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.fullButton, { backgroundColor: colors.primary }]}
          onPress={() => onNavigate?.('PTTest')}
        >
          <Text style={[styles.fullButtonText, { color: colors.surface }]}>
            Take Practice PT Test
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAchievements = () => {
    if (!analytics?.achievements) return null;

    const { personalRecords, consistencyStreak, goalsCompleted } = analytics.achievements;

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
        
        <View style={styles.achievementsGrid}>
          <View style={[styles.achievementItem, { backgroundColor: colors.background }]}>
            <Ionicons name="trophy" size={24} color={colors.accent} />
            <Text style={[styles.achievementValue, { color: colors.text }]}>{personalRecords}</Text>
            <Text style={[styles.achievementLabel, { color: colors.textSecondary }]}>
              Personal Records
            </Text>
          </View>

          <View style={[styles.achievementItem, { backgroundColor: colors.background }]}>
            <Ionicons name="flame" size={24} color={colors.warning} />
            <Text style={[styles.achievementValue, { color: colors.text }]}>{consistencyStreak}</Text>
            <Text style={[styles.achievementLabel, { color: colors.textSecondary }]}>
              Day Streak
            </Text>
          </View>

          <View style={[styles.achievementItem, { backgroundColor: colors.background }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={[styles.achievementValue, { color: colors.text }]}>{goalsCompleted}</Text>
            <Text style={[styles.achievementLabel, { color: colors.textSecondary }]}>
              Goals Completed
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActiveGoals = () => {
    if (goals.length === 0) return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Goals</Text>
          <TouchableOpacity onPress={() => onNavigate?.('Goals')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {goals.slice(0, 3).map((goal) => {
          const progress = (goal.currentValue / goal.targetValue) * 100;
          const daysLeft = Math.ceil(
            (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <View key={goal.id} style={[styles.goalItem, { backgroundColor: colors.background }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalType, { color: colors.text }]}>
                  {fitnessService.getFitnessTypeDisplayName(goal.type)}
                </Text>
                <Text style={[styles.goalDeadline, { color: colors.textSecondary }]}>
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                </Text>
              </View>
              
              <Text style={[styles.goalProgress, { color: colors.primary }]}>
                {fitnessService.getFormattedValue(goal.type, goal.currentValue)} / {' '}
                {fitnessService.getFormattedValue(goal.type, goal.targetValue)}
              </Text>
              
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(progress, 100)}%`, backgroundColor: colors.success },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading fitness data..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader 
        title="Physical Fitness"
        onBack={onExit}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={[styles.welcomeBanner, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.primary + '20', colors.accent + '20']}
            style={styles.bannerGradient}
          >
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Stay Mission Ready, {getBranchTitle(user?.selectedBranch)}!
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Maintain peak physical condition for military service
            </Text>
          </LinearGradient>
        </View>

        {renderQuickActions()}
        {renderFitnessOverview()}
        {renderPTReadiness()}
        {renderAchievements()}
        {renderActiveGoals()}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  welcomeBanner: {
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerGradient: {
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginTop: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  progressCard: {
    flex: 1,
    minWidth: '47%',
    padding: 15,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressType: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  improvementText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  entriesCount: {
    fontSize: 10,
  },
  readinessCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  readinessScore: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
  },
  daysRemaining: {
    alignItems: 'center',
  },
  daysValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  daysLabel: {
    fontSize: 12,
  },
  recommendations: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  fullButton: {
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  fullButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  achievementsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  achievementItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
  },
  achievementValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  achievementLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  goalItem: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalType: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalDeadline: {
    fontSize: 12,
  },
  goalProgress: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomSpacer: {
    height: 20,
  },
});