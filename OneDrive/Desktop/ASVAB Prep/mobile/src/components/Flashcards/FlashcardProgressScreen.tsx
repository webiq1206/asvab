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
import { FlashcardProgress, MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { flashcardService } from '../../services/flashcardService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MilitaryHeader } from '../common/MilitaryHeader';
import { CircularProgress } from '../common/CircularProgress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onExit?: () => void;
}

export const FlashcardProgressScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  // Fetch progress data
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['flashcardProgress'],
    queryFn: flashcardService.getFlashcardProgress,
  });

  // Fetch study statistics
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['flashcardStatistics', selectedTimeframe],
    queryFn: () => flashcardService.getStudyStatistics(selectedTimeframe),
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

  const getMasteryPercentage = () => {
    if (!progress || progress.totalCards === 0) return 0;
    return Math.round((progress.masteredCards / progress.totalCards) * 100);
  };

  const formatStudyTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatRetentionRate = (rate: number): string => {
    return `${Math.round(rate)}%`;
  };

  const getStreakMessage = (streak: number): string => {
    if (streak === 0) return 'Start your streak today!';
    if (streak === 1) return 'Great start! Keep it going!';
    if (streak < 7) return 'Building momentum!';
    if (streak < 30) return 'Excellent consistency!';
    return 'Outstanding dedication!';
  };

  const renderProgressCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: string,
    color: string,
    gradient?: string[]
  ) => (
    <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={gradient || [color + '20', color + '10']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <Ionicons name={icon as any} size={24} color={color} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Text style={[styles.cardValue, { color }]}>{value}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </LinearGradient>
    </View>
  );

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

  if (progressLoading || statsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading progress data..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title="Flashcard Progress" onBack={onExit} />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Message */}
        <View style={[styles.welcomeCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.primary + '20', colors.accent + '20']}
            style={styles.welcomeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Outstanding work, {getBranchTitle(user?.selectedBranch)}! 
            </Text>
            <Text style={[styles.welcomeSubtext, { color: colors.textSecondary }]}>
              {getMilitaryGreeting().motto}
            </Text>
          </LinearGradient>
        </View>

        {/* Main Progress Circle */}
        <View style={[styles.progressCircleContainer, { backgroundColor: colors.surface }]}>
          <CircularProgress
            size={120}
            progress={getMasteryPercentage()}
            strokeWidth={12}
            color={colors.success}
            backgroundColor={colors.border}
          />
          <View style={styles.progressCircleContent}>
            <Text style={[styles.progressPercentage, { color: colors.success }]}>
              {getMasteryPercentage()}%
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Mastered
            </Text>
          </View>
        </View>

        {/* Card Statistics */}
        <View style={styles.statsGrid}>
          {renderProgressCard(
            'Total Cards',
            progress?.totalCards || 0,
            'In your collection',
            'library',
            colors.primary
          )}
          {renderProgressCard(
            'Due Cards',
            progress?.dueCards || 0,
            'Ready for review',
            'time',
            colors.warning
          )}
          {renderProgressCard(
            'New Cards',
            progress?.newCards || 0,
            'Never studied',
            'add-circle',
            colors.info
          )}
          {renderProgressCard(
            'Learning',
            progress?.learningCards || 0,
            'In progress',
            'school',
            colors.accent
          )}
        </View>

        {/* Study Statistics Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            <Ionicons name="analytics" size={20} color={colors.primary} /> Study Analytics
          </Text>
          <View style={styles.timeframeSelector}>
            {renderTimeframeButton('7d', '7 Days')}
            {renderTimeframeButton('30d', '30 Days')}
            {renderTimeframeButton('90d', '90 Days')}
          </View>
        </View>

        <View style={styles.statsGrid}>
          {renderProgressCard(
            'Study Time',
            formatStudyTime(statistics?.studyTime || 0),
            `Total for ${selectedTimeframe}`,
            'time',
            colors.info
          )}
          {renderProgressCard(
            'Reviews',
            statistics?.totalReviews || 0,
            `Cards reviewed`,
            'refresh',
            colors.success
          )}
          {renderProgressCard(
            'Retention',
            formatRetentionRate(statistics?.retention || 0),
            'Success rate',
            'trophy',
            colors.warning
          )}
          {renderProgressCard(
            'Avg Rating',
            (statistics?.averageRating || 0).toFixed(1),
            'Out of 5.0',
            'star',
            colors.accent
          )}
        </View>

        {/* Study Streak */}
        <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.success + '20', colors.primary + '20']}
            style={styles.streakGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.streakContent}>
              <View style={styles.streakIcon}>
                <Ionicons name="flame" size={32} color={colors.success} />
                <Text style={[styles.streakNumber, { color: colors.success }]}>
                  {progress?.streakDays || 0}
                </Text>
              </View>
              <View style={styles.streakText}>
                <Text style={[styles.streakTitle, { color: colors.text }]}>
                  Study Streak
                </Text>
                <Text style={[styles.streakSubtitle, { color: colors.textSecondary }]}>
                  {getStreakMessage(progress?.streakDays || 0)}
                </Text>
              </View>
            </View>
          </LinearGradient>
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
                  const height = maxReviews > 0 ? (day.reviews / maxReviews) * 100 : 0;
                  
                  return (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.barContainer}>
                        <LinearGradient
                          colors={[colors.primary, colors.accent]}
                          style={[styles.bar, { height: `${height}%` }]}
                          start={{ x: 0, y: 1 }}
                          end={{ x: 0, y: 0 }}
                        />
                      </View>
                      <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                      </Text>
                      <Text style={[styles.barValue, { color: colors.text }]}>
                        {day.reviews}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Mission Summary */}
        <View style={[styles.missionCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.primary + '10', colors.accent + '10']}
            style={styles.missionGradient}
          >
            <Text style={[styles.missionTitle, { color: colors.text }]}>
              Mission Status Report
            </Text>
            <Text style={[styles.missionText, { color: colors.textSecondary }]}>
              You've been studying flashcards consistently and building your knowledge base. 
              Your dedication to continuous improvement exemplifies the military values of 
              discipline and excellence. Keep up the outstanding work!
            </Text>
            <View style={styles.missionStats}>
              <Text style={[styles.missionStat, { color: colors.primary }]}>
                ✓ {progress?.masteredCards || 0} cards mastered
              </Text>
              <Text style={[styles.missionStat, { color: colors.primary }]}>
                ✓ {formatStudyTime(progress?.totalStudyTime || 0)} total study time
              </Text>
              <Text style={[styles.missionStat, { color: colors.primary }]}>
                ✓ {formatRetentionRate(progress?.retentionRate || 0)} retention rate
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
  welcomeCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressCircleContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    borderRadius: 15,
    marginBottom: 25,
    position: 'relative',
  },
  progressCircleContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  timeframeSelector: {
    flexDirection: 'row',
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    marginLeft: 5,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  progressCard: {
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
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  streakCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  streakGradient: {
    padding: 20,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    alignItems: 'center',
    marginRight: 20,
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: -5,
  },
  streakText: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  streakSubtitle: {
    fontSize: 14,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 20,
  },
  chartGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  barContainer: {
    height: 80,
    width: 20,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 8,
    fontWeight: '500',
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  missionCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  missionGradient: {
    padding: 20,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  missionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 15,
  },
  missionStats: {
    alignItems: 'center',
  },
  missionStat: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
});