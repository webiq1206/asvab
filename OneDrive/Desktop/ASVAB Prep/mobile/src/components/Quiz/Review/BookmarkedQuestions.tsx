import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch, Question, QuestionCategory } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../../UI/MilitaryCard';

interface BookmarkedQuestion extends Question {
  bookmarkedAt: Date;
  note?: string;
  reviewCount: number;
  lastReviewed?: Date;
}

interface BookmarkedQuestionsProps {
  questions: BookmarkedQuestion[];
  onQuestionPress: (question: BookmarkedQuestion) => void;
  onRemoveBookmark: (questionId: string) => void;
  onUpdateNote: (questionId: string, note: string) => void;
  branch?: MilitaryBranch;
  style?: any;
}

type FilterType = 'all' | 'with_notes' | 'needs_review' | 'recent';
type SortType = 'newest' | 'oldest' | 'category' | 'difficulty';

export const BookmarkedQuestions: React.FC<BookmarkedQuestionsProps> = ({
  questions,
  onQuestionPress,
  onRemoveBookmark,
  onUpdateNote,
  branch,
  style,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'all'>('all');

  const getFilteredQuestions = (): BookmarkedQuestion[] => {
    let filtered = questions;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    // Apply type filter
    switch (filter) {
      case 'with_notes':
        filtered = filtered.filter(q => q.note && q.note.trim() !== '');
        break;
      case 'needs_review':
        filtered = filtered.filter(q => {
          if (!q.lastReviewed) return true;
          const daysSinceReview = (Date.now() - q.lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceReview > 7; // Needs review if not reviewed in 7 days
        });
        break;
      case 'recent':
        const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        filtered = filtered.filter(q => q.bookmarkedAt > recentDate);
        break;
    }

    // Apply sort
    switch (sort) {
      case 'newest':
        filtered.sort((a, b) => b.bookmarkedAt.getTime() - a.bookmarkedAt.getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.bookmarkedAt.getTime() - b.bookmarkedAt.getTime());
        break;
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'difficulty':
        const difficultyOrder = { EASY: 1, MEDIUM: 2, HARD: 3 };
        filtered.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
        break;
    }

    return filtered;
  };

  const handleRemoveBookmark = (questionId: string) => {
    Alert.alert(
      'Remove Bookmark',
      'Are you sure you want to remove this question from your review list?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onRemoveBookmark(questionId)
        },
      ]
    );
  };

  const getMilitaryTitle = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "TACTICAL REVIEW BOARD";
      case MilitaryBranch.NAVY:
        return "NAVIGATION LOG";
      case MilitaryBranch.AIR_FORCE:
        return "FLIGHT CHECKLIST";
      case MilitaryBranch.MARINES:
        return "TARGET INTEL";
      case MilitaryBranch.COAST_GUARD:
        return "RESCUE PROTOCOLS";
      case MilitaryBranch.SPACE_FORCE:
        return "MISSION ARCHIVE";
      default:
        return "BOOKMARKED QUESTIONS";
    }
  };

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

  const getDifficultyColor = (difficulty: 'EASY' | 'MEDIUM' | 'HARD'): string => {
    switch (difficulty) {
      case 'EASY': return theme.colors.SUCCESS;
      case 'MEDIUM': return theme.colors.TACTICAL_ORANGE;
      case 'HARD': return theme.colors.DANGER;
      default: return theme.colors.KHAKI;
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const filteredQuestions = getFilteredQuestions();

  if (questions.length === 0) {
    return (
      <MilitaryCard variant="intel" branch={userBranch} style={style}>
        <MilitaryCardHeader
          title={getMilitaryTitle()}
          subtitle="No questions marked for review"
          variant="intel"
        />
        <MilitaryCardContent>
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={theme.colors.KHAKI} />
            <Text style={styles.emptyTitle}>No Bookmarked Questions</Text>
            <Text style={styles.emptyMessage}>
              Start bookmarking questions during quizzes to build your personal review list.
            </Text>
          </View>
        </MilitaryCardContent>
      </MilitaryCard>
    );
  }

  return (
    <MilitaryCard variant="intel" branch={userBranch} style={style}>
      <MilitaryCardHeader
        title={getMilitaryTitle()}
        subtitle={`${filteredQuestions.length} questions for review`}
        variant="intel"
        rightContent={
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {questions.filter(q => q.note).length} with notes
            </Text>
          </View>
        }
      />

      <MilitaryCardContent>
        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={[styles.filtersTitle, { color: branchColor }]}>
            MISSION FILTERS
          </Text>
          
          {/* Type Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {[
              { key: 'all', label: 'ALL', icon: 'list' },
              { key: 'with_notes', label: 'WITH NOTES', icon: 'create' },
              { key: 'needs_review', label: 'NEEDS REVIEW', icon: 'alert-circle' },
              { key: 'recent', label: 'RECENT', icon: 'time' },
            ].map((filterOption) => (
              <TouchableOpacity
                key={filterOption.key}
                style={[
                  styles.filterButton,
                  filter === filterOption.key && { backgroundColor: branchColor },
                ]}
                onPress={() => setFilter(filterOption.key as FilterType)}
              >
                <Ionicons
                  name={filterOption.icon as any}
                  size={16}
                  color={filter === filterOption.key ? '#FFFFFF' : branchColor}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: filter === filterOption.key ? '#FFFFFF' : branchColor },
                  ]}
                >
                  {filterOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort Options */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {[
              { key: 'newest', label: 'NEWEST', icon: 'arrow-down' },
              { key: 'oldest', label: 'OLDEST', icon: 'arrow-up' },
              { key: 'category', label: 'CATEGORY', icon: 'folder' },
              { key: 'difficulty', label: 'DIFFICULTY', icon: 'bar-chart' },
            ].map((sortOption) => (
              <TouchableOpacity
                key={sortOption.key}
                style={[
                  styles.sortButton,
                  sort === sortOption.key && { backgroundColor: `${branchColor}30`, borderColor: branchColor },
                ]}
                onPress={() => setSort(sortOption.key as SortType)}
              >
                <Ionicons
                  name={sortOption.icon as any}
                  size={14}
                  color={branchColor}
                />
                <Text style={[styles.sortButtonText, { color: branchColor }]}>
                  {sortOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Questions List */}
        <ScrollView style={styles.questionsList} showsVerticalScrollIndicator={false}>
          {filteredQuestions.map((question, index) => (
            <TouchableOpacity
              key={question.id}
              style={[styles.questionItem, { borderColor: `${branchColor}40` }]}
              onPress={() => onQuestionPress(question)}
            >
              <View style={styles.questionHeader}>
                <View style={styles.questionMeta}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${branchColor}20` }]}>
                    <Ionicons
                      name={getCategoryIcon(question.category)}
                      size={16}
                      color={branchColor}
                    />
                  </View>
                  
                  <View style={styles.questionInfo}>
                    <Text style={styles.categoryText}>
                      {question.category.replace(/_/g, ' ')}
                    </Text>
                    <View style={styles.questionSubInfo}>
                      <View
                        style={[
                          styles.difficultyBadge,
                          { backgroundColor: getDifficultyColor(question.difficulty) },
                        ]}
                      >
                        <Text style={styles.difficultyText}>
                          {question.difficulty}
                        </Text>
                      </View>
                      <Text style={styles.timeText}>
                        {formatTimeAgo(question.bookmarkedAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveBookmark(question.id)}
                >
                  <Ionicons name="bookmark" size={20} color={branchColor} />
                </TouchableOpacity>
              </View>

              <Text style={styles.questionContent} numberOfLines={2}>
                {question.content}
              </Text>

              {question.note && (
                <View style={[styles.noteSection, { backgroundColor: `${theme.colors.TACTICAL_ORANGE}20` }]}>
                  <Ionicons name="document-text" size={14} color={theme.colors.TACTICAL_ORANGE} />
                  <Text style={styles.noteText} numberOfLines={2}>
                    {question.note}
                  </Text>
                </View>
              )}

              <View style={styles.questionFooter}>
                <Text style={styles.reviewStats}>
                  Reviewed {question.reviewCount} times
                  {question.lastReviewed && ` • Last: ${formatTimeAgo(question.lastReviewed)}`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.KHAKI} />
              </View>
            </TouchableOpacity>
          ))}

          {filteredQuestions.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search" size={32} color={theme.colors.KHAKI} />
              <Text style={styles.noResultsText}>
                No questions match your current filters
              </Text>
            </View>
          )}
        </ScrollView>
      </MilitaryCardContent>
    </MilitaryCard>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  emptyTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: '#FFFFFF',
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  emptyMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    lineHeight: 22,
  },
  filtersSection: {
    marginBottom: theme.spacing[4],
  },
  filtersTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing[3],
  },
  filterRow: {
    marginBottom: theme.spacing[2],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing[2],
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    gap: theme.spacing[1],
  },
  filterButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing[2],
    borderWidth: 1,
    borderColor: 'transparent',
    gap: theme.spacing[1],
  },
  sortButtonText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
  },
  questionsList: {
    maxHeight: 400,
  },
  questionItem: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    marginBottom: theme.spacing[3],
    gap: theme.spacing[3],
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  questionInfo: {
    flex: 1,
  },
  categoryText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  questionSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  difficultyBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  difficultyText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  timeText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  removeButton: {
    padding: theme.spacing[1],
  },
  questionContent: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    lineHeight: 20,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing[2],
  },
  noteText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewStats: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  noResultsText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    marginTop: theme.spacing[2],
  },
});