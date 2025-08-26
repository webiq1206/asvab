import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { MilitaryBranch } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService, Achievement } from '../../services/gamificationService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MilitaryHeader } from '../../components/common/MilitaryHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onExit?: () => void;
}

export const AchievementsScreen: React.FC<Props> = ({ onExit }) => {
  const { user } = useAuth();
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

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

  // Fetch achievements
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements', user?.selectedBranch],
    queryFn: () => gamificationService.getAchievements(user?.selectedBranch),
  });

  const handleClaimAchievement = async (achievement: Achievement) => {
    if (achievement.progress >= 100 && !achievement.isUnlocked) {
      try {
        const result = await gamificationService.claimAchievement(achievement.id);
        Alert.alert(
          'Achievement Unlocked! 🏆',
          `${gamificationService.getAchievementCelebration(achievement, user?.selectedBranch!)}\n\n+${result.xpAwarded} XP`,
          [{ text: 'Outstanding!', style: 'default' }]
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to claim achievement. Please try again.');
      }
    }
  };

  const categories = achievements ? ['all', ...Array.from(new Set(achievements.map(a => a.category)))] : [];
  const difficulties = ['all', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

  const filteredAchievements = achievements?.filter(achievement => {
    const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || achievement.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  }) || [];

  const unlockedCount = achievements?.filter(a => a.isUnlocked).length || 0;
  const totalCount = achievements?.length || 0;
  const totalXPFromAchievements = achievements?.filter(a => a.isUnlocked).reduce((sum, a) => sum + a.xpReward, 0) || 0;

  const renderProgressCard = () => (
    <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[colors.primary + '25', colors.accent + '25']}
        style={styles.progressGradient}
      >
        <View style={styles.progressHeader}>
          <Ionicons name="trophy" size={28} color={colors.primary} />
          <View style={styles.progressInfo}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Achievement Progress
            </Text>
            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
              Military honors earned through dedication
            </Text>
          </View>
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Text style={[styles.progressValue, { color: colors.primary }]}>
              {unlockedCount}/{totalCount}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Unlocked
            </Text>
          </View>

          <View style={styles.progressStat}>
            <Text style={[styles.progressValue, { color: colors.success }]}>
              {gamificationService.formatXP(totalXPFromAchievements)}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              XP Earned
            </Text>
          </View>

          <View style={styles.progressStat}>
            <Text style={[styles.progressValue, { color: colors.accent }]}>
              {Math.round((unlockedCount / totalCount) * 100)}%
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Complete
            </Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={[styles.progressBarFill, { width: `${(unlockedCount / totalCount) * 100}%` }]}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>Category:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.filterText,
                { color: selectedCategory === category ? colors.background : colors.text }
              ]}>
                {category === 'all' ? 'All' : category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>Difficulty:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {difficulties.map((difficulty) => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.filterButton,
                selectedDifficulty === difficulty && { backgroundColor: colors.accent },
                { borderColor: colors.border }
              ]}
              onPress={() => setSelectedDifficulty(difficulty)}
            >
              <Text style={[
                styles.filterText,
                { color: selectedDifficulty === difficulty ? colors.background : colors.text }
              ]}>
                {difficulty === 'all' ? 'All' : difficulty}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderAchievementCard = (achievement: Achievement) => {
    const difficultyColor = gamificationService.getDifficultyColor(achievement.difficulty);
    const canClaim = achievement.progress >= 100 && !achievement.isUnlocked;

    return (
      <TouchableOpacity
        key={achievement.id}
        style={[
          styles.achievementCard,
          { backgroundColor: colors.surface },
          achievement.isUnlocked && { opacity: 1 },
          !achievement.isUnlocked && achievement.progress < 100 && { opacity: 0.7 }
        ]}
        onPress={() => canClaim && handleClaimAchievement(achievement)}
        activeOpacity={canClaim ? 0.7 : 1}
      >
        <LinearGradient
          colors={achievement.isUnlocked 
            ? [difficultyColor + '25', difficultyColor + '15']
            : canClaim
            ? [colors.success + '20', colors.success + '10']
            : [colors.surface, colors.surface]
          }
          style={styles.achievementGradient}
        >
          <View style={styles.achievementHeader}>
            <View style={[
              styles.achievementIcon,
              { backgroundColor: difficultyColor + '20' }
            ]}>
              <Ionicons 
                name={achievement.isUnlocked ? achievement.icon as any : 'lock-closed'} 
                size={24} 
                color={achievement.isUnlocked ? difficultyColor : colors.textSecondary} 
              />
            </View>

            <View style={styles.achievementInfo}>
              <View style={styles.achievementTitleRow}>
                <Text style={[
                  styles.achievementTitle,
                  { color: achievement.isUnlocked ? colors.text : colors.textSecondary }
                ]}>
                  {achievement.title}
                </Text>
                
                <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor + '20' }]}>
                  <Text style={[styles.difficultyText, { color: difficultyColor }]}>
                    {achievement.difficulty}
                  </Text>
                </View>
              </View>

              <Text style={[
                styles.achievementDescription,
                { color: colors.textSecondary }
              ]}>
                {achievement.description}
              </Text>

              {achievement.isBranchSpecific && (
                <Text style={[styles.branchSpecific, { color: colors.accent }]}>
                  <Ionicons name="shield" size={12} color={colors.accent} /> Branch Specific
                </Text>
              )}
            </View>

            <View style={styles.achievementReward}>
              {achievement.isUnlocked ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              ) : canClaim ? (
                <View style={styles.claimButton}>
                  <Text style={[styles.claimText, { color: colors.success }]}>CLAIM</Text>
                </View>
              ) : (
                <View style={styles.xpReward}>
                  <Text style={[styles.xpValue, { color: colors.primary }]}>
                    {achievement.xpReward}
                  </Text>
                  <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>XP</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.requirementSection}>
            <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
              {achievement.requirement.type.replace(/_/g, ' ')} • Target: {achievement.requirement.target}
            </Text>
            
            {achievement.requirement.current !== undefined && !achievement.isUnlocked && (
              <View style={styles.progressSection}>
                <View style={[styles.achievementProgressBar, { backgroundColor: colors.border }]}>
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    style={[styles.achievementProgressFill, { width: `${achievement.progress}%` }]}
                  />
                </View>
                <Text style={[styles.achievementProgressText, { color: colors.textSecondary }]}>
                  {achievement.requirement.current}/{achievement.requirement.target} ({Math.round(achievement.progress)}%)
                </Text>
              </View>
            )}
          </View>

          {achievement.isUnlocked && achievement.unlockedAt && (
            <Text style={[styles.unlockedDate, { color: colors.success }]}>
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading achievements..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <MilitaryHeader title="Achievements" onBack={onExit} />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Overview */}
        {renderProgressCard()}

        {/* Filters */}
        {renderFilters()}

        {/* Achievement Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Military Achievements
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Earn honors through dedicated study and exceptional performance
          </Text>

          {filteredAchievements.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Ionicons name="trophy" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Achievements Found
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                Adjust your filters or start studying to unlock achievements!
              </Text>
            </View>
          ) : (
            <View style={styles.achievementsList}>
              {/* Unlocked Achievements First */}
              {filteredAchievements
                .filter(a => a.isUnlocked)
                .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
                .map(renderAchievementCard)
              }
              
              {/* Claimable Achievements */}
              {filteredAchievements
                .filter(a => !a.isUnlocked && a.progress >= 100)
                .sort((a, b) => b.xpReward - a.xpReward)
                .map(renderAchievementCard)
              }
              
              {/* In Progress Achievements */}
              {filteredAchievements
                .filter(a => !a.isUnlocked && a.progress > 0 && a.progress < 100)
                .sort((a, b) => b.progress - a.progress)
                .map(renderAchievementCard)
              }
              
              {/* Locked Achievements */}
              {filteredAchievements
                .filter(a => !a.isUnlocked && a.progress === 0)
                .sort((a, b) => a.xpReward - b.xpReward)
                .map(renderAchievementCard)
              }
            </View>
          )}
        </View>

        {/* Achievement Categories Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.info + '20', colors.primary + '20']}
            style={styles.infoGradient}
          >
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Achievement Categories
              </Text>
            </View>

            <View style={styles.categoriesInfo}>
              {[
                { name: 'STUDY', description: 'Complete study sessions and review materials', icon: 'book' },
                { name: 'QUIZ', description: 'Achieve high scores on practice tests', icon: 'help-circle' },
                { name: 'STREAK', description: 'Maintain consistent daily study habits', icon: 'flame' },
                { name: 'SCORE', description: 'Reach AFQT score milestones', icon: 'trending-up' },
                { name: 'SPECIAL', description: 'Complete unique challenges and events', icon: 'star' },
                { name: 'MILESTONE', description: 'Reach significant training milestones', icon: 'flag' }
              ].map((category, index) => (
                <View key={index} style={styles.categoryInfoItem}>
                  <Ionicons name={category.icon as any} size={16} color={colors.primary} />
                  <View style={styles.categoryInfoText}>
                    <Text style={[styles.categoryInfoName, { color: colors.text }]}>
                      {category.name}
                    </Text>
                    <Text style={[styles.categoryInfoDescription, { color: colors.textSecondary }]}>
                      {category.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Motivational Footer */}
        <View style={[styles.motivationCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.success + '20', colors.primary + '20']}
            style={styles.motivationGradient}
          >
            <Ionicons name="medal" size={32} color={colors.success} />
            <Text style={[styles.motivationTitle, { color: colors.text }]}>
              Honor Through Achievement
            </Text>
            <Text style={[styles.motivationText, { color: colors.textSecondary }]}>
              Each achievement represents your commitment to excellence, {getBranchTitle(user?.selectedBranch)}. 
              Every milestone reached brings you closer to ASVAB mastery and your military career goals. 
              Continue your dedicated training and earn the honors you deserve!
            </Text>
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
  progressCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  progressGradient: {
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressInfo: {
    flex: 1,
    marginLeft: 15,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  filtersContainer: {
    marginBottom: 25,
  },
  filterRow: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  achievementsList: {
    gap: 15,
  },
  achievementCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  achievementGradient: {
    padding: 15,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  achievementDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  branchSpecific: {
    fontSize: 11,
    fontWeight: '600',
  },
  achievementReward: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  claimText: {
    fontSize: 12,
    fontWeight: '700',
  },
  xpReward: {
    alignItems: 'center',
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  xpLabel: {
    fontSize: 10,
  },
  requirementSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    marginTop: 12,
  },
  requirementText: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  progressSection: {
    marginBottom: 8,
  },
  achievementProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  achievementProgressText: {
    fontSize: 11,
  },
  unlockedDate: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 8,
  },
  infoCard: {
    borderRadius: 15,
    marginBottom: 25,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  categoriesInfo: {
    gap: 12,
  },
  categoryInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryInfoText: {
    flex: 1,
    marginLeft: 10,
  },
  categoryInfoName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryInfoDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  motivationCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  motivationGradient: {
    padding: 20,
    alignItems: 'center',
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  motivationText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});