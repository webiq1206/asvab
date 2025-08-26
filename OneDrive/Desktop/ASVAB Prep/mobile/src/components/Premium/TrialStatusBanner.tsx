import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { purchaseService } from '@/services/purchaseService';

interface TrialStatusBannerProps {
  onUpgradePress: () => void;
  branch?: MilitaryBranch;
  style?: any;
}

export const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  onUpgradePress,
  branch,
  style,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [trialInfo, setTrialInfo] = useState<{
    hasTrialAvailable: boolean;
    trialDaysLeft?: number;
  }>({ hasTrialAvailable: true });
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrialStatus();
  }, []);

  const loadTrialStatus = async () => {
    try {
      setLoading(true);
      const [trialStatus, subStatus] = await Promise.all([
        purchaseService.getTrialInfo(),
        purchaseService.getSubscriptionStatus(),
      ]);
      
      setTrialInfo(trialStatus);
      setSubscriptionStatus(subStatus);
    } catch (error) {
      console.error('Failed to load trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Don't show banner while loading
  }

  // Don't show banner if user has premium access
  if (subscriptionStatus?.isActive && !subscriptionStatus?.isInTrial) {
    return null;
  }

  const getMilitaryMessage = (): string => {
    if (subscriptionStatus?.isInTrial && trialInfo.trialDaysLeft !== undefined) {
      const days = trialInfo.trialDaysLeft;
      if (days === 0) {
        switch (userBranch) {
          case MilitaryBranch.ARMY:
            return "Trial ends today, Soldier! Secure your premium access now!";
          case MilitaryBranch.NAVY:
            return "Trial ends today, Sailor! Don't let your ship sail without premium features!";
          case MilitaryBranch.AIR_FORCE:
            return "Trial ends today, Airman! Maintain flight status with premium access!";
          case MilitaryBranch.MARINES:
            return "Trial ends today, Marine! Stay mission-ready with premium features!";
          case MilitaryBranch.COAST_GUARD:
            return "Trial ends today, Coastie! Stay always ready with premium access!";
          case MilitaryBranch.SPACE_FORCE:
            return "Trial ends today, Guardian! Continue your stellar journey with premium!";
          default:
            return "Trial ends today! Upgrade to continue premium access!";
        }
      } else {
        switch (userBranch) {
          case MilitaryBranch.ARMY:
            return `${days} days left in your trial, Soldier! Enjoying the premium features?`;
          case MilitaryBranch.NAVY:
            return `${days} days left in your trial, Sailor! Smooth sailing with premium access!`;
          case MilitaryBranch.AIR_FORCE:
            return `${days} days left in your trial, Airman! Flying high with premium features!`;
          case MilitaryBranch.MARINES:
            return `${days} days left in your trial, Marine! Premium features keeping you sharp!`;
          case MilitaryBranch.COAST_GUARD:
            return `${days} days left in your trial, Coastie! Premium features keeping you ready!`;
          case MilitaryBranch.SPACE_FORCE:
            return `${days} days left in your trial, Guardian! Exploring premium possibilities!`;
          default:
            return `${days} days left in your trial! Enjoying premium features?`;
        }
      }
    }

    // Trial available message
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "7-day free trial available, Soldier! Test premium training features!";
      case MilitaryBranch.NAVY:
        return "7-day free trial available, Sailor! Navigate premium training waters!";
      case MilitaryBranch.AIR_FORCE:
        return "7-day free trial available, Airman! Take premium features for a test flight!";
      case MilitaryBranch.MARINES:
        return "7-day free trial available, Marine! Experience premium tactical advantage!";
      case MilitaryBranch.COAST_GUARD:
        return "7-day free trial available, Coastie! Explore premium readiness features!";
      case MilitaryBranch.SPACE_FORCE:
        return "7-day free trial available, Guardian! Discover premium stellar features!";
      default:
        return "7-day free trial available! Experience premium features risk-free!";
    }
  };

  const getButtonText = (): string => {
    if (subscriptionStatus?.isInTrial) {
      if (trialInfo.trialDaysLeft === 0) {
        return 'UPGRADE NOW';
      }
      return 'UPGRADE TO PREMIUM';
    }
    return 'START FREE TRIAL';
  };

  const getIconName = (): string => {
    if (subscriptionStatus?.isInTrial) {
      if (trialInfo.trialDaysLeft === 0) {
        return 'alert-circle';
      }
      return 'time';
    }
    return 'gift';
  };

  const getBannerColor = (): string => {
    if (subscriptionStatus?.isInTrial && trialInfo.trialDaysLeft === 0) {
      return theme.colors.DANGER;
    }
    if (subscriptionStatus?.isInTrial) {
      return theme.colors.TACTICAL_ORANGE;
    }
    return theme.colors.SUCCESS;
  };

  const bannerColor = getBannerColor();

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: `${bannerColor}15`, borderColor: bannerColor }, style]}
      onPress={onUpgradePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${bannerColor}30` }]}>
            <Ionicons name={getIconName()} size={20} color={bannerColor} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: bannerColor }]}>
              {subscriptionStatus?.isInTrial ? 'TRIAL ACTIVE' : 'FREE TRIAL AVAILABLE'}
            </Text>
            <Text style={styles.message}>
              {getMilitaryMessage()}
            </Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={[styles.actionButton, { backgroundColor: bannerColor }]}>
            <Text style={styles.actionButtonText}>
              {getButtonText()}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* Progress bar for active trial */}
      {subscriptionStatus?.isInTrial && trialInfo.trialDaysLeft !== undefined && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: `${bannerColor}20` }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((7 - trialInfo.trialDaysLeft) / 7) * 100}%`,
                  backgroundColor: bannerColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: bannerColor }]}>
            Day {7 - trialInfo.trialDaysLeft} of 7
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    padding: theme.spacing[4],
    marginVertical: theme.spacing[2],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginBottom: theme.spacing[1],
  },
  message: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    lineHeight: 18,
  },
  rightContent: {
    marginLeft: theme.spacing[3],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing[1],
  },
  actionButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  progressContainer: {
    marginTop: theme.spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
  },
});