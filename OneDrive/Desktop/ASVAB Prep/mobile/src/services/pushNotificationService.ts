import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiService } from './api';
import { MilitaryBranch } from '@asvab-prep/shared';

export interface NotificationSettings {
  studyReminders: boolean;
  dailyMissions: boolean;
  weeklyProgress: boolean;
  achievementAlerts: boolean;
  socialUpdates: boolean;
  ptTestReminders: boolean;
  subscriptionUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  trigger: Notifications.NotificationTriggerInput;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Check if running on device
      if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return false;
      }

      // Get permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Get push token
      this.expoPushToken = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

      console.log('Expo push token:', this.expoPushToken);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('asvab-default', {
          name: 'ASVAB Prep',
          description: 'ASVAB preparation notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF8C00', // TACTICAL_ORANGE
        });

        await Notifications.setNotificationChannelAsync('asvab-study', {
          name: 'Study Reminders',
          description: 'Daily study and mission reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
        });

        await Notifications.setNotificationChannelAsync('asvab-achievements', {
          name: 'Achievements',
          description: 'Goal completions and milestones',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#228B22', // SUCCESS
        });
      }

      // Register token with backend
      if (this.expoPushToken) {
        await this.registerPushToken(this.expoPushToken);
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  async registerPushToken(token: string): Promise<void> {
    try {
      await apiService.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
        deviceId: Constants.deviceId,
      });
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      return await apiService.get<NotificationSettings>('/notifications/settings');
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      // Return default settings
      return {
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
    }
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return await apiService.put<NotificationSettings>('/notifications/settings', settings);
  }

  // Schedule local notifications
  async scheduleStudyReminder(
    branch: MilitaryBranch,
    hour: number = 19, // 7 PM default
    minute: number = 0
  ): Promise<string> {
    const branchMessages = {
      ARMY: 'Time to train, Soldier! Your daily mission awaits. Hooah!',
      NAVY: 'All hands on deck! Your study session starts now. Hooyah!',
      AIR_FORCE: 'Airman, time for mission preparation! Aim High! Hoorah!',
      MARINES: 'Marine, it\'s time to dominate your studies! Oorah!',
      COAST_GUARD: 'Guardian, your daily training begins now! Semper Paratus!',
      SPACE_FORCE: 'Guardian, launch into your study session! Semper Supra!',
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Study Mission',
        body: branchMessages[branch],
        sound: true,
        data: { type: 'study_reminder', branch },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    return notificationId;
  }

  async scheduleDailyMission(
    branch: MilitaryBranch,
    missionTitle: string,
    missionDescription: string,
    hour: number = 9, // 9 AM default
    minute: number = 0
  ): Promise<string> {
    const branchGreetings = {
      ARMY: 'Orders received, Soldier!',
      NAVY: 'New orders, Sailor!',
      AIR_FORCE: 'Mission briefing, Airman!',
      MARINES: 'New mission, Marine!',
      COAST_GUARD: 'Mission alert, Coastie!',
      SPACE_FORCE: 'Mission parameters, Guardian!',
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: branchGreetings[branch],
        body: `${missionTitle}: ${missionDescription}`,
        sound: true,
        data: { type: 'daily_mission', branch, missionTitle },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    return notificationId;
  }

  async scheduleWeeklyProgress(
    branch: MilitaryBranch,
    day: number = 0, // Sunday
    hour: number = 18, // 6 PM
    minute: number = 0
  ): Promise<string> {
    const branchMessages = {
      ARMY: 'Weekly after-action report ready! Review your progress, Soldier.',
      NAVY: 'Weekly status report available! Check your performance, Sailor.',
      AIR_FORCE: 'Weekly mission debrief ready! Analyze your progress, Airman.',
      MARINES: 'Weekly assessment complete! Review your gains, Marine.',
      COAST_GUARD: 'Weekly patrol summary ready! Check your advancement, Guardian.',
      SPACE_FORCE: 'Weekly orbital report available! Review your trajectory, Guardian.',
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Weekly Progress Report',
        body: branchMessages[branch],
        sound: true,
        data: { type: 'weekly_progress', branch },
      },
      trigger: {
        weekday: day + 1, // Expo uses 1-7 for Sunday-Saturday
        hour,
        minute,
        repeats: true,
      },
    });

    return notificationId;
  }

  async schedulePTTestReminder(
    branch: MilitaryBranch,
    daysUntilTest: number
  ): Promise<string> {
    const branchMessages = {
      ARMY: `PT Test in ${daysUntilTest} days! Stay Army Strong, Soldier!`,
      NAVY: `PRT in ${daysUntilTest} days! Keep ship-shape, Sailor!`,
      AIR_FORCE: `Fitness Assessment in ${daysUntilTest} days! Aim High, Airman!`,
      MARINES: `PFT in ${daysUntilTest} days! Stay combat ready, Marine!`,
      COAST_GUARD: `PFE in ${daysUntilTest} days! Always ready, Guardian!`,
      SPACE_FORCE: `Fitness Assessment in ${daysUntilTest} days! Stay mission ready, Guardian!`,
    };

    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + daysUntilTest);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PT Test Reminder',
        body: branchMessages[branch],
        sound: true,
        data: { type: 'pt_test_reminder', branch, daysUntilTest },
      },
      trigger: triggerDate,
    });

    return notificationId;
  }

  async showAchievementNotification(
    branch: MilitaryBranch,
    achievementTitle: string,
    xpEarned: number
  ): Promise<void> {
    const branchCelebrations = {
      ARMY: 'Outstanding, Soldier! Hooah!',
      NAVY: 'Excellent work, Sailor! Hooyah!',
      AIR_FORCE: 'Mission accomplished, Airman! Hoorah!',
      MARINES: 'Semper Fi dedication, Marine! Oorah!',
      COAST_GUARD: 'Semper Paratus excellence, Guardian! Hooyah!',
      SPACE_FORCE: 'Semper Supra achievement, Guardian! Hoorah!',
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: branchCelebrations[branch],
        body: `${achievementTitle} (+${xpEarned} XP)`,
        sound: true,
        data: { type: 'achievement', branch, achievementTitle, xpEarned },
      },
      trigger: null, // Show immediately
    });
  }

  async showSubscriptionReminder(daysUntilExpiry: number): Promise<void> {
    let title: string;
    let body: string;

    if (daysUntilExpiry <= 0) {
      title = 'Subscription Expired';
      body = 'Renew your Premium subscription to continue accessing all features.';
    } else if (daysUntilExpiry <= 3) {
      title = 'Subscription Expiring Soon';
      body = `Your Premium subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}.`;
    } else {
      title = 'Subscription Reminder';
      body = `Your Premium subscription expires in ${daysUntilExpiry} days.`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'subscription_reminder', daysUntilExpiry },
      },
      trigger: null,
    });
  }

  // Cancel notifications
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async cancelNotificationsByType(type: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(n => n.content.data?.type === type);
    
    for (const notification of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  // Get scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Handle notification response (when user taps notification)
  async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const { type, branch, ...data } = response.notification.request.content.data || {};

    switch (type) {
      case 'study_reminder':
        // Navigate to study screen
        break;
      case 'daily_mission':
        // Navigate to AI coaching screen
        break;
      case 'weekly_progress':
        // Navigate to analytics screen
        break;
      case 'achievement':
        // Show achievement details
        break;
      case 'pt_test_reminder':
        // Navigate to PT test screen
        break;
      case 'subscription_reminder':
        // Navigate to subscription screen
        break;
      default:
        // Navigate to dashboard
        break;
    }
  }

  // Test notification (for debugging)
  async sendTestNotification(branch: MilitaryBranch): Promise<void> {
    const branchGreetings = {
      ARMY: 'Test successful, Soldier! Hooah!',
      NAVY: 'Test complete, Sailor! Hooyah!',
      AIR_FORCE: 'Test accomplished, Airman! Hoorah!',
      MARINES: 'Test executed, Marine! Oorah!',
      COAST_GUARD: 'Test ready, Guardian! Hooyah!',
      SPACE_FORCE: 'Test launched, Guardian! Hoorah!',
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ASVAB Prep Test',
        body: branchGreetings[branch],
        sound: true,
        data: { type: 'test', branch },
      },
      trigger: { seconds: 1 },
    });
  }

  // Get push token for backend registration
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const pushNotificationService = new PushNotificationService();