import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBranchTheme } from '../../../hooks/useBranchTheme';
import { StudyPattern, analyticsService } from '../../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  data: StudyPattern;
  timeframe: string;
}

export const StudyPatternsChart: React.FC<Props> = ({ data, timeframe }) => {
  const { colors } = useBranchTheme();

  const renderStudyTimeChart = () => {
    const maxAccuracy = Math.max(...data.bestStudyTimes.map(t => t.accuracy));
    const maxSessions = Math.max(...data.bestStudyTimes.map(t => t.sessionCount));

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="time" size={20} color={colors.primary} />
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Optimal Study Times
          </Text>
        </View>
        
        <Text style={[styles.chartDescription, { color: colors.textSecondary }]}>
          Performance by hour of day - higher bars indicate better accuracy
        </Text>

        <View style={styles.timeChart}>
          <View style={styles.chartGrid}>
            {data.bestStudyTimes.map((timeSlot, index) => {
              const accuracyHeight = (timeSlot.accuracy / maxAccuracy) * 100;
              const sessionHeight = (timeSlot.sessionCount / maxSessions) * 60;
              const hour12 = timeSlot.hour === 0 ? 12 : 
                           timeSlot.hour > 12 ? timeSlot.hour - 12 : 
                           timeSlot.hour;
              const ampm = timeSlot.hour < 12 ? 'AM' : 'PM';

              return (
                <View key={index} style={styles.timeSlot}>
                  <View style={styles.timeBarContainer}>
                    <LinearGradient
                      colors={[colors.primary, colors.primary + '60']}
                      style={[styles.timeBar, { height: `${accuracyHeight}%` }]}
                    />
                    <LinearGradient
                      colors={[colors.accent, colors.accent + '60']}
                      style={[styles.timeBar, { height: `${sessionHeight}%`, marginLeft: 2 }]}
                    />
                  </View>
                  
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                    {hour12}{ampm}
                  </Text>
                  
                  <Text style={[styles.accuracyLabel, { color: colors.primary }]}>
                    {Math.round(timeSlot.accuracy)}%
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Accuracy Rate
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Session Count
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStudyDurationCard = () => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.info + '20', colors.info + '10']}
        style={styles.metricGradient}
      >
        <View style={styles.metricHeader}>
          <Ionicons name="timer" size={24} color={colors.info} />
          <Text style={[styles.metricTitle, { color: colors.text }]}>
            Session Duration
          </Text>
        </View>

        <View style={styles.durationComparison}>
          <View style={styles.durationItem}>
            <Text style={[styles.durationValue, { color: colors.info }]}>
              {data.studyDuration.optimal}m
            </Text>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
              Optimal
            </Text>
          </View>

          <View style={styles.durationVs}>
            <Text style={[styles.vsText, { color: colors.textSecondary }]}>vs</Text>
          </View>

          <View style={styles.durationItem}>
            <Text style={[styles.durationValue, { color: colors.primary }]}>
              {data.studyDuration.actual}m
            </Text>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
              Your Average
            </Text>
          </View>
        </View>

        <View style={styles.recommendationBox}>
          <Ionicons name="bulb" size={16} color={colors.warning} />
          <Text style={[styles.recommendationText, { color: colors.text }]}>
            {data.studyDuration.recommendation}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFrequencyCard = () => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.accent + '20', colors.accent + '10']}
        style={styles.metricGradient}
      >
        <View style={styles.metricHeader}>
          <Ionicons name="calendar" size={24} color={colors.accent} />
          <Text style={[styles.metricTitle, { color: colors.text }]}>
            Study Frequency
          </Text>
        </View>

        <View style={styles.frequencyStats}>
          <View style={styles.frequencyStat}>
            <Text style={[styles.frequencyValue, { color: colors.accent }]}>
              {data.sessionFrequency.daily.toFixed(1)}
            </Text>
            <Text style={[styles.frequencyLabel, { color: colors.textSecondary }]}>
              Sessions/Day
            </Text>
          </View>

          <View style={styles.frequencyStat}>
            <Text style={[styles.frequencyValue, { color: colors.primary }]}>
              {data.sessionFrequency.weekly.toFixed(1)}
            </Text>
            <Text style={[styles.frequencyLabel, { color: colors.textSecondary }]}>
              Sessions/Week
            </Text>
          </View>
        </View>

        <View style={styles.recommendationBox}>
          <Ionicons name="bulb" size={16} color={colors.warning} />
          <Text style={[styles.recommendationText, { color: colors.text }]}>
            {data.sessionFrequency.recommendation}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderDifficultyCard = () => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.success + '20', colors.success + '10']}
        style={styles.metricGradient}
      >
        <View style={styles.metricHeader}>
          <Ionicons name="trending-up" size={24} color={colors.success} />
          <Text style={[styles.metricTitle, { color: colors.text }]}>
            Difficulty Preference
          </Text>
        </View>

        <View style={styles.difficultyContainer}>
          <View style={styles.difficultyLevel}>
            <Text style={[styles.difficultyText, { color: colors.success }]}>
              {data.difficulty.preferredLevel}
            </Text>
            <Text style={[styles.difficultySubtext, { color: colors.textSecondary }]}>
              Preferred Level
            </Text>
          </View>

          <View style={styles.successRate}>
            <View style={styles.successCircle}>
              <Text style={[styles.successPercentage, { color: colors.success }]}>
                {Math.round(data.difficulty.successRate)}%
              </Text>
            </View>
            <Text style={[styles.successLabel, { color: colors.textSecondary }]}>
              Success Rate
            </Text>
          </View>
        </View>

        <View style={styles.recommendationBox}>
          <Ionicons name="bulb" size={16} color={colors.warning} />
          <Text style={[styles.recommendationText, { color: colors.text }]}>
            {data.difficulty.recommendation}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Study Time Patterns */}
      {renderStudyTimeChart()}

      {/* Performance Metrics */}
      <View style={styles.metricsGrid}>
        {renderStudyDurationCard()}
        {renderFrequencyCard()}
      </View>

      {/* Difficulty Analysis */}
      {renderDifficultyCard()}

      {/* Insights Summary */}
      <View style={[styles.insightsCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '15', colors.accent + '15']}
          style={styles.insightsGradient}
        >
          <View style={styles.insightsHeader}>
            <Ionicons name="analytics" size={20} color={colors.primary} />
            <Text style={[styles.insightsTitle, { color: colors.text }]}>
              Study Pattern Insights
            </Text>
          </View>

          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="time" size={16} color={colors.info} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                Peak performance at {data.bestStudyTimes.reduce((best, current) => 
                  current.accuracy > best.accuracy ? current : best
                ).hour}:00 - {Math.round(data.bestStudyTimes.reduce((best, current) => 
                  current.accuracy > best.accuracy ? current : best
                ).accuracy)}% accuracy
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Ionicons name="timer" size={16} color={colors.info} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                {data.studyDuration.actual > data.studyDuration.optimal ? 'Longer' : 'Shorter'} sessions than optimal 
                ({Math.abs(data.studyDuration.actual - data.studyDuration.optimal)} min difference)
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={16} color={colors.success} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                {data.difficulty.successRate >= 75 ? 'Consistently strong' : 'Variable'} performance on {data.difficulty.preferredLevel.toLowerCase()} questions
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Ionicons name="calendar" size={16} color={colors.accent} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                Study {data.sessionFrequency.daily >= 1 ? 'daily' : 'intermittently'} with {data.sessionFrequency.weekly.toFixed(1)} sessions per week
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  chartDescription: {
    fontSize: 13,
    marginBottom: 20,
  },
  timeChart: {
    alignItems: 'center',
  },
  chartGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    width: '100%',
    marginBottom: 15,
  },
  timeSlot: {
    alignItems: 'center',
    flex: 1,
  },
  timeBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 8,
  },
  timeBar: {
    width: 6,
    borderRadius: 3,
    minHeight: 4,
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  accuracyLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    borderRadius: 15,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 15,
  },
  metricHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  durationComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  durationItem: {
    alignItems: 'center',
  },
  durationValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  durationLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  durationVs: {
    marginHorizontal: 15,
  },
  vsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  frequencyStats: {
    alignItems: 'center',
    marginBottom: 15,
  },
  frequencyStat: {
    alignItems: 'center',
    marginBottom: 10,
  },
  frequencyValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  frequencyLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  difficultyLevel: {
    alignItems: 'center',
    flex: 1,
  },
  difficultyText: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  difficultySubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  successRate: {
    alignItems: 'center',
    flex: 1,
  },
  successCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  successPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  successLabel: {
    fontSize: 10,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
  },
  recommendationText: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
  insightsCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  insightsGradient: {
    padding: 20,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 10,
    flex: 1,
  },
});