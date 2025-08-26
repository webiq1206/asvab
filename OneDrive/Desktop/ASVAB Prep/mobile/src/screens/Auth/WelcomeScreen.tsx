import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { theme } from '@/constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>ASVAB</Text>
            <Text style={styles.logoSubtext}>PREP</Text>
          </View>
          
          <Text style={styles.tagline}>
            MISSION READY PREPARATION
          </Text>
          
          <Text style={styles.description}>
            Master the ASVAB with military-grade training designed for your branch.
            Join thousands of future service members who've achieved their target scores.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>ENLIST NOW</Text>
            <Text style={styles.buttonSubtext}>Create Your Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>REPORT FOR DUTY</Text>
            <Text style={[styles.buttonSubtext, styles.secondaryButtonSubtext]}>
              Sign In to Existing Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Branch-Specific Content</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>Real ASVAB Simulation</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏆</Text>
            <Text style={styles.featureText}>Military Rank System</Text>
          </View>
        </View>

        {/* Bottom Text */}
        <Text style={styles.disclaimer}>
          Prepare for your military career with confidence.
          All content verified by military education specialists.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: theme.spacing[12],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  logoText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: 48,
    color: theme.colors.TACTICAL_ORANGE,
    letterSpacing: 4,
  },
  logoSubtext: {
    fontFamily: theme.fonts.military.bold,
    fontSize: 24,
    color: theme.colors.KHAKI,
    letterSpacing: 8,
    marginTop: -8,
  },
  tagline: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.KHAKI,
    letterSpacing: 2,
    marginBottom: theme.spacing[4],
  },
  description: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing[4],
  },
  actionSection: {
    paddingVertical: theme.spacing[4],
  },
  button: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    ...theme.shadows.base,
  },
  primaryButton: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.KHAKI,
  },
  primaryButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.DARK_OLIVE,
    letterSpacing: 2,
  },
  secondaryButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.KHAKI,
    letterSpacing: 2,
  },
  buttonSubtext: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DARK_OLIVE,
    marginTop: 4,
  },
  secondaryButtonSubtext: {
    color: theme.colors.DESERT_SAND,
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing[6],
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: theme.spacing[2],
  },
  featureText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  disclaimer: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    opacity: 0.8,
    paddingBottom: theme.spacing[4],
  },
});