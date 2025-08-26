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
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { authService } from '@/services/authService';
import { useAuth } from '@/store/authStore';
import { theme } from '@/constants/theme';
import { BRANCH_INFO } from '@asvab-prep/shared';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await authService.login(data);
      
      // Set authentication state
      setAuth(response);

      // Show branch-specific welcome message
      if (response.user?.selectedBranch) {
        const branchInfo = BRANCH_INFO[response.user.selectedBranch];
        Toast.show({
          type: 'success',
          text1: `Welcome back, ${branchInfo.title}!`,
          text2: `${branchInfo.exclamation} Ready for training?`,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: 'Ready to continue your ASVAB preparation?',
        });
      }

    } catch (error: any) {
      console.error('Login failed:', error);
      
      const errorMessage = error.response?.data?.message || 
        error.message || 
        'Login failed. Please check your credentials and try again.';
      
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    Alert.alert('Coming Soon', 'Google sign-in will be available in the next update.');
  };

  const handleMagicLink = async () => {
    const { getValues } = control;
    const email = getValues('email');

    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address first.',
      });
      return;
    }

    try {
      setIsLoading(true);
      await authService.requestMagicLink(email);
      
      Toast.show({
        type: 'success',
        text1: 'Magic Link Sent',
        text2: 'Check your email for a login link.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Send Link',
        text2: 'Please try again or contact support.',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            
            <Text style={styles.title}>REPORT FOR DUTY</Text>
            <Text style={styles.subtitle}>Sign in to continue your mission</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
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
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>PASSWORD</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotLink}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.passwordContainer}>
                <Controller
                  control={control}
                  name="password"
                  rules={{
                    required: 'Password is required',
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.passwordInput,
                        errors.password && styles.inputError,
                      ]}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                    />
                  )}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.DARK_OLIVE} />
              ) : (
                <Text style={styles.loginButtonText}>SIGN IN</Text>
              )}
            </TouchableOpacity>

            {/* Alternative Login Options */}
            <View style={styles.alternativeOptions}>
              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={handleMagicLink}
                disabled={isLoading}
              >
                <Ionicons name="mail" size={16} color={theme.colors.KHAKI} />
                <Text style={styles.magicLinkText}>Send Magic Link</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={20} color={theme.colors.KHAKI} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerLink}>
            <Text style={styles.registerLinkText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLinkButton}>Enlist Now</Text>
            </TouchableOpacity>
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
  },
  form: {
    marginBottom: theme.spacing[8],
  },
  inputGroup: {
    marginBottom: theme.spacing[6],
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  label: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    letterSpacing: 1,
  },
  forgotLink: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.TACTICAL_ORANGE,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.DESERT_SAND,
    borderRadius: theme.borderRadius.md,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    fontSize: theme.fontSizes.base,
    fontFamily: theme.fonts.body.regular,
    color: theme.colors.DARK_OLIVE,
  },
  eyeButton: {
    padding: theme.spacing[3],
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
  loginButton: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
    minHeight: 54,
  },
  loginButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.DARK_OLIVE,
    letterSpacing: 2,
  },
  alternativeOptions: {
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  magicLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  magicLinkText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[2],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.KHAKI,
    opacity: 0.3,
  },
  dividerText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    paddingHorizontal: theme.spacing[4],
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.KHAKI,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[2],
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: theme.spacing[6],
  },
  registerLinkText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
  },
  registerLinkButton: {
    fontFamily: theme.fonts.body.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.TACTICAL_ORANGE,
  },
});