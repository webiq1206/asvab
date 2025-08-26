import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryButton } from '../UI/MilitaryButton';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface QuestionLimitNoticeProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  remainingQuestions: number;
  branch: MilitaryBranch;
  limitType: 'questions' | 'daily_quiz';
}

const { width, height } = Dimensions.get('window');

export const QuestionLimitNotice: React.FC<QuestionLimitNoticeProps> = ({
  visible,
  onClose,
  onUpgrade,
  remainingQuestions,
  branch,
  limitType,
}) => {
  const getNoticeContent = () => {
    switch (limitType) {
      case 'questions':
        return {
          title: 'QUESTION LIMIT REACHED',
          icon: 'warning' as const,
          message: `You've reached your free tier limit of 50 questions. You have ${remainingQuestions} questions remaining.`,
          upgradeText: 'Upgrade to Premium for unlimited questions and advanced features.',
        };
      case 'daily_quiz':
        return {
          title: 'DAILY QUIZ LIMIT REACHED',
          icon: 'time' as const,
          message: 'You\'ve completed your daily quiz limit for the free tier (1 quiz per day).',
          upgradeText: 'Upgrade to Premium for unlimited daily quizzes and full ASVAB replica exams.',
        };
      default:
        return {
          title: 'LIMIT REACHED',
          icon: 'warning' as const,
          message: 'You\'ve reached your free tier limit.',
          upgradeText: 'Upgrade to Premium for unlimited access.',
        };
    }
  };

  const content = getNoticeContent();
  const branchColor = theme.branchColors[branch];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <MilitaryCard variant="command" branch={branch} style={styles.card}>
            <MilitaryCardHeader
              title={content.title}
              subtitle="Premium upgrade required"
              variant="command"
            />
            
            <MilitaryCardContent>
              <View style={styles.iconContainer}>
                <View style={[styles.iconBackground, { backgroundColor: `${branchColor}20` }]}>
                  <Ionicons
                    name={content.icon}
                    size={48}
                    color={branchColor}
                  />
                </View>
              </View>

              <Text style={styles.message}>
                {content.message}
              </Text>

              <View style={styles.premiumBenefits}>
                <Text style={styles.benefitsTitle}>PREMIUM BENEFITS:</Text>
                <View style={styles.benefitsList}>
                  <BenefitItem text="Unlimited questions & quizzes" />
                  <BenefitItem text="Full ASVAB replica exam (2h 29min)" />
                  <BenefitItem text="Digital whiteboard/scratch paper" />
                  <BenefitItem text="Premium explanations with military context" />
                  <BenefitItem text="Military jobs database" />
                  <BenefitItem text="AI coaching & daily missions" />
                </View>
              </View>

              <View style={styles.trialNotice}>
                <Text style={styles.trialText}>
                  🎯 Start your <Text style={styles.trialHighlight}>7-day FREE trial</Text> now!
                </Text>
                <Text style={styles.priceText}>
                  Only $9.97/month after trial
                </Text>
              </View>

              <View style={styles.buttonsContainer}>
                <MilitaryButton
                  title="Upgrade to Premium"
                  onPress={onUpgrade}
                  variant="primary"
                  branch={branch}
                  style={styles.upgradeButton}
                />
                
                <MilitaryButton
                  title="Continue with Limits"
                  onPress={onClose}
                  variant="secondary"
                  style={styles.continueButton}
                />
              </View>
            </MilitaryCardContent>
          </MilitaryCard>
        </View>
      </View>
    </Modal>
  );
};

const BenefitItem: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.benefitItem}>
    <Ionicons
      name="checkmark-circle"
      size={16}
      color={theme.colors.SUCCESS}
      style={styles.benefitIcon}
    />
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  modalContainer: {
    width: Math.min(width - theme.spacing[8], 400),
    maxHeight: height * 0.8,
  },
  card: {
    margin: 0,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing[6],
  },
  premiumBenefits: {
    marginBottom: theme.spacing[6],
  },
  benefitsTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.TACTICAL_ORANGE,
    marginBottom: theme.spacing[3],
  },
  benefitsList: {
    marginLeft: theme.spacing[2],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  benefitIcon: {
    marginRight: theme.spacing[2],
  },
  benefitText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 18,
  },
  trialNotice: {
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}20`,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.TACTICAL_ORANGE,
    marginBottom: theme.spacing[6],
    alignItems: 'center',
  },
  trialText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing[1],
  },
  trialHighlight: {
    color: theme.colors.TACTICAL_ORANGE,
  },
  priceText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  buttonsContainer: {
    gap: theme.spacing[3],
  },
  upgradeButton: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
  },
  continueButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.KHAKI,
  },
});