import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'text' | 'full';
  color?: string;
  style?: any;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  size = 'medium',
  variant = 'full',
  color = theme.colors.TACTICAL_ORANGE,
  style,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { width: 16, height: 16 },
          icon: 12,
          text: theme.fontSizes.xs,
          padding: 2,
        };
      case 'medium':
        return {
          container: { width: 20, height: 20 },
          icon: 14,
          text: theme.fontSizes.xs,
          padding: 4,
        };
      case 'large':
        return {
          container: { width: 24, height: 24 },
          icon: 16,
          text: theme.fontSizes.sm,
          padding: 6,
        };
      default:
        return {
          container: { width: 20, height: 20 },
          icon: 14,
          text: theme.fontSizes.xs,
          padding: 4,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (variant === 'icon') {
    return (
      <View
        style={[
          styles.iconBadge,
          sizeStyles.container,
          { backgroundColor: color },
          style,
        ]}
      >
        <Ionicons name="star" size={sizeStyles.icon} color="#FFFFFF" />
      </View>
    );
  }

  if (variant === 'text') {
    return (
      <View
        style={[
          styles.textBadge,
          { backgroundColor: color, paddingHorizontal: sizeStyles.padding * 2, paddingVertical: sizeStyles.padding },
          style,
        ]}
      >
        <Text style={[styles.badgeText, { fontSize: sizeStyles.text }]}>
          PREMIUM
        </Text>
      </View>
    );
  }

  // Full variant (icon + text)
  return (
    <View
      style={[
        styles.fullBadge,
        { backgroundColor: color, paddingHorizontal: sizeStyles.padding * 2, paddingVertical: sizeStyles.padding },
        style,
      ]}
    >
      <Ionicons name="star" size={sizeStyles.icon} color="#FFFFFF" />
      <Text style={[styles.badgeText, { fontSize: sizeStyles.text, marginLeft: 4 }]}>
        PREMIUM
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  iconBadge: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBadge: {
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    fontFamily: theme.fonts.military.bold,
    color: '#FFFFFF',
  },
});