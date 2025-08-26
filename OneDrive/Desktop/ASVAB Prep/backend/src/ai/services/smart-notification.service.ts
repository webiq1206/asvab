import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MilitaryBranch, QuestionCategory, SubscriptionTier } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SmartNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'MOTIVATION' | 'REMINDER' | 'ACHIEVEMENT' | 'CHALLENGE' | 'TIP' | 'MILESTONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  scheduledFor: Date;
  data?: Record<string, any>;
  militaryTone: boolean;
  personalized: boolean;
}

export interface NotificationStrategy {
  userId: string;
  preferredTimes: number[]; // Hours in 24h format
  frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  enabledTypes: string[];
  maxDailyNotifications: number;
  quietHours: { start: number; end: number };
}

export interface EngagementTrigger {
  name: string;
  condition: (userActivity: any) => boolean;
  notification: (user: any) => SmartNotification;
  cooldownHours: number;
}

@Injectable()
export class SmartNotificationService {
  private readonly logger = new Logger(SmartNotificationService.name);
  private readonly engagementTriggers: EngagementTrigger[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.initializeEngagementTriggers();
  }

  async generateIntelligentNotifications(userId: string): Promise<SmartNotification[]> {
    try {
      // Get user profile and activity data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          quizzes: {
            orderBy: { completedAt: 'desc' },
            take: 10,
            include: {
              questions: {
                select: {
                  category: true,
                  isCorrect: true,
                  timeSpent: true,
                },
              },
            },
          },
          notifications: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's notification strategy
      const strategy = await this.getUserNotificationStrategy(userId);

      // Analyze user activity patterns
      const activityAnalysis = await this.analyzeUserActivity(user);

      // Generate context-aware notifications
      const notifications: SmartNotification[] = [];

      // Check engagement triggers
      for (const trigger of this.engagementTriggers) {
        if (await this.shouldTriggerNotification(trigger, user, activityAnalysis)) {
          const notification = trigger.notification(user);
          notifications.push(notification);
        }
      }

      // Generate motivational notifications
      const motivationalNotification = await this.generateMotivationalNotification(user, activityAnalysis);
      if (motivationalNotification) {
        notifications.push(motivationalNotification);
      }

      // Generate study reminders based on optimal times
      const studyReminder = await this.generateOptimalStudyReminder(user, strategy, activityAnalysis);
      if (studyReminder) {
        notifications.push(studyReminder);
      }

      // Generate achievement notifications
      const achievementNotifications = await this.generateAchievementNotifications(user, activityAnalysis);
      notifications.push(...achievementNotifications);

      // Filter and prioritize based on strategy
      const filteredNotifications = this.filterNotificationsByStrategy(notifications, strategy);

      // Schedule notifications at optimal times
      const scheduledNotifications = this.scheduleOptimalTiming(filteredNotifications, strategy);

      this.logger.log(`Generated ${scheduledNotifications.length} intelligent notifications for user ${userId}`);

      return scheduledNotifications;
    } catch (error) {
      this.logger.error(`Failed to generate intelligent notifications:`, error);
      throw new Error('Failed to generate notifications');
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      
      // Get notifications scheduled for this hour
      const scheduledNotifications = await this.prisma.notification.findMany({
        where: {
          scheduledFor: {
            lte: now,
          },
          sent: false,
        },
        include: {
          user: {
            select: {
              id: true,
              selectedBranch: true,
              subscriptionTier: true,
              pushToken: true,
            },
          },
        },
      });

      this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

      for (const notification of scheduledNotifications) {
        try {
          await this.sendNotification(notification);
          
          // Mark as sent
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { 
              sent: true,
              sentAt: now,
            },
          });

          this.logger.debug(`Sent notification ${notification.id} to user ${notification.userId}`);
        } catch (error) {
          this.logger.error(`Failed to send notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications:', error);
    }
  }

  async updateNotificationStrategy(userId: string, strategy: Partial<NotificationStrategy>): Promise<void> {
    try {
      await this.prisma.notificationPreference.upsert({
        where: { userId },
        create: {
          userId,
          ...strategy,
          updatedAt: new Date(),
        },
        update: {
          ...strategy,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated notification strategy for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update notification strategy:`, error);
      throw new Error('Failed to update notification strategy');
    }
  }

  private async getUserNotificationStrategy(userId: string): Promise<NotificationStrategy> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Default strategy if none exists
    return preferences || {
      userId,
      preferredTimes: [9, 18], // 9 AM and 6 PM
      frequency: 'DAILY',
      enabledTypes: ['MOTIVATION', 'REMINDER', 'ACHIEVEMENT'],
      maxDailyNotifications: 3,
      quietHours: { start: 22, end: 7 }, // 10 PM to 7 AM
    };
  }

  private async analyzeUserActivity(user: any) {
    const now = new Date();
    const daysSinceLastLogin = user.lastLoginAt ? 
      Math.floor((now.getTime() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    const recentQuizzes = user.quizzes.filter((q: any) => 
      q.completedAt && q.completedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const totalQuestions = recentQuizzes.reduce((sum: number, quiz: any) => sum + quiz.questions.length, 0);
    const correctAnswers = recentQuizzes.reduce(
      (sum: number, quiz: any) => sum + quiz.questions.filter((q: any) => q.isCorrect).length,
      0
    );

    const currentAccuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const studyStreak = user.profile?.studyStreak || 0;

    // Analyze study patterns
    const studyTimes = recentQuizzes.map((q: any) => new Date(q.completedAt).getHours());
    const preferredStudyHour = studyTimes.length > 0 ? 
      studyTimes.reduce((a, b, i, arr) => arr.filter(val => val === a).length >= arr.filter(val => val === b).length ? a : b) : 
      18; // Default to 6 PM

    return {
      daysSinceLastLogin,
      recentQuizzes: recentQuizzes.length,
      currentAccuracy,
      studyStreak,
      preferredStudyHour,
      isAtRisk: daysSinceLastLogin > 3 || studyStreak === 0,
      isEngaged: recentQuizzes.length > 3 && studyStreak > 0,
      needsMotivation: currentAccuracy < 0.6 || studyStreak < 3,
    };
  }

  private initializeEngagementTriggers(): void {
    this.engagementTriggers.push(
      // Streak break recovery
      {
        name: 'streak_break_recovery',
        condition: (activity) => activity.studyStreak === 0 && activity.daysSinceLastLogin > 1,
        notification: (user) => ({
          id: '',
          userId: user.id,
          title: this.getMilitaryGreeting(user.selectedBranch) + ' Time to Regroup!',
          body: this.generateStreakRecoveryMessage(user.selectedBranch),
          type: 'MOTIVATION',
          priority: 'HIGH',
          scheduledFor: this.calculateOptimalTime(user.id, 18),
          militaryTone: true,
          personalized: true,
        }),
        cooldownHours: 24,
      },

      // Performance decline intervention
      {
        name: 'performance_decline',
        condition: (activity) => activity.currentAccuracy < 0.5 && activity.recentQuizzes > 2,
        notification: (user) => ({
          id: '',
          userId: user.id,
          title: 'Tactical Adjustment Needed, Soldier!',
          body: this.generatePerformanceBoostMessage(user.selectedBranch),
          type: 'TIP',
          priority: 'MEDIUM',
          scheduledFor: this.calculateOptimalTime(user.id, 20),
          militaryTone: true,
          personalized: true,
        }),
        cooldownHours: 48,
      },

      // Engagement reward
      {
        name: 'high_engagement_reward',
        condition: (activity) => activity.studyStreak >= 7 && activity.currentAccuracy > 0.8,
        notification: (user) => ({
          id: '',
          userId: user.id,
          title: '🎖️ Outstanding Performance!',
          body: this.generateHighPerformanceReward(user.selectedBranch, user.profile?.studyStreak),
          type: 'ACHIEVEMENT',
          priority: 'HIGH',
          scheduledFor: this.calculateOptimalTime(user.id, 19),
          militaryTone: true,
          personalized: true,
        }),
        cooldownHours: 72,
      },

      // Weekend warrior motivation
      {
        name: 'weekend_motivation',
        condition: (activity) => {
          const isWeekend = [0, 6].includes(new Date().getDay());
          return isWeekend && activity.daysSinceLastLogin < 2;
        },
        notification: (user) => ({
          id: '',
          userId: user.id,
          title: 'Weekend Training Mission',
          body: this.generateWeekendMotivation(user.selectedBranch),
          type: 'CHALLENGE',
          priority: 'MEDIUM',
          scheduledFor: this.calculateOptimalTime(user.id, 10),
          militaryTone: true,
          personalized: true,
        }),
        cooldownHours: 48,
      }
    );
  }

  private async shouldTriggerNotification(
    trigger: EngagementTrigger,
    user: any,
    activity: any
  ): Promise<boolean> {
    // Check if condition is met
    if (!trigger.condition(activity)) {
      return false;
    }

    // Check cooldown period
    const recentNotification = await this.prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: trigger.name,
        createdAt: {
          gte: new Date(Date.now() - trigger.cooldownHours * 60 * 60 * 1000),
        },
      },
    });

    return !recentNotification;
  }

  private async generateMotivationalNotification(user: any, activity: any): Promise<SmartNotification | null> {
    if (!activity.needsMotivation) return null;

    return {
      id: '',
      userId: user.id,
      title: this.generateMotivationalTitle(user.selectedBranch),
      body: this.generateMotivationalBody(user.selectedBranch, activity),
      type: 'MOTIVATION',
      priority: 'MEDIUM',
      scheduledFor: this.calculateOptimalTime(user.id, 17),
      militaryTone: true,
      personalized: true,
    };
  }

  private async generateOptimalStudyReminder(
    user: any,
    strategy: NotificationStrategy,
    activity: any
  ): Promise<SmartNotification | null> {
    if (activity.recentQuizzes > 0) return null; // Already studied recently

    const optimalHour = activity.preferredStudyHour || strategy.preferredTimes[0];

    return {
      id: '',
      userId: user.id,
      title: 'Mission Briefing Time!',
      body: this.generateStudyReminderBody(user.selectedBranch, activity.studyStreak),
      type: 'REMINDER',
      priority: 'MEDIUM',
      scheduledFor: this.calculateOptimalTime(user.id, optimalHour),
      data: {
        recommendedDuration: 20,
        focusAreas: this.getRecommendedFocusAreas(user),
      },
      militaryTone: true,
      personalized: true,
    };
  }

  private async generateAchievementNotifications(user: any, activity: any): Promise<SmartNotification[]> {
    const achievements: SmartNotification[] = [];

    // Streak milestones
    if ([7, 14, 30, 60, 100].includes(activity.studyStreak)) {
      achievements.push({
        id: '',
        userId: user.id,
        title: `🔥 ${activity.studyStreak}-Day Streak Achievement!`,
        body: this.generateStreakAchievement(user.selectedBranch, activity.studyStreak),
        type: 'ACHIEVEMENT',
        priority: 'HIGH',
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        militaryTone: true,
        personalized: true,
      });
    }

    // Accuracy milestones
    if (activity.currentAccuracy >= 0.9 && activity.recentQuizzes >= 5) {
      achievements.push({
        id: '',
        userId: user.id,
        title: '🎯 Sharpshooter Achievement!',
        body: this.generateAccuracyAchievement(user.selectedBranch, activity.currentAccuracy),
        type: 'ACHIEVEMENT',
        priority: 'HIGH',
        scheduledFor: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
        militaryTone: true,
        personalized: true,
      });
    }

    return achievements;
  }

  private filterNotificationsByStrategy(
    notifications: SmartNotification[],
    strategy: NotificationStrategy
  ): SmartNotification[] {
    return notifications
      .filter(notif => strategy.enabledTypes.includes(notif.type))
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
      .slice(0, strategy.maxDailyNotifications);
  }

  private scheduleOptimalTiming(
    notifications: SmartNotification[],
    strategy: NotificationStrategy
  ): SmartNotification[] {
    return notifications.map((notif, index) => {
      const baseTime = strategy.preferredTimes[index % strategy.preferredTimes.length];
      const scheduledTime = this.calculateOptimalTime(notif.userId, baseTime);
      
      return {
        ...notif,
        scheduledFor: scheduledTime,
      };
    });
  }

  private calculateOptimalTime(userId: string, preferredHour: number): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(preferredHour, 0, 0, 0);
    
    // Add some randomization to avoid spam feeling
    const randomMinutes = Math.floor(Math.random() * 30) - 15; // ±15 minutes
    tomorrow.setMinutes(tomorrow.getMinutes() + randomMinutes);
    
    return tomorrow;
  }

  private async sendNotification(notification: any): Promise<void> {
    // This would integrate with your push notification service (Firebase, AWS SNS, etc.)
    this.logger.debug(`Sending notification to user ${notification.userId}: ${notification.title}`);
    
    // Implementation would depend on your push notification provider
    // Example: await this.pushNotificationService.send(notification);
  }

  // Message generation methods
  private getMilitaryGreeting(branch: MilitaryBranch): string {
    const greetings = {
      [MilitaryBranch.ARMY]: 'Hooah, Soldier!',
      [MilitaryBranch.NAVY]: 'Hooyah, Sailor!',
      [MilitaryBranch.AIR_FORCE]: 'Hoorah, Airman!',
      [MilitaryBranch.MARINES]: 'Oorah, Marine!',
      [MilitaryBranch.COAST_GUARD]: 'Hooyah, Coastie!',
      [MilitaryBranch.SPACE_FORCE]: 'Hoorah, Guardian!',
    };
    return greetings[branch] || 'Attention, Soldier!';
  }

  private generateStreakRecoveryMessage(branch: MilitaryBranch): string {
    const messages = {
      [MilitaryBranch.ARMY]: 'Every great soldier faces setbacks. Time to rally and rebuild that study streak! Army Strong!',
      [MilitaryBranch.NAVY]: 'The tide has turned, but sailors adapt and overcome. Get back on course, Sailor!',
      [MilitaryBranch.AIR_FORCE]: 'Even the best pilots face turbulence. Time to regain altitude and soar again!',
      [MilitaryBranch.MARINES]: 'Marines never quit! Dust yourself off and charge back into battle!',
      [MilitaryBranch.COAST_GUARD]: 'Every rescue starts with taking action. Time to save your study streak!',
      [MilitaryBranch.SPACE_FORCE]: 'Mission failure is not an option. Recalibrate and launch back to success!',
    };
    return messages[branch] || 'Time to get back in the fight! Your mission awaits!';
  }

  private generatePerformanceBoostMessage(branch: MilitaryBranch): string {
    return `Your recent scores suggest it's time for tactical adjustment. Focus on your weak areas and remember - every expert was once a beginner. ${this.getMilitaryMotivation(branch)}`;
  }

  private generateHighPerformanceReward(branch: MilitaryBranch, streak: number): string {
    return `${streak} days of consistent excellence! You're demonstrating the discipline that makes great ${this.getBranchName(branch)}. Keep up this outstanding performance!`;
  }

  private generateWeekendMotivation(branch: MilitaryBranch): string {
    return `Weekend warriors train when others rest! Use this time to sharpen your skills and gain the edge. ${this.getMilitaryMotivation(branch)}`;
  }

  private generateMotivationalTitle(branch: MilitaryBranch): string {
    const titles = [
      `${this.getMilitaryGreeting(branch)} Mission Awaits!`,
      `Training Call for ${this.getBranchName(branch)}!`,
      'Your Daily Mission Brief',
      'Excellence Demands Action!',
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private generateMotivationalBody(branch: MilitaryBranch, activity: any): string {
    if (activity.currentAccuracy < 0.5) {
      return `Every expert was once a beginner. Focus on your fundamentals and build from there. ${this.getMilitaryMotivation(branch)}`;
    }
    return `Consistency builds champions. A few minutes of focused study today builds tomorrow's success. ${this.getMilitaryMotivation(branch)}`;
  }

  private generateStudyReminderBody(branch: MilitaryBranch, streak: number): string {
    if (streak === 0) {
      return `Time to start building your study discipline! 20 minutes today can change your military career trajectory.`;
    }
    return `Maintain your ${streak}-day momentum! Your dedication is building the foundation for military success.`;
  }

  private generateStreakAchievement(branch: MilitaryBranch, streak: number): string {
    return `${streak} consecutive days of training! You're showing the discipline that defines elite ${this.getBranchName(branch)}. Outstanding dedication!`;
  }

  private generateAccuracyAchievement(branch: MilitaryBranch, accuracy: number): string {
    const percentage = Math.round(accuracy * 100);
    return `${percentage}% accuracy demonstrates precision and mastery! You're ready for the most demanding military roles.`;
  }

  private getBranchName(branch: MilitaryBranch): string {
    const names = {
      [MilitaryBranch.ARMY]: 'Soldiers',
      [MilitaryBranch.NAVY]: 'Sailors',
      [MilitaryBranch.AIR_FORCE]: 'Airmen',
      [MilitaryBranch.MARINES]: 'Marines',
      [MilitaryBranch.COAST_GUARD]: 'Coast Guardsmen',
      [MilitaryBranch.SPACE_FORCE]: 'Guardians',
    };
    return names[branch] || 'Military Personnel';
  }

  private getMilitaryMotivation(branch: MilitaryBranch): string {
    const motivations = {
      [MilitaryBranch.ARMY]: 'Army Strong!',
      [MilitaryBranch.NAVY]: 'Anchors Aweigh!',
      [MilitaryBranch.AIR_FORCE]: 'Aim High!',
      [MilitaryBranch.MARINES]: 'Semper Fi!',
      [MilitaryBranch.COAST_GUARD]: 'Semper Paratus!',
      [MilitaryBranch.SPACE_FORCE]: 'Semper Supra!',
    };
    return motivations[branch] || 'Mission First!';
  }

  private getRecommendedFocusAreas(user: any): string[] {
    // This would analyze user's weak areas and return recommendations
    return ['Arithmetic Reasoning', 'Mathematics Knowledge'];
  }

  private getPriorityWeight(priority: string): number {
    const weights = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return weights[priority as keyof typeof weights] || 1;
  }
}