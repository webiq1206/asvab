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
import { CategoryPerformance, analyticsService } from '../../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  data: CategoryPerformance[];
  timeframe: string;
}

export const CategoryAnalytics: React.FC<Props> = ({ data, timeframe }) => {
  const { colors } = useBranchTheme();

  const getLevelColor = (level: CategoryPerformance['level']) => {
    switch (level) {
      case 'EXCELLENT': return colors.success;
      case 'GOOD': return colors.primary;
      case 'FAIR': return colors.warning;
      case 'NEEDS_WORK': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getLevelIcon = (level: CategoryPerformance['level']) => {
    switch (level) {
      case 'EXCELLENT': return 'trophy';
      case 'GOOD': return 'checkmark-circle';
      case 'FAIR': return 'warning';
      case 'NEEDS_WORK': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const renderCategoryCard = (category: CategoryPerformance) => (
    <View key={category.category} style={[styles.categoryCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[getLevelColor(category.level) + '20', getLevelColor(category.level) + '10']}
        style={styles.categoryGradient}
      >
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <View style={styles.categoryTitleRow}>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                {category.displayName}
              </Text>
              {category.isAFQT && (
                <View style={[styles.afqtBadge, { backgroundColor: colors.warning }]}>
                  <Text style={[styles.afqtBadgeText, { color: colors.background }]}>
                    AFQT
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.levelContainer}>
              <Ionicons 
                name={getLevelIcon(category.level) as any} 
                size={16} 
                color={getLevelColor(category.level)} 
              />
              <Text style={[styles.levelText, { color: getLevelColor(category.level) }]}>
                {category.level.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: getLevelColor(category.level) }]}>
              {category.score}
            </Text>
            <View style={styles.trendIndicator}>
              <Ionicons 
                name={category.trend >= 0 ? 'trending-up' : 'trending-down'} 
                size={14} 
                color={category.trend >= 0 ? colors.success : colors.error} 
              />
              <Text style={[
                styles.trendText, 
                { color: category.trend >= 0 ? colors.success : colors.error }
              ]}>
                {analyticsService.formatTrend(category.trend).text}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Bars */}
        <View style={styles.performanceBars}>
          <View style={styles.performanceRow}>
            <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
              Accuracy
            </Text>
            <View style={[styles.performanceBar, { backgroundColor: colors.border }]}>
              <LinearGradient
                colors={[getLevelColor(category.level), getLevelColor(category.level) + '80']}
                style={[styles.performanceFill, { width: `${category.accuracy}%` }]}
              />
            </View>
            <Text style={[styles.performanceValue, { color: colors.text }]}>
              {Math.round(category.accuracy)}%
            </Text>
          </View>

          <View style={styles.performanceRow}>
            <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
              Speed
            </Text>
            <View style={[styles.performanceBar, { backgroundColor: colors.border }]}>
              <LinearGradient
                colors={[colors.info, colors.info + '80']}
                style={[
                  styles.performanceFill, 
                  { width: `${Math.min((60 / category.averageTime) * 100, 100)}%` }
                ]}
              />
            </View>
            <Text style={[styles.performanceValue, { color: colors.text }]}>
              {category.averageTime.toFixed(1)}s
            </Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {category.questionsAnswered}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Questions
            </Text>
          </View>

          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {Math.round((category.questionsAnswered * category.averageTime) / 60)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Minutes
            </Text>
          </View>
        </View>

        {/* Weak/Strong Topics */}
        {(category.weakTopics.length > 0 || category.strongTopics.length > 0) && (
          <View style={styles.topicsContainer}>
            {category.strongTopics.length > 0 && (
              <View style={styles.topicsSection}>
                <View style={styles.topicsHeader}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.topicsTitle, { color: colors.success }]}>
                    Strong Areas
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {category.strongTopics.map((topic, index) => (
                    <View key={index} style={[styles.topicTag, { backgroundColor: colors.success + '20' }]}>
                      <Text style={[styles.topicText, { color: colors.success }]}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {category.weakTopics.length > 0 && (
              <View style={styles.topicsSection}>
                <View style={styles.topicsHeader}>
                  <Ionicons name="warning" size={14} color={colors.warning} />
                  <Text style={[styles.topicsTitle, { color: colors.warning }]}>
                    Focus Areas
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {category.weakTopics.map((topic, index) => (
                    <View key={index} style={[styles.topicTag, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.topicText, { color: colors.warning }]}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const afqtCategories = data.filter(cat => cat.isAFQT);
  const otherCategories = data.filter(cat => !cat.isAFQT);

  return (
    <View style={styles.container}>
      {/* AFQT Categories Section */}
      {afqtCategories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              AFQT Categories (Core Score)
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            These categories directly impact your Armed Forces Qualification Test score
          </Text>
          
          {afqtCategories.map(renderCategoryCard)}
        </View>
      )}

      {/* Other Categories Section */}
      {otherCategories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="library" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Line Score Categories
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            These categories determine eligibility for specific military jobs
          </Text>
          
          {otherCategories.map(renderCategoryCard)}
        </View>
      )}

      {/* Performance Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary + '15', colors.accent + '15']}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryHeader}>
            <Ionicons name="analytics" size={20} color={colors.primary} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Category Performance Summary
            </Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: colors.success }]}>
                {data.filter(cat => cat.level === 'EXCELLENT').length}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
                Excellent
              </Text>
            </View>

            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: colors.primary }]}>
                {data.filter(cat => cat.level === 'GOOD').length}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
                Good
              </Text>
            </View>

            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: colors.warning }]}>
                {data.filter(cat => cat.level === 'FAIR').length}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
                Fair
              </Text>
            </View>

            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: colors.error }]}>
                {data.filter(cat => cat.level === 'NEEDS_WORK').length}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
                Needs Work
              </Text>
            </View>
          </View>

          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            Focus training on categories marked as "Fair" or "Needs Work" to maximize AFQT improvement.
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
    paddingLeft: 28,
  },
  categoryCard: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: 15,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  afqtBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  afqtBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
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
  performanceBars: {
    marginBottom: 15,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 60,
  },
  performanceBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  performanceFill: {
    height: '100%',
    borderRadius: 3,
  },
  performanceValue: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginBottom: 15,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  topicsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  topicsSection: {
    marginBottom: 10,
  },
  topicsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  topicTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  topicText: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});