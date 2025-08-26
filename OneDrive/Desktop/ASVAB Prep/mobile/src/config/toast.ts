import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, ToastConfigParams } from 'react-native-toast-message';
import { theme } from '@/constants/theme';

export const toastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.successToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.successText1}
      text2Style={styles.successText2}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  
  error: (props: ToastConfigParams<any>) => (
    <ErrorToast
      {...props}
      style={[styles.baseToast, styles.errorToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.errorText1}
      text2Style={styles.errorText2}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  
  info: (props: ToastConfigParams<any>) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.infoToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.infoText1}
      text2Style={styles.infoText2}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
};

const styles = StyleSheet.create({
  baseToast: {
    borderLeftWidth: 4,
    width: '90%',
    height: 70,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[4],
  },
  contentContainer: {
    paddingHorizontal: theme.spacing[3],
  },
  successToast: {
    backgroundColor: theme.colors.DESERT_SAND,
    borderLeftColor: theme.colors.SUCCESS,
  },
  successText1: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DARK_OLIVE,
  },
  successText2: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DARK_OLIVE,
  },
  errorToast: {
    backgroundColor: theme.colors.DESERT_SAND,
    borderLeftColor: theme.colors.error,
  },
  errorText1: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DARK_OLIVE,
  },
  errorText2: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DARK_OLIVE,
  },
  infoToast: {
    backgroundColor: theme.colors.DESERT_SAND,
    borderLeftColor: theme.colors.info,
  },
  infoText1: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DARK_OLIVE,
  },
  infoText2: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DARK_OLIVE,
  },
});