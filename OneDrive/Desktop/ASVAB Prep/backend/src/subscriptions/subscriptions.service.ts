import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeService } from './stripe.service';
import { AppStoreService } from './app-store.service';
import { GooglePlayService } from './google-play.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto, ValidateReceiptDto, SubscriptionUsageDto, SubscriptionLimitsDto } from './dto/subscription.dto';
import { SubscriptionTier, SubscriptionStatus, PaymentProvider } from '@asvab-prep/shared';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly appStoreService: AppStoreService,
    private readonly googlePlayService: GooglePlayService,
    private readonly configService: ConfigService,
  ) {}

  async getSubscriptionPlans() {
    return {
      plans: [
        {
          id: 'premium_monthly',
          name: 'Premium Monthly',
          price: 9.97,
          currency: 'USD',
          interval: 'month',
          features: [
            'Unlimited questions and quizzes',
            'Full ASVAB replica exam (2h 29min)',
            'Digital whiteboard/scratch paper',
            'Flashcards with spaced repetition',
            'Military jobs database',
            'Physical fitness tracking',
            'AI coaching and daily missions',
            'Social features and study groups',
            'Advanced progress analytics',
            'Export progress reports',
            'Daily intelligent notifications',
          ],
          trialDays: 7,
        },
      ],
      freeTier: {
        features: [
          '50 questions total',
          '1 quiz per day (max 10 questions)',
          '3 categories only',
          'Basic explanations',
          '5 quiz history entries',
          'Weekly notifications',
        ],
        limitations: [
          'Limited question access',
          'No ASVAB replica exam',
          'No whiteboard access',
          'No AI coaching',
          'No social features',
        ],
      },
    };
  }

  async getUserSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeSubscription = user.subscriptions[0];
    const isTrialActive = user.trialEndsAt ? new Date() < user.trialEndsAt : false;
    
    return {
      tier: user.subscriptionTier,
      isActive: user.subscriptionTier === SubscriptionTier.PREMIUM || isTrialActive,
      subscription: activeSubscription || null,
      trialEndsAt: user.trialEndsAt,
      isInTrial: isTrialActive,
      features: this.getAvailableFeatures(user.subscriptionTier, isTrialActive),
    };
  }

  async purchaseSubscription(userId: string, purchaseData: any) {
    const { platform, transactionId, receipt, productId } = purchaseData;

    try {
      let subscription;

      switch (platform) {
        case 'stripe':
          subscription = await this.handleStripeSubscription(userId, transactionId);
          break;
        case 'ios':
          subscription = await this.handleAppStoreSubscription(userId, receipt, transactionId);
          break;
        case 'android':
          subscription = await this.handleGooglePlaySubscription(userId, receipt, productId);
          break;
        default:
          throw new BadRequestException('Invalid platform');
      }

      // Update user subscription tier
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: SubscriptionTier.PREMIUM,
        },
      });

      return {
        success: true,
        subscription,
        message: 'Subscription activated successfully',
      };
    } catch (error) {
      console.error('Subscription purchase error:', error);
      throw new BadRequestException('Failed to process subscription');
    }
  }

  private async handleStripeSubscription(userId: string, subscriptionId: string) {
    const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
    
    return this.prisma.subscription.create({
      data: {
        userId,
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
    });
  }

  private async handleAppStoreSubscription(userId: string, receipt: string, transactionId: string) {
    const validation = await this.appStoreService.validateReceipt(receipt);
    
    if (!validation.isValid) {
      throw new BadRequestException('Invalid receipt');
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        appleTransactionId: transactionId,
        currentPeriodStart: new Date(validation.purchaseDate),
        currentPeriodEnd: new Date(validation.expiresDate),
      },
    });
  }

  private async handleGooglePlaySubscription(userId: string, purchaseToken: string, productId: string) {
    const validation = await this.googlePlayService.validatePurchase(productId, purchaseToken);
    
    if (!validation.isValid) {
      throw new BadRequestException('Invalid purchase');
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        googlePurchaseToken: purchaseToken,
        currentPeriodStart: new Date(validation.startTimeMillis),
        currentPeriodEnd: new Date(validation.expiryTimeMillis),
      },
    });
  }

  async restoreSubscription(userId: string, platform: string, receipt: string) {
    try {
      let validation;

      switch (platform) {
        case 'ios':
          validation = await this.appStoreService.validateReceipt(receipt);
          break;
        case 'android':
          // For Android, we need additional info like product ID
          throw new BadRequestException('Android restore requires additional parameters');
        default:
          throw new BadRequestException('Invalid platform for restore');
      }

      if (!validation.isValid) {
        throw new BadRequestException('Invalid receipt');
      }

      // Check if subscription already exists
      const existingSubscription = await this.prisma.subscription.findFirst({
        where: {
          OR: [
            { appleTransactionId: validation.transactionId },
            { googlePurchaseToken: receipt },
          ],
        },
      });

      if (existingSubscription) {
        // Update user if subscription exists but user isn't premium
        await this.prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: SubscriptionTier.PREMIUM },
        });

        return {
          success: true,
          message: 'Subscription restored successfully',
        };
      }

      // Create new subscription record
      await this.purchaseSubscription(userId, {
        platform,
        receipt,
        transactionId: validation.transactionId,
      });

      return {
        success: true,
        message: 'Subscription restored and activated',
      };
    } catch (error) {
      console.error('Subscription restore error:', error);
      throw new BadRequestException('Failed to restore subscription');
    }
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    // Handle cancellation based on platform
    if (subscription.stripeSubscriptionId) {
      await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
      },
    });

    return {
      success: true,
      message: 'Subscription will be canceled at the end of current period',
    };
  }

  async handleWebhook(platform: string, payload: any) {
    try {
      switch (platform) {
        case 'stripe':
          await this.handleStripeWebhook(payload);
          break;
        case 'apple':
          await this.handleAppStoreWebhook(payload);
          break;
        case 'google':
          await this.handleGooglePlayWebhook(payload);
          break;
        default:
          console.warn('Unknown webhook platform:', platform);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  private async handleStripeWebhook(event: any) {
    switch (event.type) {
      case 'customer.subscription.deleted':
        await this.deactivateSubscription(event.data.object.id, 'stripe');
        break;
      case 'customer.subscription.updated':
        await this.updateSubscriptionStatus(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object.subscription);
        break;
    }
  }

  private async handleAppStoreWebhook(notification: any) {
    // Handle App Store Server-to-Server notifications
    const { notification_type, latest_receipt_info } = notification;
    
    switch (notification_type) {
      case 'CANCEL':
        await this.deactivateSubscription(latest_receipt_info.transaction_id, 'apple');
        break;
      case 'RENEWAL':
        await this.renewSubscription(latest_receipt_info.transaction_id, 'apple');
        break;
    }
  }

  private async handleGooglePlayWebhook(notification: any) {
    // Handle Google Play Developer Notifications
    const { notificationType, subscriptionNotification } = notification;
    
    switch (notificationType) {
      case 'SUBSCRIPTION_CANCELED':
        await this.deactivateSubscription(subscriptionNotification.purchaseToken, 'google');
        break;
      case 'SUBSCRIPTION_RENEWED':
        await this.renewSubscription(subscriptionNotification.purchaseToken, 'google');
        break;
    }
  }

  private async deactivateSubscription(identifier: string, platform: string) {
    const whereClause = this.getWhereClause(identifier, platform);
    
    await this.prisma.subscription.updateMany({
      where: whereClause,
      data: {
        status: SubscriptionStatus.CANCELED,
      },
    });

    // Update user subscription tier
    const subscription = await this.prisma.subscription.findFirst({
      where: whereClause,
      include: { user: true },
    });

    if (subscription) {
      await this.prisma.user.update({
        where: { id: subscription.userId },
        data: { subscriptionTier: SubscriptionTier.FREE },
      });
    }
  }

  private async renewSubscription(identifier: string, platform: string) {
    const whereClause = this.getWhereClause(identifier, platform);
    
    await this.prisma.subscription.updateMany({
      where: whereClause,
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  private async updateSubscriptionStatus(stripeSubscription: any) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: stripeSubscription.status === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELED,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
    });
  }

  private async handlePaymentFailed(subscriptionId: string) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
  }

  private getWhereClause(identifier: string, platform: string) {
    switch (platform) {
      case 'stripe':
        return { stripeSubscriptionId: identifier };
      case 'apple':
        return { appleTransactionId: identifier };
      case 'google':
        return { googlePurchaseToken: identifier };
      default:
        throw new BadRequestException('Invalid platform');
    }
  }

  // Enhanced subscription service methods

  async createSubscription(userId: string, createSubscriptionDto: CreateSubscriptionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new ConflictException('User already has an active subscription');
    }

    // For premium subscription, set trial period if first time subscriber
    let trialEndsAt = null;
    if (createSubscriptionDto.tier === SubscriptionTier.PREMIUM && !user.hasHadTrial) {
      const now = new Date();
      trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await this.prisma.user.update({
        where: { id: userId },
        data: { hasHadTrial: true, trialEndsAt },
      });
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        tier: createSubscriptionDto.tier,
        status: SubscriptionStatus.ACTIVE,
        paymentProvider: createSubscriptionDto.paymentProvider,
        transactionId: createSubscriptionDto.transactionId,
        originalTransactionId: createSubscriptionDto.originalTransactionId,
        receiptData: createSubscriptionDto.receiptData,
        currentPeriodStart: new Date(),
        currentPeriodEnd: createSubscriptionDto.expiresAt ? new Date(createSubscriptionDto.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update user subscription tier
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: createSubscriptionDto.tier,
      },
    });

    return subscription;
  }

  async getSubscriptionUsage(userId: string): Promise<SubscriptionUsageDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Get today's quiz count
    const quizzesToday = await this.prisma.quiz.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    // Get total questions answered
    const questionsUsed = await this.prisma.quizAnswer.count({
      where: {
        quiz: {
          userId,
        },
      },
    });

    // Get categories accessed
    const categoriesAccessed = await this.prisma.question.groupBy({
      by: ['category'],
      where: {
        quizQuestions: {
          some: {
            quiz: {
              userId,
            },
          },
        },
      },
    }).then(categories => categories.length);

    // Get quiz history count
    const quizHistoryCount = await this.prisma.quiz.count({
      where: { userId },
    });

    const subscription = await this.getUserSubscriptionStatus(userId);
    const hasActiveSubscription = subscription.isActive;

    return {
      questionsUsed,
      quizzesToday,
      categoriesAccessed,
      quizHistoryCount,
      hasWhiteboardAccess: hasActiveSubscription,
      hasFlashcardAccess: hasActiveSubscription,
      hasSocialAccess: hasActiveSubscription,
      hasAdvancedAnalytics: hasActiveSubscription,
      hasExportAccess: hasActiveSubscription,
      canTakeAsvabreplica: hasActiveSubscription,
    };
  }

  async getSubscriptionLimits(userId: string): Promise<SubscriptionLimitsDto> {
    const subscription = await this.getUserSubscriptionStatus(userId);

    if (subscription.isActive) {
      return {
        maxQuestions: -1, // Unlimited
        maxQuizzesPerDay: -1, // Unlimited
        maxCategories: 9, // All categories
        maxQuizHistory: -1, // Unlimited
        hasUnlimitedAccess: true,
        canAccessPremiumFeatures: true,
        isTrialActive: subscription.isInTrial,
        trialEndsAt: subscription.trialEndsAt?.toISOString(),
      };
    }

    // Free tier limits
    return {
      maxQuestions: 50,
      maxQuizzesPerDay: 1,
      maxCategories: 3,
      maxQuizHistory: 5,
      hasUnlimitedAccess: false,
      canAccessPremiumFeatures: false,
      isTrialActive: false,
      trialEndsAt: null,
    };
  }

  async checkSubscriptionGate(userId: string, feature: string): Promise<boolean> {
    const limits = await this.getSubscriptionLimits(userId);
    const usage = await this.getSubscriptionUsage(userId);

    switch (feature) {
      case 'questions':
        return limits.maxQuestions === -1 || usage.questionsUsed < limits.maxQuestions;
      
      case 'daily_quiz':
        return limits.maxQuizzesPerDay === -1 || usage.quizzesToday < limits.maxQuizzesPerDay;
      
      case 'categories':
        return usage.categoriesAccessed < limits.maxCategories;
      
      case 'quiz_history':
        return limits.maxQuizHistory === -1 || usage.quizHistoryCount < limits.maxQuizHistory;
      
      case 'whiteboard':
        return usage.hasWhiteboardAccess;
      
      case 'flashcards':
        return usage.hasFlashcardAccess;
      
      case 'asvab_replica':
        return usage.canTakeAsvabreplica;
      
      case 'social':
        return usage.hasSocialAccess;
      
      case 'advanced_analytics':
        return usage.hasAdvancedAnalytics;
      
      case 'export':
        return usage.hasExportAccess;
      
      default:
        return limits.canAccessPremiumFeatures;
    }
  }

  async requireSubscriptionGate(userId: string, feature: string): Promise<void> {
    const hasAccess = await this.checkSubscriptionGate(userId, feature);
    
    if (!hasAccess) {
      const limits = await this.getSubscriptionLimits(userId);
      
      if (limits.isTrialActive) {
        throw new ForbiddenException(`Feature "${feature}" requires a premium subscription. Your trial expires on ${limits.trialEndsAt}.`);
      } else {
        throw new ForbiddenException(`Feature "${feature}" requires a premium subscription. Upgrade to access unlimited features.`);
      }
    }
  }

  private getAvailableFeatures(tier: SubscriptionTier, isTrialActive: boolean) {
    const hasPremiumAccess = tier === SubscriptionTier.PREMIUM || isTrialActive;
    
    return {
      unlimitedQuestions: hasPremiumAccess,
      unlimitedQuizzes: hasPremiumAccess,
      asvabReplica: hasPremiumAccess,
      whiteboard: hasPremiumAccess,
      flashcards: hasPremiumAccess,
      militaryJobs: hasPremiumAccess,
      physicalTracking: hasPremiumAccess,
      aiCoaching: hasPremiumAccess,
      socialFeatures: hasPremiumAccess,
      advancedAnalytics: hasPremiumAccess,
      exportReports: hasPremiumAccess,
      dailyNotifications: hasPremiumAccess,
      maxQuestionsPerDay: hasPremiumAccess ? -1 : 50, // -1 means unlimited
      maxQuizzesPerDay: hasPremiumAccess ? -1 : 1,
      maxQuizHistoryEntries: hasPremiumAccess ? -1 : 5,
    };
  }
}