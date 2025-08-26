import { COLORS, BRANCH_COLORS } from '@asvab-prep/shared';
import { MilitaryBranch } from '@asvab-prep/shared';

export const theme = {
  colors: {
    primary: COLORS.MILITARY_GREEN,
    secondary: COLORS.DESERT_SAND,
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: COLORS.DARK_OLIVE,
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    success: COLORS.SUCCESS,
    warning: COLORS.WARNING,
    danger: COLORS.DANGER,
    error: COLORS.DANGER,
    info: COLORS.INFO,
    ...COLORS,
  },
  branchColors: BRANCH_COLORS,
  fonts: {
    military: {
      regular: 'Oswald-Regular',
      bold: 'Oswald-Bold',
    },
    body: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semiBold: 'Inter-SemiBold',
      bold: 'Inter-Bold',
    },
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },
  borderRadius: {
    sm: 4,
    base: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: COLORS.DARK_OLIVE,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    base: {
      shadowColor: COLORS.DARK_OLIVE,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: COLORS.DARK_OLIVE,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 25,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;

export const getBranchTheme = (branch: MilitaryBranch) => ({
  ...theme,
  colors: {
    ...theme.colors,
    accent: theme.branchColors[branch],
  },
});