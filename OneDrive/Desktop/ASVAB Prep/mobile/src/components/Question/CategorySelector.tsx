import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { QuestionCategory, MilitaryBranch, CATEGORY_DISPLAY_NAMES } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface CategoryData {
  category: QuestionCategory;
  questionCount: number;
}

interface CategorySelectorProps {
  categories: CategoryData[];
  selectedCategory?: QuestionCategory;
  onCategorySelect: (category: QuestionCategory) => void;
  branch: MilitaryBranch;
  userProgress?: Record<QuestionCategory, { averageScore: number; totalQuestions: number }>;
  disabled?: boolean;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - theme.spacing[8] - theme.spacing[4]) / 2;

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  branch,
  userProgress = {},
  disabled = false,
}) => {
  const getCategoryIcon = (category: QuestionCategory) => {
    const iconMap: Record<QuestionCategory, keyof typeof Ionicons.glyphMap> = {
      GENERAL_SCIENCE: 'flask',
      ARITHMETIC_REASONING: 'calculator',
      WORD_KNOWLEDGE: 'book',
      PARAGRAPH_COMPREHENSION: 'document-text',
      MATHEMATICS_KNOWLEDGE: 'school',
      ELECTRONICS_INFORMATION: 'hardware-chip',
      AUTO_SHOP: 'car',
      MECHANICAL_COMPREHENSION: 'cog',
      ASSEMBLING_OBJECTS: 'cube',
    };
    return iconMap[category] || 'help-circle';
  };

  const getProgressColor = (averageScore: number) => {
    if (averageScore >= 85) return theme.colors.SUCCESS;
    if (averageScore >= 70) return theme.colors.WARNING;
    if (averageScore >= 50) return theme.colors.INFO;
    return theme.colors.DANGER;
  };

  const getProgressStatus = (averageScore: number) => {
    if (averageScore >= 85) return 'EXCELLENT';
    if (averageScore >= 70) return 'GOOD';
    if (averageScore >= 50) return 'FAIR';
    return 'NEEDS WORK';
  };

  const renderCategoryCard = (categoryData: CategoryData) => {
    const { category, questionCount } = categoryData;
    const isSelected = selectedCategory === category;
    const progress = userProgress[category];
    const averageScore = progress?.averageScore || 0;
    const totalAttempted = progress?.totalQuestions || 0;
    const branchColor = theme.branchColors[branch];

    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryCard,
          { width: cardWidth },
          isSelected && { 
            borderColor: branchColor,
            backgroundColor: `${branchColor}10`,
          },
        ]}
        onPress={() => onCategorySelect(category)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={styles.categoryHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${branchColor}20` }]}>
            <Ionicons
              name={getCategoryIcon(category)}
              size={24}
              color={branchColor}
            />
          </View>
          {isSelected && (
            <View style={[styles.selectedIndicator, { backgroundColor: branchColor }]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={styles.categoryTitle} numberOfLines={2}>
          {CATEGORY_DISPLAY_NAMES[category]}
        </Text>

        <View style={styles.categoryStats}>
          <Text style={styles.questionCount}>
            {questionCount} Questions
          </Text>
          
          {totalAttempted > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Score:</Text>
                <Text style={[styles.progressScore, { color: getProgressColor(averageScore) }]}>
                  {averageScore}%
                </Text>
              </View>
              <Text style={[styles.progressStatus, { color: getProgressColor(averageScore) }]}>
                {getProgressStatus(averageScore)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.categoryFooter}>
          <View style={[styles.difficultyIndicator, { backgroundColor: branchColor }]} />
          <Text style={styles.categorySubtitle}>
            {totalAttempted > 0 ? `${totalAttempted} attempted` : 'Not started'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (categories.length === 0) {
    return (
      <MilitaryCard variant="standard">
        <MilitaryCardContent>
          <View style={styles.emptyState}>
            <Ionicons name="folder-open" size={48} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No Categories Available</Text>
            <Text style={styles.emptySubtitle}>
              No question categories are available for your selected branch.
            </Text>
          </View>
        </MilitaryCardContent>
      </MilitaryCard>
    );
  }

  return (
    <View style={styles.container}>
      <MilitaryCard variant="command" branch={branch}>
        <MilitaryCardHeader
          title="Select Category"
          subtitle={`Choose from ${categories.length} categories available for your branch`}
          variant="command"
        />
      </MilitaryCard>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.categoriesGrid}>
          {categories.map(renderCategoryCard)}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing[4],
    paddingTop: theme.spacing[2],
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    minHeight: 180,
    ...theme.shadows.base,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
    lineHeight: 18,
  },
  categoryStats: {
    flex: 1,
    justifyContent: 'center',
  },
  questionCount: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[2],
  },
  progressContainer: {
    marginBottom: theme.spacing[2],
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  progressLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  progressScore: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
  },
  progressStatus: {
    fontFamily: theme.fonts.military.regular,
    fontSize: theme.fontSizes.xs,
    textAlign: 'center',
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  difficultyIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: theme.spacing[2],
  },
  categorySubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textLight,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[10],
  },
  emptyTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  emptySubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});