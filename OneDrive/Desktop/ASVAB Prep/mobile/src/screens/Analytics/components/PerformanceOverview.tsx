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
import { PerformanceMetrics, analyticsService } from '../../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  data: PerformanceMetrics;
  timeframe: string;
}

export const PerformanceOverview: React.FC<Props> = ({ data, timeframe }) => {
  const { colors } = useBranchTheme();

  const renderMetricCard = (
    title: string,
    value: string | number,
    trend: number,
    icon: string,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <Ionicons name={icon as any} size={20} color={color} />
          <View style={styles.trendIndicator}>
            <Ionicons 
              name={trend >= 0 ? 'trending-up' : 'trending-down'} 
              size={14} 
              color={trend >= 0 ? colors.success : colors.error} 
            />
            <Text style={[
              styles.trendText, 
              { color: trend >= 0 ? colors.success : colors.error }
            ]}>
              {analyticsService.formatTrend(trend).text}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardValue, { color }]}>{value}</Text>
        {subtitle && (
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </LinearGradient>
    </View>
  );

  const renderStreakCard = () => (
    <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.primary + '20', colors.accent + '20']}
        style={styles.streakGradient}
      >
        <View style={styles.streakHeader}>
          <Ionicons name="flame" size={24} color={colors.warning} />
          <Text style={[styles.streakTitle, { color: colors.text }]}>
            Study Streak
          </Text>
        </View>
        
        <View style={styles.streakContent}>
          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <Text style={[styles.streakNumber, { color: colors.primary }]}>
                {data.studyStreak.current}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                Current
              </Text>
            </View>
            
            <View style={styles.streakDivider} />
            
            <View style={styles.streakStat}>
              <Text style={[styles.streakNumber, { color: colors.accent }]}>
                {data.studyStreak.longest}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                Best
              </Text>
            </View>
          </View>
          
          <View style={styles.milestoneContainer}>
            <Text style={[styles.milestoneText, { color: colors.textSecondary }]}>
              Next milestone: {data.studyStreak.nextMilestone} days
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={[
                  styles.progressFill,
                  { 
                    width: `${(data.studyStreak.current / data.studyStreak.nextMilestone) * 100}%` 
                  }
                ]}
              />
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const afqtCategory = analyticsService.getAFQTCategory(data.afqtScore);

  return (
    <View style={styles.container}>
      {/* AFQT Score Spotlight */}
      <View style={[styles.afqtCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '30', colors.accent + '30']}
          style={styles.afqtGradient}
        >
          <View style={styles.afqtHeader}>
            <Ionicons name="trophy" size={32} color={colors.warning} />
            <View style={styles.afqtInfo}>
              <Text style={[styles.afqtTitle, { color: colors.text }]}>
                Current AFQT Score
              </Text>
              <Text style={[styles.afqtCategory, { color: colors.textSecondary }]}>
                {afqtCategory.category} • {afqtCategory.description}
              </Text>
            </View>
          </View>
          
          <View style={styles.afqtScoreContainer}>
            <Text style={[styles.afqtScore, { color: colors.primary }]}>
              {data.afqtScore}
            </Text>
            <View style={styles.afqtTrend}>
              <Ionicons 
                name={data.afqtTrend >= 0 ? 'trending-up' : 'trending-down'} 
                size={20} 
                color={data.afqtTrend >= 0 ? colors.success : colors.error} 
              />
              <Text style={[
                styles.afqtTrendText, 
                { color: data.afqtTrend >= 0 ? colors.success : colors.error }
              ]}>
                {analyticsService.formatTrend(data.afqtTrend).text}
              </Text>
            </View>
          </View>

          <View style={styles.eligibilityContainer}>
            <Text style={[styles.eligibilityTitle, { color: colors.text }]}>
              Eligible Opportunities:
            </Text>
            {afqtCategory.eligibility.slice(0, 2).map((item, index) => (
              <Text key={index} style={[styles.eligibilityItem, { color: colors.success }]}>
                ✓ {item}
              </Text>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Performance Metrics Grid */}
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Overall Accuracy',
          `${Math.round(data.overallAccuracy)}%`,
          data.accuracyTrend,
          'checkmark-circle',
          colors.success
        )}

        {renderMetricCard(
          'Questions Answered',
          data.totalQuestions.toLocaleString(),
          data.questionsTrend,
          'help-circle',
          colors.info,
          `Last ${timeframe}`
        )}

        {renderMetricCard(
          'Study Time',
          analyticsService.formatTime(data.studyTime),
          data.studyTimeTrend,
          'time',
          colors.primary,
          'Total invested'
        )}

        {renderMetricCard(
          'Avg Session',
          analyticsService.formatTime(data.averageSessionLength),
          0, // No trend for this metric
          'timer',
          colors.accent,
          'Per study session'
        )}
      </View>

      {/* Study Streak */}
      {renderStreakCard()}

      {/* Performance Insights */}
      <View style={[styles.insightsCard, { backgroundColor: colors.surface }]}>
        <View style={styles.insightsHeader}>
          <Ionicons name="analytics" size={20} color={colors.primary} />
          <Text style={[styles.insightsTitle, { color: colors.text }]}>
            Performance Insights
          </Text>
        </View>
        
        <View style={styles.insightsList}>
          <View style={styles.insightItem}>
            <Ionicons 
              name={data.afqtTrend >= 0 ? 'trending-up' : 'trending-down'} 
              size={16} 
              color={data.afqtTrend >= 0 ? colors.success : colors.warning} 
            />
            <Text style={[styles.insightText, { color: colors.text }]}>
              AFQT score {data.afqtTrend >= 0 ? 'improved' : 'declined'} by {Math.abs(data.afqtTrend).toFixed(1)} points
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Ionicons 
              name={data.accuracyTrend >= 0 ? 'checkmark-circle' : 'warning'} 
              size={16} 
              color={data.accuracyTrend >= 0 ? colors.success : colors.warning} 
            />
            <Text style={[styles.insightText, { color: colors.text }]}>
              Accuracy rate {data.accuracyTrend >= 0 ? 'increased' : 'decreased'} by {Math.abs(data.accuracyTrend).toFixed(1)}%
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Ionicons 
              name={data.studyStreak.isActive ? 'flame' : 'warning'} 
              size={16} 
              color={data.studyStreak.isActive ? colors.warning : colors.error} 
            />
            <Text style={[styles.insightText, { color: colors.text }]}>
              Study streak is {data.studyStreak.isActive ? 'active' : 'broken'} at {data.studyStreak.current} days
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  afqtCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  afqtGradient: {
    padding: 20,
  },
  afqtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  afqtInfo: {
    flex: 1,
    marginLeft: 15,
  },
  afqtTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  afqtCategory: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  afqtScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  afqtScore: {
    fontSize: 48,
    fontWeight: '800',
    marginRight: 15,
  },
  afqtTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  afqtTrendText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
  },
  eligibilityContainer: {
    marginTop: 10,
  },
  eligibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  eligibilityItem: {
    fontSize: 13,
    marginBottom: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10,
  },
  streakCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  streakGradient: {
    padding: 20,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  streakContent: {
    alignItems: 'center',
  },
  streakStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  streakStat: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
    marginHorizontal: 20,
  },
  milestoneContainer: {
    width: '100%',
    alignItems: 'center',
  },
  milestoneText: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  insightsCard: {
    borderRadius: 12,
    padding: 15,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});