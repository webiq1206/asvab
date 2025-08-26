import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';

interface QuizProgressProps {
  progress: number; // Percentage 0-100
  branch: MilitaryBranch;
  showPercentage?: boolean;
  style?: any;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  progress,
  branch,
  showPercentage = true,
  style,
}) => {
  const branchColor = theme.branchColors[branch];
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getProgressColor = () => {
    if (clampedProgress >= 80) return theme.colors.SUCCESS;
    if (clampedProgress >= 60) return branchColor;
    if (clampedProgress >= 40) return theme.colors.TACTICAL_ORANGE;
    return theme.colors.KHAKI;
  };

  const progressColor = getProgressColor();

  return (
    <View style={[styles.container, style]}>
      {showPercentage && (
        <View style={styles.header}>
          <Text style={styles.progressText}>PROGRESS</Text>
          <Text style={[styles.percentageText, { color: progressColor }]}>
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      )}
      
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBar,
            { backgroundColor: `${branchColor}20` }
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${clampedProgress}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
          
          {/* Progress glow effect */}
          <View
            style={[
              styles.progressGlow,
              {
                width: `${clampedProgress}%`,
                backgroundColor: progressColor,
                shadowColor: progressColor,
              },
            ]}
          />
        </View>
        
        {/* Progress markers */}
        <View style={styles.markers}>
          {[25, 50, 75].map(marker => (
            <View
              key={marker}
              style={[
                styles.marker,
                {
                  left: `${marker}%`,
                  backgroundColor: clampedProgress >= marker ? progressColor : theme.colors.KHAKI,
                },
              ]}
            />
          ))}
        </View>
      </View>
      
      {/* Military-style status indicator */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: progressColor }]} />
        <Text style={[styles.statusText, { color: progressColor }]}>
          {getProgressStatus(clampedProgress)}
        </Text>
      </View>
    </View>
  );
};

const getProgressStatus = (progress: number): string => {
  if (progress >= 90) return 'MISSION NEARLY COMPLETE';
  if (progress >= 75) return 'EXCELLENT PROGRESS';
  if (progress >= 50) return 'HALFWAY THERE';
  if (progress >= 25) return 'GOOD START';
  return 'MISSION INITIATED';
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: `${theme.colors.MILITARY_GREEN}30`,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.KHAKI,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  progressText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  percentageText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    position: 'relative',
    marginBottom: theme.spacing[2],
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
    zIndex: 2,
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 4,
    opacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  markers: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 12,
  },
  marker: {
    position: 'absolute',
    width: 3,
    height: 12,
    borderRadius: 1.5,
    marginLeft: -1.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: theme.spacing[2],
  },
  statusText: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    letterSpacing: 0.5,
  },
});