import React, { createContext, useContext } from 'react';
import { useTheme as useUITheme } from '@/store/uiStore';
import { theme, getBranchTheme, Theme } from '@/constants/theme';
import { useAuth } from '@/store/authStore';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isDarkMode } = useUITheme();
  const { selectedBranch } = useAuth();

  // Get theme based on selected military branch
  const currentTheme = selectedBranch ? getBranchTheme(selectedBranch) : theme;

  // TODO: Implement dark mode theme variations
  const finalTheme = isDarkMode ? currentTheme : currentTheme;

  const contextValue: ThemeContextType = {
    theme: finalTheme,
    isDarkMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};