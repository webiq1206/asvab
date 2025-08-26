import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

interface QuizTimerProps {
  initialTime: number; // in seconds
  onTimeUp: () => void;
  onTimeWarning?: (remainingTime: number) => void;
  isPaused?: boolean;
  showMinimized?: boolean;
  branch?: MilitaryBranch;
  style?: any;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({
  initialTime,
  onTimeUp,
  onTimeWarning,
  isPaused = false,
  showMinimized = false,
  branch,
  style,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [remainingTime, setRemainingTime] = useState(initialTime);
  const [isWarningPhase, setIsWarningPhase] = useState(false);
  const [isCriticalPhase, setIsCriticalPhase] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!showMinimized);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPaused && remainingTime > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingTime(prevTime => {
          const newTime = prevTime - 1;
          
          if (newTime <= 0) {
            onTimeUp();
            return 0;
          }

          // Warning at 25% of time remaining
          const warningThreshold = Math.max(300, initialTime * 0.25); // At least 5 minutes or 25%
          if (newTime <= warningThreshold && !isWarningPhase) {
            setIsWarningPhase(true);
            if (onTimeWarning) {
              onTimeWarning(newTime);
            }
          }

          // Critical phase at 10% or last 2 minutes
          const criticalThreshold = Math.max(120, initialTime * 0.1); // At least 2 minutes or 10%
          if (newTime <= criticalThreshold && !isCriticalPhase) {
            setIsCriticalPhase(true);
            startPulseAnimation();
          }

          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, remainingTime, initialTime, isWarningPhase, isCriticalPhase, onTimeUp, onTimeWarning]);

  useEffect(() => {
    // Update progress animation
    const progress = remainingTime / initialTime;
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [remainingTime, initialTime]);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimation]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (isCriticalPhase) return theme.colors.DANGER;
    if (isWarningPhase) return theme.colors.TACTICAL_ORANGE;
    return branchColor;
  };

  const getTimerIcon = (): string => {
    if (isPaused) return 'pause-circle';
    if (isCriticalPhase) return 'alert-circle';
    if (isWarningPhase) return 'time';
    return 'timer';
  };

  const getMilitaryMessage = (): string => {
    if (isCriticalPhase) {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "FINAL PHASE, SOLDIER!";
        case MilitaryBranch.NAVY:
          return "ALL HANDS ON DECK, SAILOR!";
        case MilitaryBranch.AIR_FORCE:
          return "FINAL APPROACH, AIRMAN!";
        case MilitaryBranch.MARINES:
          return "PUSH THROUGH, MARINE!";
        case MilitaryBranch.COAST_GUARD:
          return "RESCUE TIME CRITICAL, COASTIE!";
        case MilitaryBranch.SPACE_FORCE:
          return "MISSION CRITICAL, GUARDIAN!";
        default:
          return "TIME CRITICAL!";
      }
    }

    if (isWarningPhase) {
      switch (userBranch) {
        case MilitaryBranch.ARMY:
          return "Stay focused, Soldier";
        case MilitaryBranch.NAVY:
          return "Steady as she goes, Sailor";
        case MilitaryBranch.AIR_FORCE:
          return "Maintain altitude, Airman";
        case MilitaryBranch.MARINES:
          return "Stay sharp, Marine";
        case MilitaryBranch.COAST_GUARD:
          return "Stay ready, Coastie";
        case MilitaryBranch.SPACE_FORCE:
          return "Stay on course, Guardian";
        default:
          return "Time remaining";
      }
    }

    return "Mission time";
  };

  const getProgressGradient = () => {
    if (isCriticalPhase) {
      return [theme.colors.DANGER, '#FF6B6B'];
    }
    if (isWarningPhase) {
      return [theme.colors.TACTICAL_ORANGE, '#FFB366'];
    }
    return [branchColor, theme.colors.SUCCESS];
  };

  const timerColor = getTimerColor();

  if (showMinimized && !isExpanded) {
    return (
      <TouchableOpacity
        style={[styles.minimizedContainer, { backgroundColor: `${timerColor}20`, borderColor: timerColor }, style]}
        onPress={() => setIsExpanded(true)}
      >
        <Animated.View
          style={[
            styles.minimizedContent,
            isCriticalPhase && { transform: [{ scale: pulseAnimation }] },
          ]}
        >
          <Ionicons name={getTimerIcon()} size={16} color={timerColor} />
          <Text style={[styles.minimizedTime, { color: timerColor }]}>
            {formatTime(remainingTime)}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: `${timerColor}15`, borderColor: timerColor },
        isCriticalPhase && { transform: [{ scale: pulseAnimation }] },
        style,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={getTimerIcon()} size={20} color={timerColor} />
          <Text style={[styles.headerTitle, { color: timerColor }]}>
            MISSION TIMER
          </Text>
        </View>

        {showMinimized && (
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={() => setIsExpanded(false)}
          >
            <Ionicons name="chevron-up" size={16} color={timerColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Timer Display */}
      <View style={styles.timerDisplay}>
        <Text style={[styles.timeText, { color: timerColor }]}>
          {formatTime(remainingTime)}
        </Text>
        <Text style={styles.messageText}>
          {getMilitaryMessage()}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: `${timerColor}20` }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={getProgressGradient()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>

      {/* Status Information */}
      <View style={styles.statusInfo}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Elapsed:</Text>
          <Text style={[styles.statusValue, { color: timerColor }]}>
            {formatTime(initialTime - remainingTime)}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Progress:</Text>
          <Text style={[styles.statusValue, { color: timerColor }]}>
            {Math.round(((initialTime - remainingTime) / initialTime) * 100)}%
          </Text>
        </View>
      </View>

      {/* Critical Phase Warning */}
      {isCriticalPhase && (
        <View style={[styles.warningBanner, { backgroundColor: `${theme.colors.DANGER}20` }]}>
          <Ionicons name="warning" size={16} color={theme.colors.DANGER} />
          <Text style={[styles.warningText, { color: theme.colors.DANGER }]}>
            CRITICAL TIME REMAINING - COMPLETE CURRENT QUESTION
          </Text>
        </View>
      )}

      {/* Pause Indicator */}
      {isPaused && (
        <View style={[styles.pausedBanner, { backgroundColor: `${theme.colors.INFO}20` }]}>
          <Ionicons name="pause" size={16} color={theme.colors.INFO} />
          <Text style={[styles.pausedText, { color: theme.colors.INFO }]}>
            TIMER PAUSED
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    gap: theme.spacing[3],
  },
  minimizedContainer: {
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  minimizedTime: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  headerTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
  },
  minimizeButton: {
    padding: theme.spacing[1],
  },
  timerDisplay: {
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  timeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xxl,
    textAlign: 'center',
  },
  messageText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[1],
  },
  statusValue: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing[2],
  },
  warningText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    textAlign: 'center',
    flex: 1,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing[2],
  },
  pausedText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    textAlign: 'center',
  },
});