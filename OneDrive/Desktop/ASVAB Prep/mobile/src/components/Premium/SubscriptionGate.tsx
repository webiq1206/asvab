import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

interface SubscriptionGateProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
  featureTitle: string;
  featureDescription: string;
  isTrialAvailable?: boolean;
  trialDaysLeft?: number;
  branch?: MilitaryBranch;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  visible,
  onClose,
  onUpgrade,
  feature,
  featureTitle,
  featureDescription,
  isTrialAvailable = true,
  trialDaysLeft,
  branch,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const getMilitaryMessage = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "This feature is classified, Soldier! Upgrade your clearance level to access premium intel. Hooah!";
      case MilitaryBranch.NAVY:
        return "This feature is restricted, Sailor! Upgrade to access ship-level operations. Hooyah!";
      case MilitaryBranch.AIR_FORCE:
        return "This feature requires higher clearance, Airman! Upgrade for mission-critical access. Hoorah!";
      case MilitaryBranch.MARINES:
        return "This feature is above your pay grade, Marine! Upgrade for full tactical access. Oorah!";
      case MilitaryBranch.COAST_GUARD:
        return "This feature needs command authorization, Coastie! Upgrade for operational access. Hooyah!";
      case MilitaryBranch.SPACE_FORCE:
        return "This feature requires space-level clearance, Guardian! Upgrade for stellar access. Hoorah!";
      default:
        return "This feature requires premium access! Upgrade to unlock all capabilities.";
    }
  };

  const getPremiumFeatures = () => [
    'Unlimited questions and quizzes',
    'Full ASVAB replica exam (2h 29min)',
    'Digital whiteboard/scratch paper',
    'Flashcards with spaced repetition',
    'Military jobs database',
    'Physical fitness tracking',
    'AI coaching and daily missions',
    'Social features and study groups',
    'Advanced progress analytics',
    'Export progress reports',
    'Daily intelligent notifications',
  ];

  const getActionButtonText = (): string => {
    if (isTrialAvailable) {
      return 'START 7-DAY FREE TRIAL';
    }
    if (trialDaysLeft && trialDaysLeft > 0) {
      return `CONTINUE TRIAL (${trialDaysLeft} days left)`;
    }
    return 'UPGRADE TO PREMIUM';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.DARK_OLIVE }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: branchColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={[styles.lockIcon, { backgroundColor: `${branchColor}20` }]}>
              <Ionicons name="lock-closed" size={32} color={branchColor} />
            </View>
            <Text style={[styles.headerTitle, { color: branchColor }]}>
              PREMIUM FEATURE
            </Text>
            <Text style={styles.headerSubtitle}>
              CLASSIFIED ACCESS REQUIRED
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Feature Info */}
          <View style={[styles.featureSection, { borderColor: `${branchColor}40` }]}>
            <Text style={[styles.featureTitle, { color: branchColor }]}>
              {featureTitle}
            </Text>
            <Text style={styles.featureDescription}>
              {featureDescription}
            </Text>
          </View>

          {/* Military Message */}
          <View style={[styles.messageSection, { backgroundColor: `${branchColor}10` }]}>
            <View style={styles.messageHeader}>
              <Ionicons name="shield-checkmark" size={20} color={branchColor} />
              <Text style={[styles.messageTitle, { color: branchColor }]}>
                SECURITY CLEARANCE REQUIRED
              </Text>
            </View>
            <Text style={styles.messageText}>
              {getMilitaryMessage()}
            </Text>
          </View>

          {/* Premium Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>
              PREMIUM MISSION CAPABILITIES
            </Text>
            <View style={styles.featuresList}>
              {getPremiumFeatures().map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.SUCCESS} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Trial Info */}
          {isTrialAvailable && (
            <View style={[styles.trialSection, { backgroundColor: `${theme.colors.TACTICAL_ORANGE}20` }]}>
              <View style={styles.trialHeader}>
                <Ionicons name="gift" size={20} color={theme.colors.TACTICAL_ORANGE} />
                <Text style={[styles.trialTitle, { color: theme.colors.TACTICAL_ORANGE }]}>
                  FREE TRIAL AVAILABLE
                </Text>
              </View>
              <Text style={styles.trialText}>
                Start your 7-day free trial and experience all premium features at no cost. 
                Cancel anytime during the trial period.
              </Text>
            </View>
          )}

          {/* Pricing */}
          <View style={[styles.pricingSection, { borderColor: branchColor }]}>
            <Text style={styles.pricingTitle}>PREMIUM ACCESS</Text>
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: branchColor }]}>$9.97</Text>
              <Text style={styles.pricePeriod}>/month</Text>
            </View>
            {isTrialAvailable && (
              <Text style={styles.trialNote}>
                7-day free trial • Cancel anytime
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: branchColor }]}
            onPress={onUpgrade}
          >
            <Ionicons name="star" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>
              {getActionButtonText()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure payment • Cancel anytime • App Store & Google Play
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 2,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: theme.spacing[4],
    zIndex: 2,
    padding: theme.spacing[2],
  },
  headerContent: {
    alignItems: 'center',
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  headerTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    marginBottom: theme.spacing[1],
  },
  headerSubtitle: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  featureSection: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    marginBottom: theme.spacing[4],
  },
  featureTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    marginBottom: theme.spacing[2],
  },
  featureDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    lineHeight: 22,
  },
  messageSection: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing[4],
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  messageTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginLeft: theme.spacing[2],
  },
  messageText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  featuresSection: {
    marginBottom: theme.spacing[4],
  },
  featuresTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    marginBottom: theme.spacing[3],
    textAlign: 'center',
  },
  featuresList: {
    gap: theme.spacing[2],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[2],
    flex: 1,
  },
  trialSection: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing[4],
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  trialTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    marginLeft: theme.spacing[2],
  },
  trialText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    lineHeight: 18,
  },
  pricingSection: {
    alignItems: 'center',
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    marginBottom: theme.spacing[4],
  },
  pricingTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[2],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing[2],
  },
  price: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xxl,
  },
  pricePeriod: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[1],
  },
  trialNote: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  actions: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  upgradeButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
  },
  cancelButtonText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
  },
  footer: {
    alignItems: 'center',
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  footerText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    opacity: 0.8,
  },
});