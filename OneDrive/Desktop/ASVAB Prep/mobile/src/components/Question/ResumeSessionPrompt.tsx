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
import { MilitaryBranch, CATEGORY_DISPLAY_NAMES } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { QuestionSession } from '@/services/questionsService';

interface ResumeSessionPromptProps {
  visible: boolean;
  session: QuestionSession;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  onResume: () => void;
  onStartNew: () => void;
  onCancel: () => void;
  branch: MilitaryBranch;
  isLoading?: boolean;
}

const { width } = Dimensions.get('window');

export const ResumeSessionPrompt: React.FC<ResumeSessionPromptProps> = ({
  visible,
  session,
  progress,
  onResume,
  onStartNew,
  onCancel,
  branch,
  isLoading = false,
}) => {
  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getCategoryDisplay = (category?: string) => {
    if (!category) return 'Mixed Categories';
    return CATEGORY_DISPLAY_NAMES[category as keyof typeof CATEGORY_DISPLAY_NAMES] || category;
  };

  const branchColor = theme.branchColors[branch];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <MilitaryCard variant="command" branch={branch} style={styles.card}>
            <MilitaryCardHeader
              title="RESUME SESSION?"
              subtitle="You have an unfinished question session"
              variant="command"
            />
            
            <MilitaryCardContent>
              <View style={styles.sessionInfo}>
                <View style={styles.iconContainer}>
                  <View style={[styles.iconBackground, { backgroundColor: `${branchColor}20` }]}>
                    <Ionicons
                      name="book-outline"
                      size={32}
                      color={branchColor}
                    />
                  </View>
                </View>

                <View style={styles.sessionDetails}>
                  <Text style={styles.sessionType}>
                    {session.sessionType?.toUpperCase() || 'PRACTICE SESSION'}
                  </Text>
                  
                  <Text style={styles.categoryText}>
                    {getCategoryDisplay(session.category)}
                  </Text>
                  
                  <Text style={styles.timeText}>
                    Started {formatDuration(session.startedAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>PROGRESS</Text>
                  <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
                </View>
                
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${progress.percentage}%`,
                        backgroundColor: branchColor,
                      },
                    ]} 
                  />
                </View>
                
                <View style={styles.progressStats}>
                  <Text style={styles.progressText}>
                    {progress.completed} of {progress.total} questions completed
                  </Text>
                  <Text style={styles.remainingText}>
                    {progress.total - progress.completed} remaining
                  </Text>
                </View>
              </View>

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>RESUME BENEFITS:</Text>
                <View style={styles.benefitsList}>
                  <BenefitItem text="Keep your current progress" />
                  <BenefitItem text="Continue where you left off" />
                  <BenefitItem text="Maintain your study streak" />
                  <BenefitItem text="Save time on category selection" />
                </View>
              </View>

              <View style={styles.buttonsContainer}>
                <MilitaryButton
                  title="Resume Session"
                  onPress={onResume}
                  variant="primary"
                  branch={branch}
                  loading={isLoading}
                  style={styles.resumeButton}
                />
                
                <MilitaryButton
                  title="Start New Session"
                  onPress={onStartNew}
                  variant="secondary"
                  disabled={isLoading}
                  style={styles.newButton}
                />
                
                <MilitaryButton
                  title="Cancel"
                  onPress={onCancel}
                  variant="secondary"
                  disabled={isLoading}
                  style={styles.cancelButton}
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
      name="checkmark"
      size={14}
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
    width: Math.min(width - theme.spacing[8], 380),
  },
  card: {
    margin: 0,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
    padding: theme.spacing[4],
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}10`,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.TACTICAL_ORANGE,
  },
  iconContainer: {
    marginRight: theme.spacing[4],
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDetails: {
    flex: 1,
  },
  sessionType: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing[1],
  },
  categoryText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[1],
  },
  timeText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
  },
  progressContainer: {
    marginBottom: theme.spacing[6],
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
    fontSize: theme.fontSizes.lg,
    color: theme.colors.TACTICAL_ORANGE,
  },
  progressBar: {
    height: 8,
    backgroundColor: `${theme.colors.KHAKI}20`,
    borderRadius: 4,
    marginBottom: theme.spacing[2],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
  },
  remainingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  benefitsContainer: {
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
  },
  buttonsContainer: {
    gap: theme.spacing[3],
  },
  resumeButton: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
  },
  newButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.KHAKI,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.textLight,
  },
});