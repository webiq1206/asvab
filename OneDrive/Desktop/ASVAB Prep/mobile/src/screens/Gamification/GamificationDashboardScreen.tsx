import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService, GameStats } from '../../services/gamificationService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MilitaryHeader } from '../../components/common/MilitaryHeader';
import { SubscriptionGate } from '../../components/Premium/SubscriptionGate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onExit?: () => void;
  onNavigateToAchievements?: () => void;
  onNavigateToLeaderboard?: () => void;
  onNavigateToMissions?: () => void;
}

export const GamificationDashboardScreen: React.FC<Props> = ({ 
  onExit,
  onNavigateToAchievements,
  onNavigateToLeaderboard,
  onNavigateToMissions
}) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [refreshing, setRefreshing] = useState(false);

  const getBranchTitle = (branch?: MilitaryBranch): string => {
    const titles = {
      ARMY: 'Soldier',
      NAVY: 'Sailor',
      AIR_FORCE: 'Airman',
      MARINES: 'Marine',
      COAST_GUARD: 'Guardian',
      SPACE_FORCE: 'Guardian',
    };
    return titles[branch || 'ARMY'];
  };

  const getBranchExclamation = (branch?: MilitaryBranch): string => {
    const exclamations = {
      ARMY: 'Hooah!',
      NAVY: 'Hooyah!',
      AIR_FORCE: 'Hoorah!',
      MARINES: 'Oorah!',
      COAST_GUARD: 'Hooyah!',
      SPACE_FORCE: 'Hoorah!',
    };
    return exclamations[branch || 'ARMY'];
  };

  // Fetch gamification data
  const { data: gameStats, isLoading, refetch } = useQuery({
    queryKey: ['gameStats'],
    queryFn: gamificationService.getGameStats,
  });

  const { data: dailyChallenges } = useQuery({
    queryKey: ['dailyChallenges'],
    queryFn: gamificationService.getDailyChallenges,
  });

  const { data: weeklyMissions } = useQuery({
    queryKey: ['weeklyMissions'],
    queryFn: gamificationService.getWeeklyMissions,
  });

  const { data: recentAchievements } = useQuery({
    queryKey: ['recentAchievements'],
    queryFn: () => gamificationService.getUnlockedAchievements().then(achievements => 
      achievements.slice(0, 3).sort((a, b) => 
        new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
      )
    ),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderRankCard = () => {
    if (!gameStats) return null;

    return (
      <View style={[styles.rankCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[gameStats.currentRank.color + '30', gameStats.currentRank.color + '15']}
          style={styles.rankGradient}
        >
          <View style={styles.rankHeader}>
            <View style={[styles.rankIcon, { backgroundColor: gameStats.currentRank.color + '20' }]}>
              <Ionicons name={gameStats.currentRank.icon as any} size={32} color={gameStats.currentRank.color} />
            </View>
            <View style={styles.rankInfo}>
              <Text style={[styles.rankName, { color: colors.text }]}>
                {gameStats.currentRank.name}
              </Text>
              <Text style={[styles.rankTitle, { color: gameStats.currentRank.color }]}>
                {gameStats.currentRank.title}
              </Text>
              <Text style={[styles.xpText, { color: colors.textSecondary }]}>
                {gamificationService.formatXP(gameStats.totalXP)} XP
              </Text>
            </View>
          </View>

          {gameStats.nextRank && (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Progress to {gameStats.nextRank.name}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <LinearGradient
                  colors={[gameStats.nextRank.color, gameStats.nextRank.color + '80']}
                  style={[styles.progressFill, { width: `${gameStats.progressToNextRank}%` }]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {Math.round(gameStats.progressToNextRank)}% • {gamificationService.formatXP(gameStats.nextRank.minXP - gameStats.totalXP)} XP to go
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderStatsGrid = () => {
    if (!gameStats) return null;

    return (
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.primary + '20', colors.primary + '10']}
            style={styles.statGradient}
          >
            <Ionicons name="trophy" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {gameStats.unlockedAchievements}/{gameStats.totalAchievements}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Achievements
            </Text>
          </LinearGradient>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.accent + '20', colors.accent + '10']}
            style={styles.statGradient}
          >
            <Ionicons name="flame" size={24} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {gameStats.studyStreak.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Day Streak
            </Text>
          </LinearGradient>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.success + '20', colors.success + '10']}
            style={styles.statGradient}
          >
            <Ionicons name="star" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>
              #{gameStats.globalRanking}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Global Rank
            </Text>
          </LinearGradient>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.warning + '20', colors.warning + '10']}
            style={styles.statGradient}
          >
            <Ionicons name="people" size={24} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.warning }]}>
              #{gameStats.branchRanking}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Branch Rank
            </Text>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderDailyChallenges = () => {
    if (!dailyChallenges || dailyChallenges.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="trophy" size={18} color={colors.primary} /> Daily Challenges
          </Text>
          <Text style={[styles.timeRemaining, { color: colors.textSecondary }]}>
            Resets in {gamificationService.calculateTimeUntilReset('DAILY')}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dailyChallenges.map((challenge, index) => (
            <View key={challenge.id} style={[styles.challengeCard, { backgroundColor: colors.surface }]}>
              <LinearGradient
                colors={challenge.isCompleted 
                  ? [colors.success + '25', colors.success + '15']
                  : [colors.primary + '15', colors.accent + '15']
                }
                style={styles.challengeGradient}
              >
                <View style={styles.challengeHeader}>
                  <View style={styles.difficultyBadge}>
                    <Text style={[
                      styles.difficultyText,
                      { 
                        color: challenge.difficulty === 'HARD' ? colors.error :
                               challenge.difficulty === 'MEDIUM' ? colors.warning :
                               colors.success
                      }
                    ]}>
                      {challenge.difficulty}
                    </Text>
                  </View>
                  {challenge.isCompleted && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  )}
                </View>

                <Text style={[styles.challengeTitle, { color: colors.text }]}>
                  {challenge.title}
                </Text>
                <Text style={[styles.challengeDescription, { color: colors.textSecondary }]}>
                  {challenge.description}
                </Text>

                <View style={styles.challengeProgress}>
                  <View style={[styles.challengeProgressBar, { backgroundColor: colors.border }]}>
                    <LinearGradient
                      colors={challenge.isCompleted ? [colors.success, colors.success] : [colors.primary, colors.accent]}
                      style={[styles.challengeProgressFill, { width: `${challenge.progress}%` }]}
                    />
                  </View>
                  <Text style={[styles.challengeProgressText, { color: colors.textSecondary }]}>
                    {challenge.requirements.current}/{challenge.requirements.target}
                  </Text>
                </View>

                <View style={styles.challengeReward}>
                  <Ionicons name="star" size={16} color={colors.warning} />
                  <Text style={[styles.rewardText, { color: colors.warning }]}>
                    {challenge.xpReward} XP
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRecentAchievements = () => {
    if (!recentAchievements || recentAchievements.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="medal" size={18} color={colors.success} /> Recent Achievements
          </Text>
          <TouchableOpacity onPress={onNavigateToAchievements}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {recentAchievements.map((achievement) => (
          <View key={achievement.id} style={[styles.achievementItem, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[gamificationService.getDifficultyColor(achievement.difficulty) + '20',
                       gamificationService.getDifficultyColor(achievement.difficulty) + '10']}
              style={styles.achievementGradient}
            >
              <View style={styles.achievementContent}>
                <View style={[
                  styles.achievementIcon,
                  { backgroundColor: gamificationService.getDifficultyColor(achievement.difficulty) + '20' }
                ]}>
                  <Ionicons 
                    name={achievement.icon as any} 
                    size={24} 
                    color={gamificationService.getDifficultyColor(achievement.difficulty)} 
                  />
                </View>

                <View style={styles.achievementInfo}>
                  <Text style={[styles.achievementTitle, { color: colors.text }]}>
                    {achievement.title}
                  </Text>
                  <Text style={[styles.achievementDescription, { color: colors.textSecondary }]}>
                    {achievement.description}
                  </Text>
                  <Text style={[styles.achievementDate, { color: colors.textSecondary }]}>
                    Unlocked {new Date(achievement.unlockedAt!).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.achievementReward}>
                  <Text style={[styles.xpReward, { color: colors.primary }]}>
                    +{achievement.xpReward}
                  </Text>
                  <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
                    XP
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={onNavigateToAchievements}
      >
        <Ionicons name="trophy" size={20} color={colors.background} />
        <Text style={[styles.actionText, { color: colors.background }]}>
          Achievements
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.accent }]}
        onPress={onNavigateToLeaderboard}
      >
        <Ionicons name="podium" size={20} color={colors.background} />
        <Text style={[styles.actionText, { color: colors.background }]}>
          Leaderboard
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.success }]}
        onPress={onNavigateToMissions}
      >
        <Ionicons name="flag" size={20} color={colors.background} />
        <Text style={[styles.actionText, { color: colors.background }]}>
          Missions
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading battle station..." />
      </SafeAreaView>
    );
  }

  return (
    <SubscriptionGate
      feature="gamification"
      title="Military Achievement System"
      description={`Access the complete gamification command center with achievements, rankings, challenges, and rewards. Transform your ASVAB preparation into an engaging military training simulation. ${getBranchExclamation(user?.selectedBranch)}`}
      benefits={[
        'Complete achievement system with military-themed rewards',
        'Global and branch-specific leaderboards and rankings',
        'Daily challenges and weekly missions with XP rewards',
        'Study streak tracking with milestone celebrations',
        'Military rank progression system',
        'Social features and friend challenges',
        'Exclusive badges, titles, and military honors',
        'Competitive study tournaments and events'
      ]}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MilitaryHeader title="Achievement Center" onBack={onExit} />
        
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Welcome Header */}
          <View style={[styles.welcomeCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[colors.primary + '20', colors.accent + '20']}
              style={styles.welcomeGradient}
            >
              <Text style={[styles.welcomeText, { color: colors.text }]}>
                {getMilitaryGreeting(user?.selectedBranch)}, {getBranchTitle(user?.selectedBranch)} {user?.firstName}!
              </Text>
              <Text style={[styles.welcomeSubtext, { color: colors.textSecondary }]}>
                Track your achievements, compete with fellow service members, and earn military honors 
                through dedicated ASVAB preparation. {getBranchExclamation(user?.selectedBranch)}
              </Text>
            </LinearGradient>
          </View>

          {/* Rank Card */}
          {renderRankCard()}

          {/* Stats Grid */}
          {renderStatsGrid()}

          {/* Daily Challenges */}
          {renderDailyChallenges()}

          {/* Recent Achievements */}
          {renderRecentAchievements()}

          {/* Weekly Mission Preview */}
          {weeklyMissions && weeklyMissions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  <Ionicons name="flag" size={18} color={colors.accent} /> Weekly Mission
                </Text>
                <Text style={[styles.timeRemaining, { color: colors.textSecondary }]}>
                  Resets in {gamificationService.calculateTimeUntilReset('WEEKLY')}
                </Text>
              </View>

              <View style={[styles.missionCard, { backgroundColor: colors.surface }]}>
                <LinearGradient
                  colors={[colors.accent + '20', colors.primary + '20']}
                  style={styles.missionGradient}
                >
                  <Text style={[styles.missionTitle, { color: colors.text }]}>
                    {weeklyMissions[0].title}
                  </Text>
                  <Text style={[styles.missionDescription, { color: colors.textSecondary }]}>
                    {weeklyMissions[0].description}
                  </Text>
                  
                  <View style={styles.missionProgress}>
                    <View style={[styles.missionProgressBar, { backgroundColor: colors.border }]}>
                      <LinearGradient
                        colors={[colors.accent, colors.primary]}
                        style={[styles.missionProgressFill, { width: `${weeklyMissions[0].progress}%` }]}
                      />
                    </View>
                    <Text style={[styles.missionProgressText, { color: colors.textSecondary }]}>
                      {Math.round(weeklyMissions[0].progress)}% Complete
                    </Text>
                  </View>

                  <View style={styles.missionRewards}>
                    <View style={styles.rewardItem}>
                      <Ionicons name="star" size={16} color={colors.warning} />
                      <Text style={[styles.rewardValue, { color: colors.warning }]}>
                        {weeklyMissions[0].xpReward} XP
                      </Text>
                    </View>
                    
                    {weeklyMissions[0].specialReward && (
                      <View style={styles.rewardItem}>
                        <Ionicons name="medal" size={16} color={colors.success} />
                        <Text style={[styles.rewardValue, { color: colors.success }]}>
                          {weeklyMissions[0].specialReward.name}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Motivational Message */}
          <View style={[styles.motivationCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[colors.success + '20', colors.primary + '20']}
              style={styles.motivationGradient}
            >
              <Ionicons name="star" size={28} color={colors.success} />
              <Text style={[styles.motivationTitle, { color: colors.text }]}>
                Excellence Through Competition
              </Text>
              <Text style={[styles.motivationText, { color: colors.textSecondary }]}>
                Every question answered, every challenge completed, and every achievement unlocked 
                brings you closer to ASVAB mastery. Compete with honor, study with purpose, and 
                achieve military excellence. {getBranchExclamation(user?.selectedBranch)}
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SubscriptionGate>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  rankCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  rankGradient: {
    padding: 20,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rankIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeRemaining: {
    fontSize: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  challengeCard: {
    width: 280,
    borderRadius: 12,
    marginRight: 15,
    overflow: 'hidden',
  },
  challengeGradient: {
    padding: 15,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  challengeProgress: {
    marginBottom: 10,
  },
  challengeProgressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  challengeProgressText: {
    fontSize: 11,
  },
  challengeReward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  achievementItem: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  achievementGradient: {
    padding: 15,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 11,
  },
  achievementReward: {
    alignItems: 'center',
  },
  xpReward: {
    fontSize: 18,
    fontWeight: '700',
  },
  xpLabel: {
    fontSize: 10,
  },
  missionCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  missionGradient: {
    padding: 20,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  missionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 15,
  },
  missionProgress: {
    marginBottom: 15,
  },
  missionProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  missionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  missionProgressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  missionRewards: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardValue: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  actionButton: {
    flex: 0.32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  motivationCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  motivationGradient: {
    padding: 20,
    alignItems: 'center',
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  motivationText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});