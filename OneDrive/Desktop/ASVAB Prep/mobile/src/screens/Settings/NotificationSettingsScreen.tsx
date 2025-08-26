import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme } from '@/constants/theme';
import { useAuth } from '@/store/authStore';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '@/components/UI/MilitaryCard';
import { MilitaryButton } from '@/components/UI/MilitaryButton';
import { pushNotificationService, NotificationSettings } from '@/services/pushNotificationService';
import { BRANCH_INFO } from '@asvab-prep/shared';

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedBranch, isPremium } = useAuth();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  const branchColor = selectedBranch ? theme.branchColors[selectedBranch] : theme.colors.MILITARY_GREEN;
  const branchInfo = selectedBranch ? BRANCH_INFO[selectedBranch] : null;

  // Fetch current notification settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => pushNotificationService.getNotificationSettings(),
    onSuccess: (data) => {
      setSettings(data);
      // Parse time strings to Date objects
      const [startHour, startMin] = data.quietHoursStart.split(':').map(Number);
      const [endHour, endMin] = data.quietHoursEnd.split(':').map(Number);
      
      const startTime = new Date();
      startTime.setHours(startHour, startMin, 0, 0);
      setTempStartTime(startTime);
      
      const endTime = new Date();
      endTime.setHours(endHour, endMin, 0, 0);
      setTempEndTime(endTime);
    },
  });

  // Update notification settings
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<NotificationSettings>) => 
      pushNotificationService.updateNotificationSettings(newSettings),
    onSuccess: (updatedSettings) => {
      setSettings(updatedSettings);
      Toast.show({
        type: 'success',
        text1: 'Settings Updated',
        text2: `${branchInfo?.exclamation} Your preferences have been saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not save notification settings. Please try again.',
      });
    },
  });

  const updateSetting = (key: keyof NotificationSettings, value: boolean | string) => {
    if (!settings) return;
    
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      const timeString = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
      setTempStartTime(selectedDate);
      updateSetting('quietHoursStart', timeString);
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    setShowEndTimePicker(false);
    if (selectedDate) {
      const timeString = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
      setTempEndTime(selectedDate);
      updateSetting('quietHoursEnd', timeString);
    }
  };

  const sendTestNotification = async () => {
    try {
      if (selectedBranch) {
        await pushNotificationService.sendTestNotification(selectedBranch);
        Toast.show({
          type: 'success',
          text1: 'Test Sent',
          text2: 'Check your notifications in a few seconds.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Test Failed',
        text2: 'Could not send test notification.',
      });
    }
  };

  const resetAllNotifications = () => {
    Alert.alert(
      'Reset Notifications',
      'This will cancel all scheduled notifications and restore default settings. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await pushNotificationService.cancelAllNotifications();
              const defaultSettings: NotificationSettings = {
                studyReminders: true,
                dailyMissions: true,
                weeklyProgress: true,
                achievementAlerts: true,
                socialUpdates: false,
                ptTestReminders: true,
                subscriptionUpdates: true,
                quietHoursEnabled: false,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
              };
              updateSettingsMutation.mutate(defaultSettings);
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Reset Failed',
                text2: 'Could not reset notifications.',
              });
            }
          },
        },
      ]
    );
  };

  if (isLoading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.DARK_OLIVE, theme.colors.MILITARY_GREEN]}
          style={styles.loadingContainer}
        >
          <Text style={styles.loadingText}>LOADING SETTINGS...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <LinearGradient
          colors={[branchColor, theme.colors.DARK_OLIVE]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.KHAKI} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={sendTestNotification} style={styles.testButton}>
              <Ionicons name="notifications" size={24} color={theme.colors.KHAKI} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>NOTIFICATION CENTER</Text>
            <Text style={styles.headerSubtitle}>
              Manage your military communication preferences
            </Text>
            {branchInfo && (
              <Text style={styles.headerMotto}>{branchInfo.motto}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Study & Training Notifications */}
        <MilitaryCard style={styles.card}>
          <MilitaryCardHeader
            title="TRAINING & STUDY"
            subtitle="Learning reminders and missions"
            iconName="school"
            iconColor={branchColor}
          />
          <MilitaryCardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Daily Study Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get reminded to maintain your study schedule
                </Text>
              </View>
              <Switch
                value={settings.studyReminders}
                onValueChange={(value) => updateSetting('studyReminders', value)}
                trackColor={{ false: theme.colors.border, true: branchColor }}
                thumbColor={settings.studyReminders ? theme.colors.white : theme.colors.textSecondary}
              />
            </View>

            {isPremium && (
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>AI Daily Missions</Text>
                  <Text style={styles.settingDescription}>
                    Personalized daily challenges and objectives
                  </Text>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PREMIUM</Text>
                  </View>
                </View>
                <Switch
                  value={settings.dailyMissions}
                  onValueChange={(value) => updateSetting('dailyMissions', value)}
                  trackColor={{ false: theme.colors.border, true: branchColor }}
                  thumbColor={settings.dailyMissions ? theme.colors.white : theme.colors.textSecondary}
                />
              </View>
            )}

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>PT Test Reminders</Text>
                <Text style={styles.settingDescription}>
                  Fitness test schedules and preparation alerts
                </Text>
              </View>
              <Switch
                value={settings.ptTestReminders}
                onValueChange={(value) => updateSetting('ptTestReminders', value)}
                trackColor={{ false: theme.colors.border, true: branchColor }}
                thumbColor={settings.ptTestReminders ? theme.colors.white : theme.colors.textSecondary}
              />
            </View>
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Progress & Achievements */}
        <MilitaryCard style={styles.card}>
          <MilitaryCardHeader
            title="PROGRESS & ACHIEVEMENTS"
            subtitle="Milestones and accomplishments"
            iconName="trophy"
            iconColor={theme.colors.TACTICAL_ORANGE}
          />
          <MilitaryCardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Weekly Progress Reports</Text>
                <Text style={styles.settingDescription}>
                  Summary of your weekly training progress
                </Text>
              </View>
              <Switch
                value={settings.weeklyProgress}
                onValueChange={(value) => updateSetting('weeklyProgress', value)}
                trackColor={{ false: theme.colors.border, true: branchColor }}
                thumbColor={settings.weeklyProgress ? theme.colors.white : theme.colors.textSecondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Achievement Alerts</Text>
                <Text style={styles.settingDescription}>
                  Celebrate when you reach new milestones
                </Text>
              </View>
              <Switch
                value={settings.achievementAlerts}
                onValueChange={(value) => updateSetting('achievementAlerts', value)}
                trackColor={{ false: theme.colors.border, true: branchColor }}
                thumbColor={settings.achievementAlerts ? theme.colors.white : theme.colors.textSecondary}
              />
            </View>
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Social & Community */}
        {isPremium && (
          <MilitaryCard style={styles.card}>
            <MilitaryCardHeader
              title="SOCIAL & COMMUNITY"
              subtitle="Study groups and social features"
              iconName="people"
              iconColor={theme.colors.info}
            />
            <MilitaryCardContent>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Social Updates</Text>
                  <Text style={styles.settingDescription}>
                    Study group activities and community events
                  </Text>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PREMIUM</Text>
                  </View>
                </View>
                <Switch
                  value={settings.socialUpdates}
                  onValueChange={(value) => updateSetting('socialUpdates', value)}
                  trackColor={{ false: theme.colors.border, true: branchColor }}
                  thumbColor={settings.socialUpdates ? theme.colors.white : theme.colors.textSecondary}
                />
              </View>
            </MilitaryCardContent>
          </MilitaryCard>
        )}

        {/* System & Account */}
        <MilitaryCard style={styles.card}>
          <MilitaryCardHeader
            title="SYSTEM & ACCOUNT"
            subtitle="App updates and subscription info"
            iconName="settings"
            iconColor={theme.colors.textSecondary}
          />
          <MilitaryCardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Subscription Updates</Text>
                <Text style={styles.settingDescription}>
                  Payment reminders and subscription changes
                </Text>
              </View>
              <Switch
                value={settings.subscriptionUpdates}
                onValueChange={(value) => updateSetting('subscriptionUpdates', value)}
                trackColor={{ false: theme.colors.border, true: branchColor }}
                thumbColor={settings.subscriptionUpdates ? theme.colors.white : theme.colors.textSecondary}
              />
            </View>
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Quiet Hours */}
        <MilitaryCard style={styles.card}>
          <MilitaryCardHeader
            title="QUIET HOURS"
            subtitle="Do not disturb schedule"
            iconName="moon"
            iconColor={theme.colors.textSecondary}
          />
          <MilitaryCardContent>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  Suppress notifications during specified hours
                </Text>
              </View>
              <Switch
                value={settings.quietHoursEnabled}
                onValueChange={(value) => updateSetting('quietHoursEnabled', value)}
                trackColor={{ false: theme.colors.border, true: branchColor }}
                thumbColor={settings.quietHoursEnabled ? theme.colors.white : theme.colors.textSecondary}
              />
            </View>

            {settings.quietHoursEnabled && (
              <View style={styles.timeSettings}>
                <View style={styles.timeSetting}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={styles.timeText}>{settings.quietHoursStart}</Text>
                    <Ionicons name="time" size={20} color={branchColor} />
                  </TouchableOpacity>
                </View>

                <View style={styles.timeSetting}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={styles.timeText}>{settings.quietHoursEnd}</Text>
                    <Ionicons name="time" size={20} color={branchColor} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <MilitaryButton
            title="SEND TEST NOTIFICATION"
            onPress={sendTestNotification}
            style={{ 
              backgroundColor: theme.colors.info,
              marginBottom: theme.spacing[3],
            }}
            icon="notifications"
          />
          
          <MilitaryButton
            title="RESET ALL SETTINGS"
            onPress={resetAllNotifications}
            style={{
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: theme.colors.DANGER,
            }}
            textStyle={{ color: theme.colors.DANGER }}
            icon="refresh"
          />
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={tempStartTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleStartTimeChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={tempEndTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleEndTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.DESERT_SAND,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.KHAKI,
    letterSpacing: 2,
  },
  header: {
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  backButton: {
    padding: theme.spacing[2],
  },
  testButton: {
    padding: theme.spacing[2],
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.KHAKI,
    letterSpacing: 2,
    marginBottom: theme.spacing[2],
  },
  headerSubtitle: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.DESERT_SAND,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  headerMotto: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.DESERT_SAND,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing[4],
  },
  settingTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  settingDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  premiumBadge: {
    backgroundColor: theme.colors.TACTICAL_ORANGE,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: theme.spacing[1],
  },
  premiumText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.white,
  },
  timeSettings: {
    marginTop: theme.spacing[4],
  },
  timeSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  timeLabel: {
    fontFamily: theme.fonts.body.medium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
  },
  timeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    marginRight: theme.spacing[2],
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
});