import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';

interface CircularProgressMeterProps {
  percentage: number;
  afqtScore: number;
  branch: MilitaryBranch;
  size?: number;
}

export const CircularProgressMeter: React.FC<CircularProgressMeterProps> = ({
  percentage,
  afqtScore,
  branch,
  size = 180,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const branchColor = theme.branchColors[branch];
  
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage / 100,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const getReadinessLevel = (score: number) => {
    if (score >= 85) return { level: 'COMBAT READY', color: theme.colors.SUCCESS, icon: 'star' };
    if (score >= 70) return { level: 'MISSION CAPABLE', color: branchColor, icon: 'trophy' };
    if (score >= 50) return { level: 'TRAINING MODE', color: theme.colors.TACTICAL_ORANGE, icon: 'warning' };
    return { level: 'NEEDS TRAINING', color: theme.colors.DANGER, icon: 'alert-circle' };
  };

  const getAFQTCategory = (score: number) => {
    if (score >= 93) return 'Category I';
    if (score >= 65) return 'Category II';
    if (score >= 50) return 'Category IIIA';
    if (score >= 31) return 'Category IIIB';
    if (score >= 21) return 'Category IVA';
    if (score >= 16) return 'Category IVB';
    if (score >= 10) return 'Category IVC';
    return 'Category V';
  };

  const readiness = getReadinessLevel(percentage);
  const category = getAFQTCategory(afqtScore);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${branchColor}20`}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress Circle */}
        <Animated.View>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={readiness.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [circumference, 0],
            })}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Animated.View>
      </Svg>

      {/* Center Content */}
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={readiness.icon}
            size={24}
            color={readiness.color}
          />
        </View>
        
        <Text style={[styles.percentage, { color: readiness.color }]}>
          {Math.round(percentage)}%
        </Text>
        
        <Text style={styles.readinessLevel}>
          {readiness.level}
        </Text>
        
        <View style={styles.divider} />
        
        <View style={styles.afqtContainer}>
          <Text style={styles.afqtLabel}>AFQT SCORE</Text>
          <Text style={[styles.afqtScore, { color: branchColor }]}>
            {afqtScore}
          </Text>
          <Text style={styles.afqtCategory}>
            {category}
          </Text>
        </View>
      </View>

      {/* Military Styling Elements */}
      <View style={[styles.cornerAccent, styles.topLeft, { borderColor: branchColor }]} />
      <View style={[styles.cornerAccent, styles.topRight, { borderColor: branchColor }]} />
      <View style={[styles.cornerAccent, styles.bottomLeft, { borderColor: branchColor }]} />
      <View style={[styles.cornerAccent, styles.bottomRight, { borderColor: branchColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${theme.colors.MILITARY_GREEN}40`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.KHAKI,
    position: 'relative',
    padding: theme.spacing[3],
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing[2],
  },
  percentage: {
    fontFamily: theme.fonts.military.bold,
    fontSize: 32,
    letterSpacing: 1,
    marginBottom: theme.spacing[1],
  },
  readinessLevel: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[2],
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.KHAKI,
    marginBottom: theme.spacing[2],
  },
  afqtContainer: {
    alignItems: 'center',
  },
  afqtLabel: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[1],
  },
  afqtScore: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    marginBottom: theme.spacing[1],
  },
  afqtCategory: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  cornerAccent: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 2,
  },
  topLeft: {
    top: 8,
    left: 8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 8,
    right: 8,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 8,
    left: 8,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 8,
    right: 8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});