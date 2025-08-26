import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';

interface MilitaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'base' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  branch?: MilitaryBranch;
  style?: ViewStyle;
}

export const MilitaryButton: React.FC<MilitaryButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'base',
  disabled = false,
  loading = false,
  branch,
  style,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`${size}Button`];
    const variantStyle = styles[`${variant}Button`];
    
    let branchAccent = {};
    if (branch && variant === 'primary') {
      branchAccent = {
        backgroundColor: theme.branchColors[branch],
      };
    }

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...branchAccent,
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = styles.buttonText;
    const sizeStyle = styles[`${size}ButtonText`];
    const variantStyle = styles[`${variant}ButtonText`];

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? theme.colors.DARK_OLIVE : '#FFFFFF'}
          size="small"
        />
      ) : (
        <Text style={getTextStyle()}>{title.toUpperCase()}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.base,
  },
  buttonText: {
    fontFamily: theme.fonts.military.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  
  // Primary variant
  primaryButton: {
    backgroundColor: theme.colors.MILITARY_GREEN,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  
  // Secondary variant
  secondaryButton: {
    backgroundColor: theme.colors.DESERT_SAND,
    borderWidth: 2,
    borderColor: theme.colors.MILITARY_GREEN,
  },
  secondaryButtonText: {
    color: theme.colors.DARK_OLIVE,
  },
  
  // Danger variant
  dangerButton: {
    backgroundColor: theme.colors.DANGER,
  },
  dangerButtonText: {
    color: '#FFFFFF',
  },
  
  // Small size
  smButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    minHeight: 36,
  },
  smButtonText: {
    fontSize: theme.fontSizes.sm,
  },
  
  // Base size
  baseButton: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    minHeight: 48,
  },
  baseButtonText: {
    fontSize: theme.fontSizes.base,
  },
  
  // Large size
  lgButton: {
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[8],
    minHeight: 56,
  },
  lgButtonText: {
    fontSize: theme.fontSizes.lg,
  },
});