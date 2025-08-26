import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { flashcardService } from '../../services/flashcardService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';
import { FlashcardPremiumGate } from './FlashcardPremiumGates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onExit?: () => void;
}

export const FlashcardAnalyticsScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  // Fetch analytics data
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['flashcardStatistics', selectedTimeframe],
    queryFn: () => flashcardService.getStudyStatistics(selectedTimeframe),
  });

  // Fetch spaced repetition insights (Premium)
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['spacedRepetitionInsights'],
    queryFn: flashcardService.getSpacedRepetitionInsights,
    enabled: false, // Will be enabled when premium gate passes
  });

  // Fetch personalized recommendations (Premium)
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['flashcardRecommendations'],
    queryFn: flashcardService.getPersonalizedRecommendations,
    enabled: false, // Will be enabled when premium gate passes
  });

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

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPerformanceLevel = (accuracy: number): { level: string; color: string; icon: string } => {
    if (accuracy >= 90) return { level: 'Excellent', color: colors.success, icon: 'trophy' };
    if (accuracy >= 80) return { level: 'Good', color: colors.primary, icon: 'checkmark-circle' };
    if (accuracy >= 70) return { level: 'Fair', color: colors.warning, icon: 'warning' };
    return { level: 'Needs Improvement', color: colors.error, icon: 'close-circle' };
  };

  const renderTimeframeButton = (timeframe: '7d' | '30d' | '90d', label: string) => (
    <TouchableOpacity
      style={[
        styles.timeframeButton,
        selectedTimeframe === timeframe && { backgroundColor: colors.primary },
        { borderColor: colors.border }
      ]}
      onPress={() => setSelectedTimeframe(timeframe)}
    >
      <Text style={[
        styles.timeframeText,
        { color: selectedTimeframe === timeframe ? colors.background : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAnalyticsCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: string,
    color: string,
    change?: { value: number; isPositive: boolean }
  ) => (
    <View style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <Ionicons name={icon as any} size={24} color={color} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Text style={[styles.cardValue, { color }]}>{value}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        {change && (
          <View style={styles.changeIndicator}>
            <Ionicons 
              name={change.isPositive ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={change.isPositive ? colors.success : colors.error} 
            />
            <Text style={[
              styles.changeText, 
              { color: change.isPositive ? colors.success : colors.error }
            ]}>
              {Math.abs(change.value)}%
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  if (statsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading analytics..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title="Flashcard Analytics" onBack={onExit} />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mission Brief */}
        <View style={[styles.briefCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.primary + '20', colors.accent + '20']}
            style={styles.briefGradient}
          >
            <Text style={[styles.briefTitle, { color: colors.text }]}>
              Mission Analytics Report
            </Text>
            <Text style={[styles.briefSubtitle, { color: colors.textSecondary }]}>
              Intelligence briefing for {getBranchTitle(user?.selectedBranch)} training progress
            </Text>
          </LinearGradient>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Reporting Period
          </Text>
          <View style={styles.timeframeSelector}>
            {renderTimeframeButton('7d', '7 Days')}
            {renderTimeframeButton('30d', '30 Days')}
            {renderTimeframeButton('90d', '90 Days')}
          </View>
        </View>

        {/* Core Metrics */}
        <View style={styles.metricsGrid}>
          {renderAnalyticsCard(
            'Study Sessions',
            statistics?.totalReviews || 0,
            'Cards reviewed',
            'school',
            colors.primary
          )}
          {renderAnalyticsCard(
            'Study Time',
            formatTime(statistics?.studyTime || 0),
            'Total time invested',
            'time',
            colors.info
          )}
          {renderAnalyticsCard(
            'Retention Rate',
            `${Math.round(statistics?.retention || 0)}%`,
            'Success rate',
            'trophy',
            colors.success
          )}
          {renderAnalyticsCard(
            'Average Rating',
            (statistics?.averageRating || 0).toFixed(1),
            'Out of 5.0 scale',
            'star',
            colors.warning
          )}
        </View>

        {/* Daily Performance Chart */}
        {statistics?.dailyStats && statistics.dailyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="bar-chart" size={20} color={colors.primary} /> Daily Performance
            </Text>
            <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.chartGrid}>
                {statistics.dailyStats.map((day, index) => {
                  const maxReviews = Math.max(...statistics.dailyStats.map(d => d.reviews));
                  const maxTime = Math.max(...statistics.dailyStats.map(d => d.timeSpent));
                  const reviewHeight = maxReviews > 0 ? (day.reviews / maxReviews) * 60 : 0;
                  const timeHeight = maxTime > 0 ? (day.timeSpent / maxTime) * 60 : 0;
                  
                  return (
                    <View key={index} style={styles.chartColumn}>
                      <View style={styles.barGroup}>
                        <LinearGradient
                          colors={[colors.primary, colors.primary + '80']}
                          style={[styles.bar, { height: reviewHeight }]}
                        />
                        <LinearGradient
                          colors={[colors.accent, colors.accent + '80']}
                          style={[styles.bar, { height: timeHeight, marginLeft: 2 }]}
                        />
                      </View>
                      <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Reviews</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Time</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Performance Analysis */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="analytics" size={20} color={colors.primary} /> Performance Analysis
          </Text>
          {statistics?.dailyStats && statistics.dailyStats.length > 0 && (
            <View style={[styles.performanceCard, { backgroundColor: colors.surface }]}>
              <View style={styles.performanceGrid}>
                {statistics.dailyStats.map((day, index) => {
                  const performance = getPerformanceLevel(day.accuracy);
                  return (
                    <View key={index} style={styles.performanceDay}>
                      <Text style={[styles.performanceDayLabel, { color: colors.textSecondary }]}>
                        {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Ionicons name={performance.icon as any} size={20} color={performance.color} />
                      <Text style={[styles.performanceValue, { color: performance.color }]}>
                        {Math.round(day.accuracy)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Premium Analytics Features */}
        <FlashcardPremiumGate feature="spaced-repetition-insights">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="brain" size={20} color={colors.premium} /> Spaced Repetition Insights
            </Text>
            <View style={[styles.insightsCard, { backgroundColor: colors.surface }]}>
              <LinearGradient
                colors={[colors.premium + '20', colors.accent + '20']}
                style={styles.insightsGradient}
              >
                <View style={styles.insightRow}>
                  <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>
                    Average Ease Factor
                  </Text>
                  <Text style={[styles.insightValue, { color: colors.premium }]}>
                    {insights?.averageEaseFactor?.toFixed(2) || '2.50'}
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>
                    Average Interval
                  </Text>
                  <Text style={[styles.insightValue, { color: colors.premium }]}>
                    {insights?.averageInterval || 7} days
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>
                    Next Optimal Session
                  </Text>
                  <Text style={[styles.insightValue, { color: colors.premium }]}>
                    {insights?.nextOptimalSession 
                      ? new Date(insights.nextOptimalSession).toLocaleDateString()
                      : 'Tomorrow'
                    }
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </FlashcardPremiumGate>

        <FlashcardPremiumGate feature="ai-generation">
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="bulb" size={20} color={colors.premium} /> AI Recommendations
            </Text>
            <View style={[styles.recommendationsCard, { backgroundColor: colors.surface }]}>
              <LinearGradient
                colors={[colors.premium + '20', colors.success + '20']}
                style={styles.recommendationsGradient}
              >
                <View style={styles.recommendationItem}>
                  <Ionicons name="warning" size={16} color={colors.warning} />
                  <Text style={[styles.recommendationText, { color: colors.text }]}>
                    Focus on {recommendations?.weakAreas?.[0] || 'Mathematics Knowledge'} - showing lower retention
                  </Text>
                </View>
                <View style={styles.recommendationItem}>
                  <Ionicons name="time" size={16} color={colors.info} />
                  <Text style={[styles.recommendationText, { color: colors.text }]}>
                    Optimal study time: {recommendations?.suggestedStudyTime || 25} minutes per session
                  </Text>
                </View>
                <View style={styles.recommendationItem}>
                  <Ionicons name="library" size={16} color={colors.success} />
                  <Text style={[styles.recommendationText, { color: colors.text }]}>
                    {recommendations?.recommendedDecks?.length || 3} recommended decks available
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </FlashcardPremiumGate>

        {/* Mission Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.primary + '10', colors.accent + '10']}
            style={styles.summaryGradient}
          >
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Mission Assessment
            </Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              Your flashcard training demonstrates {statistics?.retention && statistics.retention > 80 ? 'excellent' : 'good'} progress. 
              Continue your disciplined approach to build expertise across all ASVAB categories.
            </Text>
            <View style={styles.summaryMetrics}>
              <Text style={[styles.summaryMetric, { color: colors.primary }]}>
                ✓ {statistics?.totalReviews || 0} reviews completed
              </Text>
              <Text style={[styles.summaryMetric, { color: colors.primary }]}>
                ✓ {formatTime(statistics?.studyTime || 0)} of focused study
              </Text>
              <Text style={[styles.summaryMetric, { color: colors.primary }]}>
                ✓ {Math.round(statistics?.retention || 0)}% retention rate achieved
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  briefCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  briefGradient: {
    padding: 20,
  },
  briefTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  briefSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeframeContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  timeframeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 5,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  analyticsCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 20,
  },
  chartGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 15,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 8,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: 2,
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
  },
  performanceCard: {
    borderRadius: 12,
    padding: 15,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceDay: {
    alignItems: 'center',
  },
  performanceDayLabel: {
    fontSize: 10,
    marginBottom: 5,
  },
  performanceValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  insightsCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  insightsGradient: {
    padding: 20,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  recommendationsCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  recommendationsGradient: {
    padding: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  summaryCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 15,
  },
  summaryMetrics: {
    alignItems: 'center',
  },
  summaryMetric: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
});