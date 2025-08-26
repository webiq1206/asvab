import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch, SubscriptionTier } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { PremiumBadge } from './PremiumBadge';

interface SubscriptionStatusCardProps {
  onUpgradePress: () => void;
  onManagePress?: () => void;
  branch?: MilitaryBranch;
  style?: any;
}

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  onUpgradePress,
  onManagePress,
  branch,
  style,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const {
    subscriptionStatus,
    usage,
    limits,
    loading,
    hasValidSubscription,
    isInTrial,
    isPremium,
    trialDaysLeft,
  } = useSubscription();

  if (loading) {
    return (
      <MilitaryCard variant="intel" branch={userBranch} style={style}>
        <MilitaryCardContent>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading subscription status...</Text>
          </View>
        </MilitaryCardContent>
      </MilitaryCard>
    );
  }

  const getStatusDisplay = () => {
    if (isPremium) {
      return {
        title: 'PREMIUM ACTIVE',
        subtitle: 'Full access to all features',
        icon: 'star',
        color: theme.colors.SUCCESS,
        badge: <PremiumBadge size="medium" color={theme.colors.SUCCESS} />,
      };
    }

    if (isInTrial) {
      return {
        title: 'TRIAL ACTIVE',
        subtitle: `${trialDaysLeft || 0} days remaining`,
        icon: 'time',
        color: theme.colors.TACTICAL_ORANGE,
        badge: <PremiumBadge size="medium" color={theme.colors.TACTICAL_ORANGE} variant="text" />,
      };
    }

    return {
      title: 'FREE TIER',
      subtitle: 'Limited access • Upgrade for more',
      icon: 'lock-closed',
      color: theme.colors.KHAKI,
      badge: null,
    };
  };

  const getMilitaryStatusMessage = (): string => {
    if (isPremium) {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "Outstanding, Soldier! You have full premium clearance. All systems operational!";
        case MilitaryBranch.NAVY:
          return "Excellent, Sailor! Full speed ahead with premium navigation systems!";
        case MilitaryBranch.AIR_FORCE:
          return "Roger that, Airman! Premium flight systems fully operational!";
        case MilitaryBranch.MARINES:
          return "Oorah, Marine! Premium tactical systems at full combat readiness!";
        case MilitaryBranch.COAST_GUARD:
          return "Excellent, Coastie! Premium rescue operations systems ready!";
        case MilitaryBranch.SPACE_FORCE:
          return "Outstanding, Guardian! Premium space systems online and operational!";
        default:
          return "Premium subscription active! All advanced features available.";
      }
    }

    if (isInTrial) {
      const days = trialDaysLeft || 0;
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return `Trial mission in progress, Soldier! ${days} days to complete your premium evaluation.`;
        case MilitaryBranch.NAVY:
          return `Trial voyage underway, Sailor! ${days} days to chart your premium course.`;
        case MilitaryBranch.AIR_FORCE:
          return `Test flight active, Airman! ${days} days to evaluate premium capabilities.`;
        case MilitaryBranch.MARINES:
          return `Trial operation underway, Marine! ${days} days to assess premium tactical advantage.`;
        case MilitaryBranch.COAST_GUARD:
          return `Trial mission active, Coastie! ${days} days to evaluate premium readiness.`;
        case MilitaryBranch.SPACE_FORCE:
          return `Trial mission in orbit, Guardian! ${days} days to explore premium stellar features.`;
        default:
          return `Free trial active! ${days} days remaining to explore premium features.`;
      }
    }

    // Free tier
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "Basic training mode, Soldier! Upgrade for advanced tactical training systems.";
      case MilitaryBranch.NAVY:
        return "Basic navigation, Sailor! Upgrade for full maritime training capabilities.";
      case MilitaryBranch.AIR_FORCE:
        return "Ground operations only, Airman! Upgrade for full flight training systems.";
      case MilitaryBranch.MARINES:
        return "Basic training, Marine! Upgrade for full tactical combat readiness.";
      case MilitaryBranch.COAST_GUARD:
        return "Standard operations, Coastie! Upgrade for enhanced rescue training.";
      case MilitaryBranch.SPACE_FORCE:
        return "Ground control only, Guardian! Upgrade for full space training systems.";
      default:
        return "Free tier access. Upgrade to premium for unlimited features.";
    }
  };

  const getUsageStats = () => {
    if (!usage || !limits) return [];

    const stats = [
      {
        label: 'Questions',
        value: limits.maxQuestions === -1 ? '∞' : `${usage.questionsUsed}/${limits.maxQuestions}`,
        color: limits.maxQuestions === -1 ? theme.colors.SUCCESS : 
               (usage.questionsUsed / limits.maxQuestions > 0.8 ? theme.colors.DANGER : branchColor),
      },
      {
        label: 'Daily Quizzes',
        value: limits.maxQuizzesPerDay === -1 ? '∞' : `${usage.quizzesToday}/${limits.maxQuizzesPerDay}`,
        color: limits.maxQuizzesPerDay === -1 ? theme.colors.SUCCESS : 
               (usage.quizzesToday >= limits.maxQuizzesPerDay ? theme.colors.DANGER : branchColor),
      },
      {
        label: 'Categories',
        value: `${usage.categoriesAccessed}/${limits.maxCategories}`,
        color: usage.categoriesAccessed >= limits.maxCategories ? theme.colors.DANGER : branchColor,
      },
    ];

    return stats;
  };

  const status = getStatusDisplay();
  const usageStats = getUsageStats();

  return (
    <MilitaryCard variant="intel" branch={userBranch} style={style}>
      <MilitaryCardHeader
        title="SUBSCRIPTION STATUS"
        subtitle="Access level and usage"
        variant="intel"
        rightContent={status.badge}
      />

      <MilitaryCardContent>
        {/* Status Display */}
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIcon, { backgroundColor: `${status.color}20` }]}>
              <Ionicons name={status.icon} size={24} color={status.color} />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: status.color }]}>
                {status.title}
              </Text>
              <Text style={styles.statusSubtitle}>
                {status.subtitle}
              </Text>
            </View>
          </View>

          <Text style={styles.statusMessage}>
            {getMilitaryStatusMessage()}
          </Text>
        </View>

        {/* Usage Statistics */}
        {usageStats.length > 0 && (
          <View style={styles.usageSection}>
            <Text style={styles.usageTitle}>CURRENT USAGE</Text>
            <View style={styles.usageStats}>
              {usageStats.map((stat, index) => (
                <View key={index} style={styles.usageStat}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={[styles.statValue, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {!hasValidSubscription && (
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: branchColor }]}
              onPress={onUpgradePress}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>
                {isInTrial ? 'UPGRADE TO PREMIUM' : 'START FREE TRIAL'}
              </Text>
            </TouchableOpacity>
          )}

          {onManagePress && hasValidSubscription && (
            <TouchableOpacity
              style={[styles.manageButton, { borderColor: branchColor }]}
              onPress={onManagePress}
            >
              <Ionicons name="settings" size={20} color={branchColor} />
              <Text style={[styles.manageButtonText, { color: branchColor }]}>
                MANAGE SUBSCRIPTION
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Additional Info */}
        {isInTrial && trialDaysLeft !== null && trialDaysLeft <= 2 && (
          <View style={[styles.warningSection, { backgroundColor: `${theme.colors.TACTICAL_ORANGE}15` }]}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.TACTICAL_ORANGE} />
            <Text style={[styles.warningText, { color: theme.colors.TACTICAL_ORANGE }]}>
              Trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}! 
              Upgrade now to keep your premium features.
            </Text>
          </View>
        )}
      </MilitaryCardContent>
    </MilitaryCard>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
  },
  statusSection: {
    marginBottom: theme.spacing[4],
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    marginBottom: theme.spacing[1],
  },
  statusSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  statusMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    lineHeight: 20,
    fontStyle: 'italic',
    padding: theme.spacing[3],
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderRadius: theme.borderRadius.base,
  },
  usageSection: {
    marginBottom: theme.spacing[4],
  },
  usageTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[3],
  },
  usageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usageStat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[1],
  },
  statValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  actionsSection: {
    gap: theme.spacing[3],
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  upgradeButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    gap: theme.spacing[2],
  },
  manageButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    marginTop: theme.spacing[3],
    gap: theme.spacing[2],
  },
  warningText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    flex: 1,
    lineHeight: 18,
  },
});