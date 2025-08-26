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
import { analyticsService } from '../../services/analyticsService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MilitaryHeader } from '../../components/common/MilitaryHeader';
import { SubscriptionGate } from '../../components/Premium/SubscriptionGate';
import { PerformanceOverview } from './components/PerformanceOverview';
import { CategoryAnalytics } from './components/CategoryAnalytics';
import { StudyPatternsChart } from './components/StudyPatternsChart';
import { PredictiveInsights } from './components/PredictiveInsights';
import { ComparisonView } from './components/ComparisonView';
import { GoalTracker } from './components/GoalTracker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onExit?: () => void;
}

export const AdvancedAnalyticsScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'patterns' | 'predictions' | 'comparison' | 'goals'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch advanced analytics data
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['advancedAnalytics', selectedTimeframe],
    queryFn: () => analyticsService.getAdvancedAnalytics(selectedTimeframe),
  });

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const timeframes = analyticsService.getTimeframes();

  const renderTimeframeButton = (timeframe: typeof selectedTimeframe, label: string) => (
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

  const renderTabButton = (
    tab: typeof activeTab,
    label: string,
    icon: string,
    premium: boolean = false
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { backgroundColor: colors.primary },
        { borderColor: colors.border }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={activeTab === tab ? colors.background : colors.text} 
      />
      {premium && (
        <Ionicons 
          name="diamond" 
          size={12} 
          color={colors.premium} 
          style={styles.premiumBadge}
        />
      )}
      <Text style={[
        styles.tabText,
        { color: activeTab === tab ? colors.background : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (!analytics) return null;

    switch (activeTab) {
      case 'overview':
        return <PerformanceOverview data={analytics.performance} timeframe={selectedTimeframe} />;
      case 'categories':
        return <CategoryAnalytics data={analytics.categories} timeframe={selectedTimeframe} />;
      case 'patterns':
        return <StudyPatternsChart data={analytics.studyPatterns} timeframe={selectedTimeframe} />;
      case 'predictions':
        return <PredictiveInsights data={analytics.predictions} />;
      case 'comparison':
        return <ComparisonView data={analytics.comparison} />;
      case 'goals':
        return <GoalTracker data={analytics.goals} />;
      default:
        return <PerformanceOverview data={analytics.performance} timeframe={selectedTimeframe} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Analyzing mission data..." />
      </SafeAreaView>
    );
  }

  return (
    <SubscriptionGate
      feature="advanced-analytics"
      title="Advanced Analytics Command Center"
      description={`Intelligence briefing requires clearance level: Premium. Unlock comprehensive mission analytics, predictive insights, and strategic recommendations to optimize your ASVAB preparation. ${getBranchExclamation(user?.selectedBranch)}`}
      benefits={[
        'Real-time performance analytics and trends',
        'Predictive AFQT score projections',
        'Detailed category breakdowns and weak spot analysis',
        'Study pattern optimization recommendations',
        'Peer comparison and ranking intelligence',
        'Goal tracking with milestone achievements',
        'Exportable progress reports and data',
        'AI-powered study recommendations'
      ]}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <MilitaryHeader title="Advanced Analytics" onBack={onExit} />
        
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Mission Brief Header */}
          <View style={[styles.briefCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[colors.primary + '20', colors.accent + '20']}
              style={styles.briefGradient}
            >
              <View style={styles.briefHeader}>
                <Ionicons name="analytics" size={32} color={colors.primary} />
                <View style={styles.briefText}>
                  <Text style={[styles.briefTitle, { color: colors.text }]}>
                    Intelligence Command Center
                  </Text>
                  <Text style={[styles.briefSubtitle, { color: colors.textSecondary }]}>
                    Advanced mission analytics for {getBranchTitle(user?.selectedBranch)} {user?.firstName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.exportButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    // Handle export functionality
                    analyticsService.exportReport('PDF', selectedTimeframe);
                  }}
                >
                  <Ionicons name="download" size={20} color={colors.background} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Timeframe Selector */}
          <View style={styles.timeframeContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="calendar" size={18} color={colors.primary} /> Reporting Period
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.timeframeScroll}
            >
              {timeframes.map((tf) => renderTimeframeButton(tf.value, tf.label))}
            </ScrollView>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabScroll}
            >
              {renderTabButton('overview', 'Overview', 'speedometer')}
              {renderTabButton('categories', 'Categories', 'library')}
              {renderTabButton('patterns', 'Patterns', 'trending-up')}
              {renderTabButton('predictions', 'Insights', 'bulb', true)}
              {renderTabButton('comparison', 'Rankings', 'trophy', true)}
              {renderTabButton('goals', 'Goals', 'flag')}
            </ScrollView>
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
            {renderContent()}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                // Navigate to goal setting
                setActiveTab('goals');
              }}
            >
              <Ionicons name="flag" size={20} color={colors.background} />
              <Text style={[styles.actionText, { color: colors.background }]}>
                Set Goals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                // Navigate to study recommendations
                setActiveTab('predictions');
              }}
            >
              <Ionicons name="bulb" size={20} color={colors.background} />
              <Text style={[styles.actionText, { color: colors.background }]}>
                Get Insights
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => {
                // Export progress report
                analyticsService.exportReport('PDF', selectedTimeframe);
              }}
            >
              <Ionicons name="document-text" size={20} color={colors.background} />
              <Text style={[styles.actionText, { color: colors.background }]}>
                Export Report
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mission Status Summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[colors.primary + '10', colors.accent + '10']}
              style={styles.summaryGradient}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                Mission Status Assessment
              </Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Your analytics demonstrate {analytics?.performance.afqtScore >= 80 ? 'exceptional' : analytics?.performance.afqtScore >= 65 ? 'strong' : 'developing'} readiness, {getBranchTitle(user?.selectedBranch)}. 
                Continue utilizing data-driven insights to optimize your ASVAB preparation strategy. {getBranchExclamation(user?.selectedBranch)}
              </Text>
              
              <View style={styles.summaryMetrics}>
                <View style={styles.summaryMetric}>
                  <Ionicons name="trophy" size={16} color={colors.primary} />
                  <Text style={[styles.summaryMetricText, { color: colors.primary }]}>
                    AFQT: {analytics?.performance.afqtScore || 0}
                  </Text>
                </View>
                <View style={styles.summaryMetric}>
                  <Ionicons name="trending-up" size={16} color={colors.success} />
                  <Text style={[styles.summaryMetricText, { color: colors.success }]}>
                    Accuracy: {Math.round(analytics?.performance.overallAccuracy || 0)}%
                  </Text>
                </View>
                <View style={styles.summaryMetric}>
                  <Ionicons name="time" size={16} color={colors.info} />
                  <Text style={[styles.summaryMetricText, { color: colors.info }]}>
                    Study Time: {analyticsService.formatTime(analytics?.performance.studyTime || 0)}
                  </Text>
                </View>
              </View>
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
  briefCard: {
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  briefGradient: {
    padding: 20,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  briefText: {
    flex: 1,
    marginLeft: 15,
  },
  briefTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  briefSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeframeContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  timeframeScroll: {
    flexGrow: 0,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    marginBottom: 20,
  },
  tabScroll: {
    flexGrow: 0,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  contentArea: {
    minHeight: 300,
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  summaryCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 15,
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMetricText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});