import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { theme } from '@/constants/theme';
import { useAuth } from '@/store/authStore';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { ProgressCircle } from '@/components/UI/ProgressCircle';
import { aiCoachingService, PersonalizedCoaching, DailyMission } from '@/services/aiCoachingService';
import { BRANCH_INFO } from '@asvab-prep/shared';

export const AICoachingScreen: React.FC = () => {
  const { selectedBranch, isPremium } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const branchColor = selectedBranch ? theme.branchColors[selectedBranch] : theme.colors.MILITARY_GREEN;
  const branchInfo = selectedBranch ? BRANCH_INFO[selectedBranch] : null;

  // Fetch personalized coaching data
  const { data: coaching, isLoading: isLoadingCoaching } = useQuery({
    queryKey: ['ai-coaching', 'personalized'],
    queryFn: () => aiCoachingService.getPersonalizedCoaching(),
    enabled: isPremium,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch daily missions
  const { data: missions = [], isLoading: isLoadingMissions } = useQuery({
    queryKey: ['ai-coaching', 'daily-missions'],
    queryFn: () => aiCoachingService.getDailyMissions(),
    enabled: isPremium,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Complete mission mutation
  const completeMissionMutation = useMutation({
    mutationFn: ({ missionId, questionsCompleted }: { missionId: string; questionsCompleted: number }) =>
      aiCoachingService.completeMission(missionId, questionsCompleted),
    onSuccess: (data) => {
      Toast.show({
        type: 'success',
        text1: 'Mission Complete!',
        text2: `You earned ${data.xpEarned} XP! ${branchInfo?.exclamation}`,
      });
      queryClient.invalidateQueries({ queryKey: ['ai-coaching'] });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['ai-coaching'] });
    setRefreshing(false);
  };

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.DARK_OLIVE, theme.colors.MILITARY_GREEN]}
          style={styles.premiumGate}
        >
          <View style={styles.premiumGateContent}>
            <Ionicons name="star" size={64} color={theme.colors.TACTICAL_ORANGE} />
            <Text style={styles.premiumTitle}>AI COACHING</Text>
            <Text style={styles.premiumSubtitle}>PREMIUM FEATURE</Text>
            <Text style={styles.premiumDescription}>
              Get personalized study recommendations, daily missions, and AI-powered 
              coaching tailored to your military branch and performance.
            </Text>
            
            <MilitaryButton
              title="UPGRADE TO PREMIUM"
              onPress={() => {/* Navigate to subscription */}}
              style={{ backgroundColor: theme.colors.TACTICAL_ORANGE, marginTop: 20 }}
              textStyle={{ color: theme.colors.DARK_OLIVE }}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[branchColor, theme.colors.DARK_OLIVE]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Ionicons name="person-circle" size={48} color={theme.colors.KHAKI} />
            <Text style={styles.greetingText}>
              {coaching?.greetingMessage || `Welcome back, ${branchInfo?.title}!`}
            </Text>
            {branchInfo && (
              <Text style={styles.branchExclamation}>{branchInfo.exclamation}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Study Streak */}
        {coaching?.studyStreak && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="STUDY STREAK"
              subtitle="Keep your momentum going"
              iconName="flame"
              iconColor={theme.colors.TACTICAL_ORANGE}
            />
            <MilitaryCardContent>
              <View style={styles.streakContainer}>
                <View style={styles.streakStats}>
                  <Text style={styles.streakNumber}>{coaching.studyStreak.current}</Text>
                  <Text style={styles.streakLabel}>DAYS</Text>
                </View>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakTarget}>
                    Target: {coaching.studyStreak.target} days
                  </Text>
                  <Text style={styles.streakEncouragement}>
                    {coaching.studyStreak.encouragement}
                  </Text>
                </View>
              </View>
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Daily Goal */}
        {coaching?.dailyGoal && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="TODAY'S MISSION"
              subtitle="Your daily training objectives"
              iconName="target"
              iconColor={branchColor}
            />
            <MilitaryCardContent>
              <View style={styles.dailyGoalContainer}>
                <View style={styles.goalStat}>
                  <ProgressCircle 
                    progress={0.6} // This would be calculated based on progress
                    size={60}
                    strokeWidth={6}
                    color={branchColor}
                  />
                  <Text style={styles.goalNumber}>{coaching.dailyGoal.questionsToComplete}</Text>
                  <Text style={styles.goalLabel}>Questions</Text>
                </View>
                <View style={styles.goalStat}>
                  <ProgressCircle 
                    progress={0.4} // This would be calculated based on progress
                    size={60}
                    strokeWidth={6}
                    color={theme.colors.TACTICAL_ORANGE}
                  />
                  <Text style={styles.goalNumber}>{coaching.dailyGoal.timeToSpend}</Text>
                  <Text style={styles.goalLabel}>Minutes</Text>
                </View>
              </View>
              
              <Text style={styles.focusAreasTitle}>Focus Areas:</Text>
              <View style={styles.focusAreas}>
                {coaching.dailyGoal.focusAreas.map((category, index) => (
                  <View key={index} style={[styles.focusArea, { borderColor: branchColor }]}>
                    <Text style={[styles.focusAreaText, { color: branchColor }]}>
                      {category.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Daily Missions */}
        {missions.length > 0 && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="DAILY MISSIONS"
              subtitle="Complete for XP rewards"
              iconName="medal"
              iconColor={theme.colors.TACTICAL_ORANGE}
            />
            <MilitaryCardContent>
              {missions.map((mission) => (
                <View key={mission.id} style={styles.missionContainer}>
                  <View style={styles.missionHeader}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <View style={styles.missionReward}>
                      <Ionicons name="star" size={16} color={theme.colors.TACTICAL_ORANGE} />
                      <Text style={styles.missionXP}>{mission.xpReward} XP</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.missionDescription}>{mission.description}</Text>
                  
                  <View style={styles.missionProgress}>
                    <View style={[styles.progressBar, { width: '100%', backgroundColor: theme.colors.border }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${mission.progress}%`, backgroundColor: branchColor }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>{mission.progress}%</Text>
                  </View>
                  
                  {!mission.isCompleted && (
                    <MilitaryButton
                      title="START MISSION"
                      onPress={() => {/* Navigate to quiz with mission category */}}
                      style={{ backgroundColor: branchColor, marginTop: 10 }}
                      size="small"
                    />
                  )}
                </View>
              ))}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Study Recommendations */}
        {coaching?.recommendations && coaching.recommendations.length > 0 && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="AI RECOMMENDATIONS"
              subtitle="Personalized study guidance"
              iconName="brain"
              iconColor={theme.colors.info}
            />
            <MilitaryCardContent>
              {coaching.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationContainer}>
                  <View style={styles.recommendationHeader}>
                    <View style={[
                      styles.priorityBadge, 
                      { backgroundColor: rec.priority === 'HIGH' ? theme.colors.DANGER : 
                                        rec.priority === 'MEDIUM' ? theme.colors.WARNING : 
                                        theme.colors.SUCCESS }
                    ]}>
                      <Text style={styles.priorityText}>{rec.priority}</Text>
                    </View>
                    <Text style={styles.categoryText}>{rec.category.replace(/_/g, ' ')}</Text>
                  </View>
                  
                  <Text style={styles.recommendationReason}>{rec.reason}</Text>
                  <Text style={styles.militaryContext}>{rec.militaryContext}</Text>
                  
                  <View style={styles.recommendationFooter}>
                    <Text style={styles.studyTime}>
                      <Ionicons name="time" size={16} /> {rec.estimatedStudyTime} min
                    </Text>
                    <Text style={styles.difficulty}>
                      Difficulty: {rec.difficulty}
                    </Text>
                  </View>
                </View>
              ))}
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Next Milestone */}
        {coaching?.nextMilestone && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="NEXT MILESTONE"
              subtitle="Your path to success"
              iconName="trophy"
              iconColor={theme.colors.TACTICAL_ORANGE}
            />
            <MilitaryCardContent>
              <Text style={styles.milestoneDescription}>
                {coaching.nextMilestone.description}
              </Text>
              
              <View style={styles.milestoneProgress}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressPercentage}>
                    {coaching.nextMilestone.progress}%
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${coaching.nextMilestone.progress}%`, 
                        backgroundColor: theme.colors.TACTICAL_ORANGE 
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.milestoneReward}>
                <Ionicons name="gift" size={20} color={branchColor} />
                <Text style={[styles.rewardText, { color: branchColor }]}>
                  Reward: {coaching.nextMilestone.reward}
                </Text>
              </View>
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* Motivational Message */}
        {coaching?.motivationalMessage && (
          <MilitaryCard style={[styles.card, styles.motivationCard]}>
            <MilitaryCardContent>
              <View style={styles.motivationContainer}>
                <Ionicons name="megaphone" size={32} color={branchColor} />
                <Text style={[styles.motivationText, { color: branchColor }]}>
                  {coaching.motivationalMessage}
                </Text>
              </View>
            </MilitaryCardContent>
          </MilitaryCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DESERT_SAND,
  },
  scrollView: {
    flex: 1,
  },
  premiumGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumGateContent: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  premiumTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.KHAKI,
    marginTop: theme.spacing[4],
    letterSpacing: 2,
  },
  premiumSubtitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.TACTICAL_ORANGE,
    marginBottom: theme.spacing[4],
  },
  premiumDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing[6],
  },
  header: {
    padding: theme.spacing[6],
    marginBottom: theme.spacing[4],
  },
  headerContent: {
    alignItems: 'center',
  },
  greetingText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    marginTop: theme.spacing[2],
    lineHeight: 28,
  },
  branchExclamation: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.TACTICAL_ORANGE,
    marginTop: theme.spacing[1],
  },
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakStats: {
    alignItems: 'center',
    marginRight: theme.spacing[6],
  },
  streakNumber: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['3xl'],
    color: theme.colors.TACTICAL_ORANGE,
  },
  streakLabel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  streakInfo: {
    flex: 1,
  },
  streakTarget: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  streakEncouragement: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  dailyGoalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing[6],
  },
  goalStat: {
    alignItems: 'center',
  },
  goalNumber: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.text,
    marginTop: theme.spacing[2],
  },
  goalLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  focusAreasTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },
  focusAreas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  focusArea: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    marginRight: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  focusAreaText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    textTransform: 'capitalize',
  },
  missionContainer: {
    marginBottom: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  missionTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    flex: 1,
  },
  missionReward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionXP: {
    fontFamily: theme.fonts.body.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.TACTICAL_ORANGE,
    marginLeft: theme.spacing[1],
  },
  missionDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[3],
  },
  missionProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing[3],
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  recommendationContainer: {
    marginBottom: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing[3],
  },
  priorityText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.white,
  },
  categoryText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  recommendationReason: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  militaryContext: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: theme.spacing[3],
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studyTime: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  difficulty: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  milestoneDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  milestoneProgress: {
    marginBottom: theme.spacing[4],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[2],
  },
  progressLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  progressPercentage: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.TACTICAL_ORANGE,
  },
  milestoneReward: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    marginLeft: theme.spacing[2],
  },
  motivationCard: {
    marginBottom: theme.spacing[6],
  },
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  motivationText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    flex: 1,
    marginLeft: theme.spacing[4],
    lineHeight: 24,
  },
});