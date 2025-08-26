import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  title?: string;
  subtitle?: string;
  branch?: MilitaryBranch;
}

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  title = 'ASVAB READINESS',
  subtitle,
  branch,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const progressColor = branch 
    ? theme.branchColors[branch] 
    : theme.colors.MILITARY_GREEN;

  const getPerformanceLevel = () => {
    if (percentage >= 85) return { level: 'OUTSTANDING', color: theme.colors.SUCCESS };
    if (percentage >= 70) return { level: 'SOLID', color: theme.colors.WARNING };
    if (percentage >= 50) return { level: 'IMPROVING', color: theme.colors.INFO };
    return { level: 'NEEDS WORK', color: theme.colors.DANGER };
  };

  const performance = getPerformanceLevel();

  return (
    <View style={styles.container}>
      <View style={[styles.circle, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.DESERT_SAND}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.innerContent}>
          <Text style={[styles.percentage, { color: progressColor }]}>
            {percentage}%
          </Text>
          <Text style={[styles.performanceLevel, { color: performance.color }]}>
            {performance.level}
          </Text>
        </View>
      </View>
      
      <View style={styles.labels}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    textAlign: 'center',
  },
  performanceLevel: {
    fontFamily: theme.fonts.military.regular,
    fontSize: theme.fontSizes.xs,
    textAlign: 'center',
    marginTop: 2,
  },
  labels: {
    alignItems: 'center',
    marginTop: theme.spacing[3],
  },
  title: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing[1],
  },
});