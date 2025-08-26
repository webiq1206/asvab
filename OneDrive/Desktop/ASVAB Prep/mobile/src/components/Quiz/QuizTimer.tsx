import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface QuizTimerProps {
  seconds: number;
  isASVABReplica?: boolean;
  timeLimit?: number; // in seconds
  branch: MilitaryBranch;
  showWarning?: boolean;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({
  seconds,
  isASVABReplica = false,
  timeLimit,
  branch,
  showWarning = false,
}) => {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (!timeLimit) return theme.colors.KHAKI;
    
    const remaining = timeLimit - seconds;
    const percentageLeft = (remaining / timeLimit) * 100;
    
    if (percentageLeft <= 10) return theme.colors.DANGER; // Red when < 10%
    if (percentageLeft <= 25) return theme.colors.TACTICAL_ORANGE; // Orange when < 25%
    return theme.colors.KHAKI;
  };

  const getTimerIcon = (): string => {
    if (!timeLimit) return 'time-outline';
    
    const remaining = timeLimit - seconds;
    const percentageLeft = (remaining / timeLimit) * 100;
    
    if (percentageLeft <= 10) return 'alarm-outline';
    if (percentageLeft <= 25) return 'timer-outline';
    return 'time-outline';
  };

  const remainingTime = timeLimit ? Math.max(0, timeLimit - seconds) : null;
  const timeToDisplay = remainingTime !== null ? remainingTime : seconds;
  const timeColor = getTimeColor();
  const branchColor = theme.branchColors[branch];

  return (
    <View style={[styles.container, isASVABReplica && styles.asvabContainer]}>
      <View style={styles.timerContent}>
        <Ionicons
          name={getTimerIcon()}
          size={18}
          color={timeColor}
          style={styles.icon}
        />
        <Text style={[styles.timeText, { color: timeColor }]}>
          {formatTime(timeToDisplay)}
        </Text>
      </View>
      
      {isASVABReplica && (
        <Text style={styles.labelText}>
          {remainingTime !== null ? 'REMAINING' : 'ELAPSED'}
        </Text>
      )}
      
      {timeLimit && (
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar,
              { backgroundColor: `${branchColor}30` }
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, ((timeLimit - seconds) / timeLimit) * 100)}%`,
                  backgroundColor: timeColor,
                },
              ]}
            />
          </View>
        </View>
      )}

      {showWarning && remainingTime !== null && remainingTime <= 300 && ( // 5 minutes warning
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={12} color={theme.colors.DANGER} />
          <Text style={styles.warningText}>5 MIN LEFT!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 100,
  },
  asvabContainer: {
    backgroundColor: `${theme.colors.TACTICAL_ORANGE}20`,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.TACTICAL_ORANGE,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing[2],
  },
  timeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    letterSpacing: 0.5,
  },
  labelText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginTop: theme.spacing[1],
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: theme.spacing[2],
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    backgroundColor: `${theme.colors.DANGER}20`,
    borderRadius: theme.borderRadius.sm,
  },
  warningText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.DANGER,
    marginLeft: theme.spacing[1],
  },
});