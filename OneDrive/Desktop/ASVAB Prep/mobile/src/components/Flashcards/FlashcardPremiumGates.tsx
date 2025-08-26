import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionTier } from '@asvab-prep/shared';
import { useBranchTheme } from '../../hooks/useBranchTheme';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';

interface FlashcardPremiumGateProps {
  children: React.ReactNode;
  feature: 
    | 'unlimited-flashcards'
    | 'unlimited-decks' 
    | 'advanced-analytics'
    | 'ai-generation'
    | 'export-import'
    | 'collaboration'
    | 'explanations'
    | 'spaced-repetition-insights'
    | 'offline-sync';
  fallbackLimit?: number;
  currentUsage?: number;
  showUpgradeModal?: boolean;
  onCloseModal?: () => void;
}

export const FlashcardPremiumGate: React.FC<FlashcardPremiumGateProps> = ({
  children,
  feature,
  fallbackLimit,
  currentUsage = 0,
  showUpgradeModal = false,
  onCloseModal,
}) => {
  const { user } = useAuth();
  const { colors } = useBranchTheme();
  const { subscription, upgradeSubscription } = useSubscription();

  const isPremium = subscription?.tier === SubscriptionTier.PREMIUM;

  const featureConfig = {
    'unlimited-flashcards': {
      title: 'Unlimited Flashcards',
      description: 'Create unlimited flashcards across all your decks',
      icon: 'library',
      freeLimit: 50,
      premiumFeatures: [
        'Unlimited flashcard creation',
        'Advanced flashcard types',
        'Rich text formatting',
        'Image attachments',
      ],
    },
    'unlimited-decks': {
      title: 'Unlimited Decks',
      description: 'Organize your flashcards into unlimited decks',
      icon: 'folder',
      freeLimit: 3,
      premiumFeatures: [
        'Unlimited deck creation',
        'Custom deck themes',
        'Deck sharing and collaboration',
        'Advanced organization',
      ],
    },
    'advanced-analytics': {
      title: 'Advanced Analytics',
      description: 'Detailed insights into your study performance',
      icon: 'analytics',
      freeLimit: 0,
      premiumFeatures: [
        'Detailed performance metrics',
        'Study time tracking',
        'Retention rate analysis',
        'Progress predictions',
      ],
    },
    'ai-generation': {
      title: 'AI Flashcard Generation',
      description: 'Generate flashcards automatically using AI',
      icon: 'bulb',
      freeLimit: 0,
      premiumFeatures: [
        'AI-powered card generation',
        'Smart content extraction',
        'Automatic difficulty adjustment',
        'Context-aware suggestions',
      ],
    },
    'export-import': {
      title: 'Export & Import',
      description: 'Export and import your flashcard collections',
      icon: 'cloud',
      freeLimit: 0,
      premiumFeatures: [
        'Export to PDF, CSV, JSON',
        'Import from other platforms',
        'Bulk operations',
        'Backup and restore',
      ],
    },
    'collaboration': {
      title: 'Collaboration Features',
      description: 'Share and collaborate on flashcard decks',
      icon: 'people',
      freeLimit: 0,
      premiumFeatures: [
        'Share decks with team members',
        'Collaborative editing',
        'Study group integration',
        'Public deck marketplace',
      ],
    },
    'explanations': {
      title: 'Detailed Explanations',
      description: 'Add comprehensive explanations to your flashcards',
      icon: 'information-circle',
      freeLimit: 0,
      premiumFeatures: [
        'Rich text explanations',
        'Image and diagram support',
        'Video explanations',
        'Reference links',
      ],
    },
    'spaced-repetition-insights': {
      title: 'Spaced Repetition Insights',
      description: 'Advanced insights into your spaced repetition performance',
      icon: 'trending-up',
      freeLimit: 0,
      premiumFeatures: [
        'Optimal study scheduling',
        'Retention predictions',
        'Difficulty adjustments',
        'Performance optimization',
      ],
    },
    'offline-sync': {
      title: 'Offline Sync',
      description: 'Study offline and sync when connected',
      icon: 'cloud-offline',
      freeLimit: 0,
      premiumFeatures: [
        'Full offline functionality',
        'Automatic sync',
        'Conflict resolution',
        'Offline progress tracking',
      ],
    },
  };

  const config = featureConfig[feature];
  const hasAccess = isPremium || (fallbackLimit && currentUsage < fallbackLimit);
  const isAtLimit = fallbackLimit && currentUsage >= fallbackLimit;

  if (hasAccess && !isAtLimit) {
    return <>{children}</>;
  }

  // Show fallback content for free users who haven't hit limits
  if (fallbackLimit && currentUsage < fallbackLimit) {
    return (
      <View>
        {children}
        <View style={[styles.limitWarning, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={[styles.limitText, { color: colors.warning }]}>
            {fallbackLimit - currentUsage} remaining (Premium: Unlimited)
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.blockedContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <LinearGradient
          colors={[colors.premium + '10', colors.accent + '10']}
          style={styles.blockedGradient}
        >
          <Ionicons name={config.icon as any} size={32} color={colors.premium} />
          <Text style={[styles.blockedTitle, { color: colors.text }]}>
            {config.title}
          </Text>
          <Text style={[styles.blockedDescription, { color: colors.textSecondary }]}>
            {config.description}
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.premium }]}
            onPress={upgradeSubscription}
          >
            <Ionicons name="crown" size={16} color="white" />
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {showUpgradeModal && (
        <FlashcardPremiumModal
          visible={showUpgradeModal}
          feature={feature}
          onClose={onCloseModal}
          onUpgrade={upgradeSubscription}
        />
      )}
    </>
  );
};

