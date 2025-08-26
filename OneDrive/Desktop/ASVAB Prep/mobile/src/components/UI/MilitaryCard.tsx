import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';

interface MilitaryCardProps {
  children: React.ReactNode;
  variant?: 'standard' | 'command';
  branch?: MilitaryBranch;
  onPress?: () => void;
  style?: ViewStyle;
}

export const MilitaryCard: React.FC<MilitaryCardProps> = ({
  children,
  variant = 'standard',
  branch,
  onPress,
  style,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle = styles.card;
    const variantStyle = variant === 'command' ? styles.commandCard : styles.standardCard;
    
    let branchAccent = {};
    if (branch && variant === 'command') {
      branchAccent = {
        backgroundColor: theme.colors.DARK_OLIVE,
        borderColor: theme.branchColors[branch],
      };
    }

    return {
      ...baseStyle,
      ...variantStyle,
      ...branchAccent,
    };
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[getCardStyle(), style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
    >
      {variant === 'command' && branch && (
        <View
          style={[
            styles.commandStripe,
            { backgroundColor: theme.branchColors[branch] },
          ]}
        />
      )}
      {children}
    </CardComponent>
  );
};

interface MilitaryCardHeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'standard' | 'command';
}

export const MilitaryCardHeader: React.FC<MilitaryCardHeaderProps> = ({
  title,
  subtitle,
  variant = 'standard',
}) => {
  return (
    <View style={styles.header}>
      <Text
        style={[
          styles.headerTitle,
          variant === 'command' && styles.commandHeaderTitle,
        ]}
      >
        {title.toUpperCase()}
      </Text>
      {subtitle && (
        <Text
          style={[
            styles.headerSubtitle,
            variant === 'command' && styles.commandHeaderSubtitle,
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

interface MilitaryCardContentProps {
  children: React.ReactNode;
  variant?: 'standard' | 'command';
}

export const MilitaryCardContent: React.FC<MilitaryCardContentProps> = ({
  children,
  variant = 'standard',
}) => {
  return (
    <View style={styles.content}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
    overflow: 'hidden',
  },
  
  standardCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.base,
    padding: theme.spacing[6],
  },
  
  commandCard: {
    backgroundColor: theme.colors.DARK_OLIVE,
    borderWidth: 2,
    borderColor: theme.colors.MILITARY_GREEN,
    position: 'relative',
    padding: theme.spacing[6],
  },
  
  commandStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  
  header: {
    marginBottom: theme.spacing[4],
  },
  
  headerTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  
  commandHeaderTitle: {
    color: '#FFFFFF',
  },
  
  headerSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  
  commandHeaderSubtitle: {
    color: theme.colors.KHAKI,
  },
  
  content: {
    flex: 1,
  },
});