import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { purchaseService } from '@/services/purchaseService';

interface UsageLimitIndicatorProps {
  feature: 'questions' | 'quizzes' | 'categories' | 'quiz_history';
  onUpgradePress?: () => void;
  branch?: MilitaryBranch;
  style?: any;
}

interface UsageData {
  current: number;
  limit: number;
  isUnlimited: boolean;
  percentage: number;
}

export const UsageLimitIndicator: React.FC<UsageLimitIndicatorProps> = ({
  feature,
  onUpgradePress,
  branch,
  style,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, [feature]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const [usage, limits] = await Promise.all([
        purchaseService.getSubscriptionUsage(),
        purchaseService.getSubscriptionLimits(),
      ]);

      if (usage && limits) {
        let current = 0;
        let limit = 0;

        switch (feature) {
          case 'questions':
            current = usage.questionsUsed;
            limit = limits.maxQuestions;
            break;
          case 'quizzes':
            current = usage.quizzesToday;
            limit = limits.maxQuizzesPerDay;
            break;
          case 'categories':
            current = usage.categoriesAccessed;
            limit = limits.maxCategories;
            break;
          case 'quiz_history':
            current = usage.quizHistoryCount;
            limit = limits.maxQuizHistory;
            break;
        }

        const isUnlimited = limit === -1 || limits.hasUnlimitedAccess;
        const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);

        setUsageData({
          current,
          limit,
          isUnlimited,
          percentage,
        });
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usageData) {
    return null;
  }

  if (usageData.isUnlimited) {
    return (
      <View style={[styles.container, styles.premiumContainer, { borderColor: theme.colors.SUCCESS }, style]}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.SUCCESS}20` }]}>
            <Ionicons name="infinite" size={16} color={theme.colors.SUCCESS} />
          </View>
          <Text style={[styles.unlimitedText, { color: theme.colors.SUCCESS }]}>
            Unlimited
          </Text>
        </View>
      </View>
    );
  }

  const getWarningColor = (): string => {
    if (usageData.percentage >= 100) return theme.colors.DANGER;
    if (usageData.percentage >= 80) return theme.colors.TACTICAL_ORANGE;
    return branchColor;
  };

  const getFeatureDisplayName = (): string => {
    switch (feature) {
      case 'questions': return 'Questions';
      case 'quizzes': return 'Daily Quizzes';
      case 'categories': return 'Categories';
      case 'quiz_history': return 'Quiz History';
      default: return 'Usage';
    }
  };

  const getMilitaryWarning = (): string => {
    const remaining = usageData.limit - usageData.current;
    
    if (remaining <= 0) {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "Limit reached, Soldier! Upgrade for unlimited access!";
        case MilitaryBranch.NAVY:
          return "Capacity reached, Sailor! Upgrade for open waters!";
        case MilitaryBranch.AIR_FORCE:
          return "Ceiling reached, Airman! Upgrade for unlimited altitude!";
        case MilitaryBranch.MARINES:
          return "Max capacity, Marine! Upgrade for tactical advantage!";
        case MilitaryBranch.COAST_GUARD:
          return "Limit reached, Coastie! Upgrade for extended operations!";
        case MilitaryBranch.SPACE_FORCE:
          return "Threshold exceeded, Guardian! Upgrade for infinite space!";
        default:
          return "Limit reached! Upgrade for unlimited access!";
      }
    }
    
    if (remaining <= 2) {
      return `Only ${remaining} remaining! Consider upgrading.`;
    }
    
    return `${remaining} remaining`;
  };

  const warningColor = getWarningColor();
  const isNearLimit = usageData.percentage >= 80;
  const isAtLimit = usageData.percentage >= 100;

  return (
    <View style={[styles.container, { borderColor: warningColor }, style]}>
      <View style={styles.content}>
        {/* Icon and Feature Name */}
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${warningColor}20` }]}>
            <Ionicons 
              name={isAtLimit ? "alert-circle" : "stats-chart"} 
              size={16} 
              color={warningColor} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.featureName, { color: warningColor }]}>
              {getFeatureDisplayName()}
            </Text>
            <Text style={styles.usageText}>
              {usageData.current} of {usageData.limit} used
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: `${warningColor}20` }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(usageData.percentage, 100)}%`,
                  backgroundColor: warningColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.percentageText, { color: warningColor }]}>
            {Math.round(usageData.percentage)}%
          </Text>
        </View>
      </View>

      {/* Warning Message */}
      {isNearLimit && (
        <View style={styles.warningSection}>
          <Text style={[styles.warningText, { color: warningColor }]}>
            {getMilitaryWarning()}
          </Text>
          
          {onUpgradePress && isAtLimit && (
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: warningColor }]}
              onPress={onUpgradePress}
            >
              <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>UPGRADE</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    padding: theme.spacing[3],
    backgroundColor: `${theme.colors.MILITARY_GREEN}10`,
  },
  premiumContainer: {
    backgroundColor: `${theme.colors.SUCCESS}10`,
  },
  content: {
    gap: theme.spacing[3],
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  textContainer: {
    flex: 1,
  },
  featureName: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing[1],
  },
  usageText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  unlimitedText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    minWidth: 35,
    textAlign: 'right',
  },
  warningSection: {
    marginTop: theme.spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[2],
  },
  warningText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    flex: 1,
    fontStyle: 'italic',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing[1],
  },
  upgradeButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
});