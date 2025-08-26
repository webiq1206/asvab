import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryBranch } from '@asvab-prep/shared';
import { StudyStreakData } from '@/services/dashboardService';
import { Ionicons } from '@expo/vector-icons';

interface StudyStreakCardProps {
  streakData?: StudyStreakData;
  branch: MilitaryBranch;
  onStreakPress: () => void;
}

export const StudyStreakCard: React.FC<StudyStreakCardProps> = ({
  streakData,
  branch,
  onStreakPress,
}) => {
  const branchColor = theme.branchColors[branch];

  if (!streakData) {
    return null;
  }

  const getStreakLevel = (streak: number) => {
    if (streak >= 30) return { level: 'LEGENDARY', color: theme.colors.SUCCESS, icon: 'star' };
    if (streak >= 14) return { level: 'ELITE', color: branchColor, icon: 'trophy' };
    if (streak >= 7) return { level: 'VETERAN', color: theme.colors.TACTICAL_ORANGE, icon: 'medal' };
    if (streak >= 3) return { level: 'MOTIVATED', color: theme.colors.WARNING, icon: 'ribbon' };
    if (streak >= 1) return { level: 'ACTIVE', color: theme.colors.INFO, icon: 'flame' };
    return { level: 'RECRUIT', color: theme.colors.KHAKI, icon: 'person' };
  };

  const getMotivationMessage = (streak: number, isActive: boolean) => {
    if (!isActive) {
      return "Time to get back in the fight! Your training awaits.";
    }
    
    if (streak >= 30) return "Absolute dedication! You're a training legend!";
    if (streak >= 14) return "Outstanding commitment! Elite performance!";
    if (streak >= 7) return "Excellent battle rhythm! Keep the momentum!";
    if (streak >= 3) return "Good discipline! Building strong habits!";
    if (streak >= 1) return "Stay motivated! Every day counts!";
    return "Start your journey! Begin your first training day.";
  };

  const streakLevel = getStreakLevel(streakData.currentStreak);
  const daysToNext = streakData.nextMilestone - streakData.currentStreak;

  return (
    <TouchableOpacity onPress={onStreakPress} activeOpacity={0.8}>
      <MilitaryCard variant="tactical" branch={branch} style={styles.card}>
        <MilitaryCardHeader
          title="STUDY STREAK"
          subtitle="Maintain your battle rhythm"
          variant="tactical"
          rightContent={
            <View style={[styles.streakBadge, { backgroundColor: streakLevel.color }]}>
              <Ionicons name={streakLevel.icon} size={16} color="#FFFFFF" />
              <Text style={styles.badgeText}>{streakLevel.level}</Text>
            </View>
          }
        />

        <MilitaryCardContent>
          <View style={styles.mainContent}>
            {/* Current Streak Display */}
            <View style={styles.streakDisplay}>
              <View style={[styles.streakCircle, { borderColor: streakLevel.color }]}>
                <View style={[styles.innerCircle, { backgroundColor: `${streakLevel.color}20` }]}>
                  <Ionicons name="flame" size={24} color={streakLevel.color} />
                  <Text style={[styles.streakNumber, { color: streakLevel.color }]}>
                    {streakData.currentStreak}
                  </Text>
                  <Text style={styles.streakLabel}>DAYS</Text>
                </View>
              </View>

              <View style={styles.streakStats}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Current Streak:</Text>
                  <Text style={[styles.statValue, { color: streakLevel.color }]}>
                    {streakData.currentStreak} days
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Longest Streak:</Text>
                  <Text style={styles.statValue}>
                    {streakData.longestStreak} days
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Next Milestone:</Text>
                  <Text style={[styles.statValue, { color: branchColor }]}>
                    {daysToNext} days to go
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress to Next Milestone */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>MILESTONE PROGRESS</Text>
                <Text style={[styles.progressPercentage, { color: branchColor }]}>
                  {Math.round((streakData.currentStreak / streakData.nextMilestone) * 100)}%
                </Text>
              </View>
              
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(streakData.currentStreak / streakData.nextMilestone) * 100}%`,
                      backgroundColor: streakLevel.color,
                    },
                  ]}
                />
              </View>
              
              <Text style={styles.milestoneText}>
                Next: {streakData.nextMilestone} days
              </Text>
            </View>

            {/* Motivation Message */}
            <View style={[styles.messageSection, { backgroundColor: `${streakLevel.color}15` }]}>
              <View style={styles.messageHeader}>
                <Ionicons 
                  name={streakData.streakActive ? "checkmark-circle" : "alert-circle"} 
                  size={16} 
                  color={streakData.streakActive ? theme.colors.SUCCESS : theme.colors.TACTICAL_ORANGE} 
                />
                <Text style={styles.messageTitle}>
                  {streakData.streakActive ? 'STREAK ACTIVE' : 'STREAK BROKEN'}
                </Text>
              </View>
              <Text style={styles.messageText}>
                {getMotivationMessage(streakData.currentStreak, streakData.streakActive)}
              </Text>
            </View>

            {/* Streak Calendar Preview (Last 7 Days) */}
            <View style={styles.calendarSection}>
              <Text style={styles.calendarTitle}>LAST 7 DAYS</Text>
              <View style={styles.calendarDots}>
                {Array.from({ length: 7 }, (_, i) => {
                  const dayIndex = 6 - i;
                  const isActiveDay = dayIndex < streakData.currentStreak;
                  
                  return (
                    <View
                      key={i}
                      style={[
                        styles.calendarDot,
                        {
                          backgroundColor: isActiveDay 
                            ? streakLevel.color 
                            : `${theme.colors.KHAKI}30`,
                        },
                      ]}
                    >
                      {isActiveDay && (
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.calendarLabels}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <Text key={index} style={styles.dayLabel}>{day}</Text>
                ))}
              </View>
            </View>
          </View>
        </MilitaryCardContent>
      </MilitaryCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
    marginLeft: theme.spacing[1],
  },
  mainContent: {
    gap: theme.spacing[4],
  },
  streakDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
  },
  streakCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakNumber: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    marginTop: theme.spacing[1],
  },
  streakLabel: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  streakStats: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  statLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  statValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
  },
  progressSection: {
    padding: theme.spacing[3],
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderRadius: theme.borderRadius.base,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  progressTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  progressBar: {
    height: 6,
    backgroundColor: `${theme.colors.KHAKI}20`,
    borderRadius: 3,
    marginBottom: theme.spacing[2],
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestoneText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  messageSection: {
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  messageTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginLeft: theme.spacing[2],
  },
  messageText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    lineHeight: 18,
  },
  calendarSection: {
    alignItems: 'center',
  },
  calendarTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
    marginBottom: theme.spacing[2],
  },
  calendarDots: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  calendarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarLabels: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  dayLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    width: 24,
    textAlign: 'center',
  },
});