interface FlashcardPremiumModalProps {
  visible: boolean;
  feature: string;
  onClose?: () => void;
  onUpgrade?: () => void;
}

const FlashcardPremiumModal: React.FC<FlashcardPremiumModalProps> = ({
  visible,
  feature,
  onClose,
  onUpgrade,
}) => {
  const { colors, getMilitaryGreeting } = useBranchTheme();
  const { user } = useAuth();

  const getBranchTitle = (branch?: string): string => {
    const titles = {
      ARMY: 'Soldier',
      NAVY: 'Sailor', 
      AIR_FORCE: 'Airman',
      MARINES: 'Marine',
      COAST_GUARD: 'Coastie',
      SPACE_FORCE: 'Guardian',
    };
    return titles[branch as keyof typeof titles] || 'Soldier';
  };

  const premiumFeatures = [
    {
      title: 'Unlimited Flashcards & Decks',
      description: 'Create unlimited flashcards and organize them into unlimited decks',
      icon: 'library',
    },
    {
      title: 'Advanced Spaced Repetition',
      description: 'AI-optimized study scheduling for maximum retention',
      icon: 'brain',
    },
    {
      title: 'AI-Powered Generation',
      description: 'Generate flashcards automatically from your study materials',
      icon: 'bulb',
    },
    {
      title: 'Advanced Analytics',
      description: 'Detailed performance insights and study optimization',
      icon: 'analytics',
    },
    {
      title: 'Export & Import',
      description: 'Backup and share your flashcard collections',
      icon: 'cloud',
    },
    {
      title: 'Offline Study',
      description: 'Study anywhere, even without internet connection',
      icon: 'cloud-offline',
    },
    {
      title: 'Collaboration Tools',
      description: 'Share decks and study with team members',
      icon: 'people',
    },
    {
      title: 'Premium Support',
      description: 'Priority customer support and feature requests',
      icon: 'headset',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.modalHeader}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.modalHeaderContent}>
            <Ionicons name="crown" size={48} color="white" />
            <Text style={styles.modalTitle}>
              Upgrade to Premium
            </Text>
            <Text style={styles.modalSubtitle}>
              Unlock advanced flashcard features, {getBranchTitle(user?.selectedBranch)}!
            </Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.featuresContainer}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={[styles.featureItem, { backgroundColor: colors.surface }]}>
                <LinearGradient
                  colors={[colors.primary + '10', colors.accent + '10']}
                  style={styles.featureGradient}
                >
                  <Ionicons name={feature.icon as any} size={24} color={colors.primary} />
                  <View style={styles.featureContent}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>
                      {feature.title}
                    </Text>
                    <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                      {feature.description}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>

          <View style={[styles.pricingCard, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[colors.premium + '20', colors.accent + '20']}
              style={styles.pricingGradient}
            >
              <Text style={[styles.pricingTitle, { color: colors.text }]}>
                Premium Subscription
              </Text>
              <View style={styles.pricingDetails}>
                <Text style={[styles.price, { color: colors.premium }]}>
                  $9.97<Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>/month</Text>
                </Text>
                <Text style={[styles.trialText, { color: colors.success }]}>
                  7-day free trial
                </Text>
              </View>
              <Text style={[styles.pricingDescription, { color: colors.textSecondary }]}>
                Cancel anytime. No commitment required.
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>

        <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.upgradeButtonLarge, { backgroundColor: colors.premium }]}
            onPress={onUpgrade}
          >
            <LinearGradient
              colors={[colors.premium, colors.accent]}
              style={styles.upgradeButtonGradient}
            >
              <Ionicons name="crown" size={20} color="white" />
              <Text style={styles.upgradeButtonLargeText}>
                Start Free Trial
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  blockedContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 10,
  },
  blockedGradient: {
    padding: 20,
    alignItems: 'center',
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  blockedDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  modalHeaderContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featureItem: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  featureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  pricingCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  pricingGradient: {
    padding: 20,
    alignItems: 'center',
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  pricingDetails: {
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
  },
  pricePeriod: {
    fontSize: 18,
    fontWeight: '400',
  },
  trialText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  pricingDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  upgradeButtonLarge: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  upgradeButtonLargeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});