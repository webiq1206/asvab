import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBranchTheme } from '../../../hooks/useBranchTheme';
import { useAuth } from '../../../hooks/useAuth';
import { ComparisonData, analyticsService } from '../../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  data: ComparisonData;
}

export const ComparisonView: React.FC<Props> = ({ data }) => {
  const { colors } = useBranchTheme();
  const { user } = useAuth();

  const getBranchName = (branch: string) => {
    const branches = {
      ARMY: 'Army',
      NAVY: 'Navy',
      AIR_FORCE: 'Air Force',
      MARINES: 'Marines',
      COAST_GUARD: 'Coast Guard',
      SPACE_FORCE: 'Space Force',
    };
    return branches[branch as keyof typeof branches] || branch;
  };

  const renderOverallRanking = () => (
    <View style={[styles.rankingCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.primary + '25', colors.accent + '25']}
        style={styles.rankingGradient}
      >
        <View style={styles.rankingHeader}>
          <Ionicons name="trophy" size={32} color={colors.warning} />
          <View style={styles.rankingInfo}>
            <Text style={[styles.rankingTitle, { color: colors.text }]}>
              Overall Ranking
            </Text>
            <Text style={[styles.rankingSubtitle, { color: colors.textSecondary }]}>
              Among all ASVAB Prep users
            </Text>
          </View>
        </View>

        <View style={styles.rankingContent}>
          <View style={styles.rankContainer}>
            <Text style={[styles.rankNumber, { color: colors.primary }]}>
              #{data.userRank}
            </Text>
            <Text style={[styles.rankTotal, { color: colors.textSecondary }]}>
              of {data.totalUsers.toLocaleString()}
            </Text>
          </View>

          <View style={styles.percentileContainer}>
            <View style={styles.percentileCircle}>
              <Text style={[styles.percentileText, { color: colors.success }]}>
                {data.percentile}th
              </Text>
            </View>
            <Text style={[styles.percentileLabel, { color: colors.textSecondary }]}>
              Percentile
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Performance Distribution
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={[
                styles.progressFill,
                { width: `${data.percentile}%` }
              ]}
            />
            <View style={[
              styles.userMarker,
              { 
                left: `${data.percentile}%`,
                backgroundColor: colors.warning
              }
            ]} />
          </View>
          <Text style={[styles.progressDescription, { color: colors.textSecondary }]}>
            You're performing better than {data.percentile}% of all users
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderBranchRanking = () => (
    <View style={[styles.branchCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.accent + '20', colors.primary + '20']}
        style={styles.branchGradient}
      >
        <View style={styles.branchHeader}>
          <Ionicons name="people" size={24} color={colors.accent} />
          <Text style={[styles.branchTitle, { color: colors.text }]}>
            {getBranchName(user?.selectedBranch || 'ARMY')} Ranking
          </Text>
        </View>

        <View style={styles.branchStats}>
          <View style={styles.branchStat}>
            <Text style={[styles.branchStatValue, { color: colors.accent }]}>
              #{data.branchRank}
            </Text>
            <Text style={[styles.branchStatLabel, { color: colors.textSecondary }]}>
              Branch Rank
            </Text>
          </View>

          <View style={styles.branchDivider} />

          <View style={styles.branchStat}>
            <Text style={[styles.branchStatValue, { color: colors.primary }]}>
              {data.branchPercentile}th
            </Text>
            <Text style={[styles.branchStatLabel, { color: colors.textSecondary }]}>
              Percentile
            </Text>
          </View>

          <View style={styles.branchDivider} />

          <View style={styles.branchStat}>
            <Text style={[styles.branchStatValue, { color: colors.success }]}>
              {data.branchUsers.toLocaleString()}
            </Text>
            <Text style={[styles.branchStatLabel, { color: colors.textSecondary }]}>
              Total Users
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderComparison = () => (
    <View style={[styles.comparisonCard, { backgroundColor: colors.surface }]}>
      <View style={styles.comparisonHeader}>
        <Ionicons name="stats-chart" size={20} color={colors.info} />
        <Text style={[styles.comparisonTitle, { color: colors.text }]}>
          vs. Similar Users
        </Text>
      </View>

      <Text style={[styles.comparisonDescription, { color: colors.textSecondary }]}>
        Comparison with users who have similar starting scores
      </Text>

      <View style={styles.comparisonMetrics}>
        <View style={styles.comparisonMetric}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              AFQT Score
            </Text>
            <View style={styles.metricComparison}>
              <Text style={[styles.userValue, { color: colors.primary }]}>
                You: {Math.round(data.similarUsers.afqtScore)}
              </Text>
              <Text style={[styles.avgValue, { color: colors.textSecondary }]}>
                Avg: {Math.round(data.similarUsers.afqtScore * 0.95)}
              </Text>
            </View>
          </View>
          <View style={[styles.comparisonBar, { backgroundColor: colors.border }]}>
            <View style={[
              styles.userBar,
              {
                width: `${(data.similarUsers.afqtScore / 100) * 100}%`,
                backgroundColor: colors.primary
              }
            ]} />
            <View style={[
              styles.avgBar,
              {
                width: `${(data.similarUsers.afqtScore * 0.95 / 100) * 100}%`,
                backgroundColor: colors.textSecondary + '60'
              }
            ]} />
          </View>
        </View>

        <View style={styles.comparisonMetric}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Accuracy Rate
            </Text>
            <View style={styles.metricComparison}>
              <Text style={[styles.userValue, { color: colors.success }]}>
                You: {Math.round(data.similarUsers.accuracy)}%
              </Text>
              <Text style={[styles.avgValue, { color: colors.textSecondary }]}>
                Avg: {Math.round(data.similarUsers.accuracy * 0.92)}%
              </Text>
            </View>
          </View>
          <View style={[styles.comparisonBar, { backgroundColor: colors.border }]}>
            <View style={[
              styles.userBar,
              {
                width: `${data.similarUsers.accuracy}%`,
                backgroundColor: colors.success
              }
            ]} />
            <View style={[
              styles.avgBar,
              {
                width: `${data.similarUsers.accuracy * 0.92}%`,
                backgroundColor: colors.textSecondary + '60'
              }
            ]} />
          </View>
        </View>

        <View style={styles.comparisonMetric}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Study Time (hrs)
            </Text>
            <View style={styles.metricComparison}>
              <Text style={[styles.userValue, { color: colors.accent }]}>
                You: {Math.round(data.similarUsers.studyTime)}
              </Text>
              <Text style={[styles.avgValue, { color: colors.textSecondary }]}>
                Avg: {Math.round(data.similarUsers.studyTime * 1.2)}
              </Text>
            </View>
          </View>
          <View style={[styles.comparisonBar, { backgroundColor: colors.border }]}>
            <View style={[
              styles.userBar,
              {
                width: `${(data.similarUsers.studyTime / (data.similarUsers.studyTime * 1.2)) * 100}%`,
                backgroundColor: colors.accent
              }
            ]} />
            <View style={[
              styles.avgBar,
              {
                width: '100%',
                backgroundColor: colors.textSecondary + '60'
              }
            ]} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={[styles.achievementsCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.warning + '20', colors.success + '20']}
        style={styles.achievementsGradient}
      >
        <View style={styles.achievementsHeader}>
          <Ionicons name="medal" size={20} color={colors.warning} />
          <Text style={[styles.achievementsTitle, { color: colors.text }]}>
            Ranking Achievements
          </Text>
        </View>

        <View style={styles.achievementsList}>
          {data.percentile >= 90 && (
            <View style={styles.achievementItem}>
              <Ionicons name="trophy" size={16} color={colors.warning} />
              <Text style={[styles.achievementText, { color: colors.text }]}>
                Top 10% Performer
              </Text>
            </View>
          )}

          {data.percentile >= 75 && (
            <View style={styles.achievementItem}>
              <Ionicons name="star" size={16} color={colors.success} />
              <Text style={[styles.achievementText, { color: colors.text }]}>
                Above Average Excellence
              </Text>
            </View>
          )}

          {data.branchPercentile >= 80 && (
            <View style={styles.achievementItem}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={[styles.achievementText, { color: colors.text }]}>
                Branch Leader
              </Text>
            </View>
          )}

          {data.userRank <= 1000 && (
            <View style={styles.achievementItem}>
              <Ionicons name="flame" size={16} color={colors.accent} />
              <Text style={[styles.achievementText, { color: colors.text }]}>
                Elite 1000 Club
              </Text>
            </View>
          )}

          {/* Show encouragement if no achievements */}
          {data.percentile < 75 && (
            <View style={styles.encouragementItem}>
              <Ionicons name="trending-up" size={16} color={colors.info} />
              <Text style={[styles.encouragementText, { color: colors.info }]}>
                Keep studying to unlock achievements!
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.achievementsTip, { color: colors.textSecondary }]}>
          Continue your training regimen to advance through the rankings and earn new achievements.
        </Text>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Overall Ranking */}
      {renderOverallRanking()}

      {/* Branch-specific Ranking */}
      {renderBranchRanking()}

      {/* Comparison with Similar Users */}
      {renderComparison()}

      {/* Achievements */}
      {renderAchievements()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rankingCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  rankingGradient: {
    padding: 20,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 15,
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  rankingSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  rankingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rankContainer: {
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  rankTotal: {
    fontSize: 14,
    textAlign: 'center',
  },
  percentileContainer: {
    alignItems: 'center',
    flex: 1,
  },
  percentileCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentileText: {
    fontSize: 18,
    fontWeight: '800',
  },
  percentileLabel: {
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
    marginBottom: 8,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  userMarker: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
  },
  progressDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  branchCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  branchGradient: {
    padding: 20,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  branchTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  branchStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branchStat: {
    alignItems: 'center',
    flex: 1,
  },
  branchStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  branchStatLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  branchDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 15,
  },
  comparisonCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  comparisonDescription: {
    fontSize: 13,
    marginBottom: 20,
  },
  comparisonMetrics: {
    gap: 15,
  },
  comparisonMetric: {
    marginBottom: 10,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricComparison: {
    alignItems: 'flex-end',
  },
  userValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  avgValue: {
    fontSize: 11,
  },
  comparisonBar: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  userBar: {
    height: '100%',
    borderRadius: 3,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
  },
  avgBar: {
    height: '100%',
    borderRadius: 3,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  achievementsCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  achievementsGradient: {
    padding: 20,
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  achievementsList: {
    marginBottom: 15,
    gap: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  encouragementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  encouragementText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  achievementsTip: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});