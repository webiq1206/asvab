import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryBranch, QuestionCategory } from '@asvab-prep/shared';
import { CategoryPerformance } from '@/services/dashboardService';
import { Ionicons } from '@expo/vector-icons';

interface TacticalGridProps {
  categoryPerformance: CategoryPerformance[];
  branch: MilitaryBranch;
  onCategoryPress: (category: QuestionCategory) => void;
}

const { width } = Dimensions.get('window');
const gridWidth = width - (theme.spacing[4] * 2);
const itemWidth = (gridWidth - theme.spacing[3]) / 2;

export const TacticalGrid: React.FC<TacticalGridProps> = ({
  categoryPerformance,
  branch,
  onCategoryPress,
}) => {
  const branchColor = theme.branchColors[branch];

  const getCategoryIcon = (category: QuestionCategory): string => {
    const icons = {
      [QuestionCategory.GENERAL_SCIENCE]: 'flask',
      [QuestionCategory.ARITHMETIC_REASONING]: 'calculator',
      [QuestionCategory.WORD_KNOWLEDGE]: 'book',
      [QuestionCategory.PARAGRAPH_COMPREHENSION]: 'document-text',
      [QuestionCategory.MATHEMATICS_KNOWLEDGE]: 'stats-chart',
      [QuestionCategory.ELECTRONICS_INFORMATION]: 'hardware-chip',
      [QuestionCategory.AUTO_SHOP]: 'build',
      [QuestionCategory.MECHANICAL_COMPREHENSION]: 'cog',
      [QuestionCategory.ASSEMBLING_OBJECTS]: 'cube',
    };
    return icons[category] || 'help-circle';
  };

  const getLevelIcon = (level: CategoryPerformance['level']): string => {
    const icons = {
      EXCELLENT: 'star',
      GOOD: 'checkmark-circle',
      NEEDS_WORK: 'warning',
      CRITICAL: 'alert-circle',
    };
    return icons[level];
  };

  const renderCategoryTile = (performance: CategoryPerformance) => {
    const isAFQT = performance.isAFQT;
    
    return (
      <TouchableOpacity
        key={performance.category}
        style={[
          styles.categoryTile,
          { 
            backgroundColor: `${performance.color}20`,
            borderColor: performance.color,
            width: itemWidth,
          },
          isAFQT && styles.afqtTile,
        ]}
        onPress={() => onCategoryPress(performance.category)}
        activeOpacity={0.8}
      >
        {/* AFQT Badge */}
        {isAFQT && (
          <View style={[styles.afqtBadge, { backgroundColor: branchColor }]}>
            <Text style={styles.afqtBadgeText}>AFQT</Text>
          </View>
        )}

        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${performance.color}30` }]}>
          <Ionicons
            name={getCategoryIcon(performance.category)}
            size={24}
            color={performance.color}
          />
        </View>

        {/* Category Name */}
        <Text style={styles.categoryName} numberOfLines={2}>
          {performance.displayName}
        </Text>

        {/* Performance Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: performance.color }]}>
            {performance.score}%
          </Text>
          <View style={styles.levelIndicator}>
            <Ionicons
              name={getLevelIcon(performance.level)}
              size={12}
              color={performance.color}
            />
            <Text style={[styles.levelText, { color: performance.color }]}>
              {performance.level}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: `${performance.color}20` }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${performance.score}%`,
                backgroundColor: performance.color,
              },
            ]}
          />
        </View>

        {/* Question Count */}
        <Text style={styles.questionCount}>
          {performance.questionsAnswered} questions answered
        </Text>

        {/* Performance Level Overlay */}
        <View style={[styles.levelOverlay, { backgroundColor: `${performance.color}10` }]} />
      </TouchableOpacity>
    );
  };

  // Sort categories: AFQT categories first, then by performance level
  const sortedCategories = [...categoryPerformance].sort((a, b) => {
    // AFQT categories first
    if (a.isAFQT && !b.isAFQT) return -1;
    if (!a.isAFQT && b.isAFQT) return 1;
    
    // Then by performance level (worst first to encourage improvement)
    const levelOrder = { CRITICAL: 0, NEEDS_WORK: 1, GOOD: 2, EXCELLENT: 3 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  return (
    <MilitaryCard variant="tactical" branch={branch} style={styles.card}>
      <MilitaryCardHeader
        title="TACTICAL GRID"
        subtitle="Category performance analysis"
        variant="tactical"
        rightContent={
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>
              {categoryPerformance.filter(c => c.level === 'EXCELLENT').length} EXCELLENT
            </Text>
            <Text style={styles.headerStatsText}>
              {categoryPerformance.filter(c => c.level === 'CRITICAL').length} CRITICAL
            </Text>
          </View>
        }
      />

      <MilitaryCardContent>
        <View style={styles.grid}>
          {sortedCategories.map(renderCategoryTile)}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>PERFORMANCE LEVELS</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: theme.colors.SUCCESS }]} />
              <Text style={styles.legendText}>EXCELLENT (85%+)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: branchColor }]} />
              <Text style={styles.legendText}>GOOD (70-84%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: theme.colors.TACTICAL_ORANGE }]} />
              <Text style={styles.legendText}>NEEDS WORK (50-69%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: theme.colors.DANGER }]} />
              <Text style={styles.legendText}>CRITICAL (<50%)</Text>
            </View>
          </View>
        </View>
      </MilitaryCardContent>
    </MilitaryCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  headerStatsText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  categoryTile: {
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    position: 'relative',
    minHeight: 140,
  },
  afqtTile: {
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  afqtBadge: {
    position: 'absolute',
    top: -8,
    right: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    zIndex: 2,
  },
  afqtBadgeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  categoryName: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[2],
    minHeight: 32,
  },
  scoreContainer: {
    marginBottom: theme.spacing[2],
  },
  scoreText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    marginBottom: theme.spacing[1],
  },
  levelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    marginLeft: theme.spacing[1],
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: theme.spacing[2],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  questionCount: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  levelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.borderRadius.base,
    zIndex: -1,
  },
  legend: {
    marginTop: theme.spacing[2],
    padding: theme.spacing[3],
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderRadius: theme.borderRadius.base,
  },
  legendTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: theme.spacing[1],
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing[2],
  },
  legendText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    flex: 1,
  },
});