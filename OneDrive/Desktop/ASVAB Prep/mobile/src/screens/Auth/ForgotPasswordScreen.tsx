import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { authService } from '@/services/authService';
import { theme } from '@/constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

interface ForgotPasswordFormData {
  email: string;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      await authService.requestMagicLink(data.email);
      
      setIsEmailSent(true);
      
      Toast.show({
        type: 'success',
        text1: 'Reset Instructions Sent',
        text2: 'Check your email for password reset instructions.',
      });

    } catch (error: any) {
      console.error('Password reset failed:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: 'Unable to send reset instructions. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const email = getValues('email');
    if (email) {
      await onSubmit({ email });
    }
  };

  if (isEmailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.KHAKI} />
            </TouchableOpacity>
          </View>

          {/* Success Content */}
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="mail" size={64} color={theme.colors.TACTICAL_ORANGE} />
            </View>
            
            <Text style={styles.successTitle}>CHECK YOUR EMAIL</Text>
            
            <Text style={styles.successMessage}>
              We've sent password reset instructions to your email address.
              Please check your inbox and follow the instructions to reset your password.
            </Text>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.KHAKI} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color={theme.colors.KHAKI} />
                    <Text style={styles.resendButtonText}>Resend Email</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Didn't receive the email? Check your spam folder or contact support.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.KHAKI} />
            </TouchableOpacity>
            
            <Text style={styles.title}>RESET PASSWORD</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset your password
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <Controller
                control={control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Please enter a valid email address',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      errors.email && styles.inputError,
                    ]}
                    placeholder="your.email@example.com"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.DARK_OLIVE} />
              ) : (
                <>
                  <Ionicons
                    name="mail"
                    size={20}
                    color={theme.colors.DARK_OLIVE}
                    style={styles.resetIcon}
                  />
                  <Text style={styles.resetButtonText}>SEND RESET INSTRUCTIONS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkButton}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.KHAKI} />
            <Text style={styles.securityText}>
              For security, reset instructions expire in 1 hour
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DARK_OLIVE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: theme.spacing[4],
    padding: theme.spacing[2],
  },
  title: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.TACTICAL_ORANGE,
    letterSpacing: 2,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing[4],
  },
  form: {
    marginBottom: theme.spacing[8],
  },
  inputGroup: {
    marginBottom: theme.spacing[6],
  },
  label: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    marginBottom: theme.spacing[2],
    letterSpacing: 1,
  },
  input: {
    backgroundColor: theme.colors.DESERT_SAND,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    fontSize: theme.fontSizes.base,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.DARK_OLIVE,
  },
  inputError: {
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.error,
    marginTop: theme.spacing[1],
  },
  actions: {
    marginBottom: theme.spacing[6],
  },
  resetButton: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  resetIcon: {
    marginRight: theme.spacing[2],
  },
  resetButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DARK_OLIVE,
    letterSpacing: 1,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  loginLinkText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
  },
  loginLinkButton: {
    fontFamily: theme.fonts.body.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.TACTICAL_ORANGE,
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[12],
  },
  successIcon: {
    marginBottom: theme.spacing[6],
  },
  successTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.TACTICAL_ORANGE,
    letterSpacing: 2,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
  },
  successActions: {
    width: '100%',
    alignItems: 'center',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    borderWidth: 1,
    borderColor: theme.colors.KHAKI,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[4],
  },
  resendButtonText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[2],
  },
  backToLoginButton: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
  },
  backToLoginText: {
    fontFamily: theme.fonts.body.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.TACTICAL_ORANGE,
  },
  helpContainer: {
    paddingBottom: theme.spacing[6],
  },
  helpText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    opacity: 0.8,
  },
});