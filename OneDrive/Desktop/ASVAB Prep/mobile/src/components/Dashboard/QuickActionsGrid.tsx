import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface QuickActionsGridProps {
  branch: MilitaryBranch;
  onActionPress: (action: string) => void;
}

const { width } = Dimensions.get('window');
const gridWidth = width - (theme.spacing[4] * 2);
const itemWidth = (gridWidth - theme.spacing[3]) / 2;

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  isPremium?: boolean;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  branch,
  onActionPress,
}) => {
  const branchColor = theme.branchColors[branch];

  const quickActions: QuickAction[] = [
    {
      id: 'practice',
      title: 'Practice Test',
      subtitle: 'Start training',
      icon: 'rocket',
      color: theme.colors.TACTICAL_ORANGE,
    },
    {
      id: 'asvab',
      title: 'ASVAB Replica',
      subtitle: 'Full exam',
      icon: 'star',
      color: theme.colors.SUCCESS,
      isPremium: true,
    },
    {
      id: 'ai-coaching',
      title: 'AI Coaching',
      subtitle: 'Personal trainer',
      icon: 'bulb',
      color: theme.colors.INFO,
      isPremium: true,
    },
    {
      id: 'flashcards',
      title: 'Flashcards',
      subtitle: 'Quick review',
      icon: 'duplicate',
      color: theme.colors.WARNING,
      isPremium: true,
    },
    {
      id: 'gamification',
      title: 'Achievements',
      subtitle: 'Earn rewards',
      icon: 'trophy',
      color: theme.colors.TACTICAL_ORANGE,
      isPremium: true,
    },
    {
      id: 'progress',
      title: 'Analytics',
      subtitle: 'View insights',
      icon: 'stats-chart',
      color: theme.colors.INFO,
      isPremium: true,
    },
    {
      id: 'fitness',
      title: 'PT Standards',
      subtitle: 'Physical fitness',
      icon: 'fitness',
      color: branchColor,
      isPremium: true,
    },
    {
      id: 'meps',
      title: 'MEPS Prep',
      subtitle: 'Get ready',
      icon: 'medical',
      color: theme.colors.SUCCESS,
      isPremium: true,
    },
  ];

  const renderActionButton = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={[
        styles.actionButton,
        {
          width: itemWidth,
          backgroundColor: `${action.color}20`,
          borderColor: action.color,
        },
      ]}
      onPress={() => onActionPress(action.id)}
      activeOpacity={0.8}
    >
      {/* Premium Badge */}
      {action.isPremium && (
        <View style={styles.premiumBadge}>
          <Ionicons name="star" size={10} color="#FFFFFF" />
        </View>
      )}

      {/* Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: `${action.color}30` }]}>
        <Ionicons name={action.icon} size={28} color={action.color} />
      </View>

      {/* Action Details */}
      <View style={styles.actionDetails}>
        <Text style={[styles.actionTitle, { color: action.color }]}>
          {action.title}
        </Text>
        <Text style={styles.actionSubtitle}>
          {action.subtitle}
        </Text>
      </View>

      {/* Arrow Indicator */}
      <View style={styles.arrowContainer}>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={action.color}
        />
      </View>

      {/* Glow Effect */}
      <View
        style={[
          styles.glowEffect,
          {
            backgroundColor: action.color,
            shadowColor: action.color,
          },
        ]}
      />
    </TouchableOpacity>
  );

  return (
    <MilitaryCard variant="command" branch={branch} style={styles.card}>
      <MilitaryCardHeader
        title="QUICK ACTIONS"
        subtitle="Mission-critical operations"
        variant="command"
      />

      <MilitaryCardContent>
        <View style={styles.grid}>
          {quickActions.map(renderActionButton)}
        </View>

        {/* Military Command Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            SELECT YOUR MISSION OBJECTIVE
          </Text>
          <View style={styles.footerLine} />
        </View>
      </MilitaryCardContent>
    </MilitaryCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  actionButton: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    position: 'relative',
    minHeight: 120,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  premiumBadge: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionDetails: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: theme.spacing[2],
  },
  actionTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    marginBottom: theme.spacing[1],
  },
  actionSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  arrowContainer: {
    alignSelf: 'flex-end',
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    borderRadius: theme.borderRadius.base,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.KHAKI,
    opacity: 0.3,
  },
  footerText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginHorizontal: theme.spacing[3],
    letterSpacing: 1,
  },
});