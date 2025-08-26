import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { BranchSelector } from '@/components/UI/BranchSelector';
import { authService } from '@/services/authService';
import { useAuth } from '@/store/authStore';
import { theme } from '@/constants/theme';
import { MilitaryBranch, BRANCH_INFO } from '@asvab-prep/shared';

type Props = NativeStackScreenProps<AuthStackParamList, 'BranchSelection'>;

// No need for ExtendedParams, use the typed route params directly

export const BranchSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedBranch, setSelectedBranch] = useState<MilitaryBranch | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuth();

  const { email, firstName, lastName, password, fromOAuth } = route.params;

  const handleBranchSelect = (branch: MilitaryBranch) => {
    setSelectedBranch(branch);
  };

  const handleContinue = async () => {
    if (!selectedBranch) {
      Toast.show({
        type: 'error',
        text1: 'Branch Selection Required',
        text2: 'You must select your military branch to continue.',
      });
      return;
    }

    setIsLoading(true);

    try {
      let response;

      if (fromOAuth) {
        // Complete OAuth registration with branch selection
        response = await authService.completeOAuthRegistration({
          email,
          selectedBranch,
          firstName,
          lastName,
        });
      } else {
        // Complete regular registration with branch selection
        response = await authService.register({
          email,
          password: password!,
          firstName: firstName || '',
          lastName: lastName || '',
          selectedBranch,
        });
      }

      // Set authentication state
      setAuth(response);

      // Show welcome message with branch-specific greeting
      const branchInfo = BRANCH_INFO[selectedBranch];
      Toast.show({
        type: 'success',
        text1: `Welcome, ${branchInfo.title}!`,
        text2: `${branchInfo.exclamation} Your enlistment is complete!`,
      });

    } catch (error: any) {
      console.error('Registration failed:', error);
      
      const errorMessage = error.response?.data?.message || 
        error.message || 
        'Registration failed. Please try again.';
      
      Alert.alert('Registration Failed', errorMessage, [
        {
          text: 'Try Again',
          style: 'default',
        },
        {
          text: 'Go Back',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getBranchWelcomeMessage = () => {
    if (!selectedBranch) return '';
    
    const branchInfo = BRANCH_INFO[selectedBranch];
    return `You've chosen to serve in the ${branchInfo.name}. ${branchInfo.motto}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.KHAKI} />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.title}>CHOOSE YOUR BRANCH</Text>
            <Text style={styles.subtitle}>
              This determines your personalized content and military job information
            </Text>
          </View>
        </View>

        {/* Branch Selection */}
        <View style={styles.branchSelection}>
          <BranchSelector
            selectedBranch={selectedBranch}
            onSelectBranch={handleBranchSelect}
            disabled={isLoading}
          />
        </View>

        {/* Selected Branch Info */}
        {selectedBranch && (
          <View style={styles.selectionInfo}>
            <Text style={[
              styles.welcomeMessage,
              { color: theme.branchColors[selectedBranch] }
            ]}>
              {getBranchWelcomeMessage()}
            </Text>
          </View>
        )}

        {/* Continue Button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedBranch && styles.continueButtonDisabled,
              selectedBranch && { 
                backgroundColor: theme.branchColors[selectedBranch],
              },
            ]}
            onPress={handleContinue}
            disabled={!selectedBranch || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.DARK_OLIVE} />
            ) : (
              <>
                <Text style={[
                  styles.continueButtonText,
                  !selectedBranch && styles.continueButtonTextDisabled,
                ]}>
                  COMPLETE ENLISTMENT
                </Text>
                {selectedBranch && (
                  <Text style={styles.continueButtonSubtext}>
                    {BRANCH_INFO[selectedBranch].exclamation}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            * Branch selection affects your personalized content, job information, 
            and military-specific terminology throughout the app.
          </Text>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color={theme.colors.KHAKI} />
          <Text style={styles.securityText}>
            Your information is secured with military-grade encryption
          </Text>
        </View>
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
  },
  header: {
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  headerText: {
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.TACTICAL_ORANGE,
    letterSpacing: 2,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing[4],
  },
  branchSelection: {
    flex: 1,
    minHeight: 400,
  },
  selectionInfo: {
    backgroundColor: `${theme.colors.KHAKI}15`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginVertical: theme.spacing[4],
    borderWidth: 1,
    borderColor: `${theme.colors.KHAKI}30`,
  },
  welcomeMessage: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    paddingBottom: theme.spacing[4],
  },
  continueButton: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    minHeight: 60,
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.5,
  },
  continueButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.DARK_OLIVE,
    letterSpacing: 2,
  },
  continueButtonTextDisabled: {
    color: theme.colors.DARK_OLIVE,
    opacity: 0.7,
  },
  continueButtonSubtext: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DARK_OLIVE,
    marginTop: 2,
  },
  disclaimer: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.8,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: theme.spacing[4],
  },
  securityText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[2],
    opacity: 0.8,
  },
});