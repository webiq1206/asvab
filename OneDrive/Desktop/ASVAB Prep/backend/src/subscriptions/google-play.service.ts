import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

interface GooglePlayValidation {
  isValid: boolean;
  startTimeMillis?: string;
  expiryTimeMillis?: string;
  autoRenewing?: boolean;
  priceCurrencyCode?: string;
  priceAmountMicros?: string;
  orderId?: string;
  error?: string;
}

@Injectable()
export class GooglePlayService {
  private androidPublisher: any;
  private packageName: string;

  constructor(private configService: ConfigService) {
    this.packageName = 'com.asvabprep.app'; // Your Android package name
    this.initializeGooglePlay();
  }

  private async initializeGooglePlay() {
    try {
      const serviceAccountPath = this.configService.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY');
      
      if (!serviceAccountPath) {
        console.warn('Google Play service account key not configured');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth,
      });
    } catch (error) {
      console.error('Failed to initialize Google Play service:', error);
    }
  }

  async validatePurchase(productId: string, purchaseToken: string): Promise<GooglePlayValidation> {
    try {
      if (!this.androidPublisher) {
        return {
          isValid: false,
          error: 'Google Play service not initialized',
        };
      }

      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      const purchase = response.data;

      // Check if subscription is valid and active
      const isValid = purchase.paymentState === 1; // 1 = Received, 0 = Pending
      const isActive = !purchase.cancelReason && !purchase.userCancellationTimeMillis;

      if (!isValid || !isActive) {
        return {
          isValid: false,
          error: 'Subscription is not active or payment failed',
        };
      }

      return {
        isValid: true,
        startTimeMillis: purchase.startTimeMillis,
        expiryTimeMillis: purchase.expiryTimeMillis,
        autoRenewing: purchase.autoRenewing,
        priceCurrencyCode: purchase.priceCurrencyCode,
        priceAmountMicros: purchase.priceAmountMicros,
        orderId: purchase.orderId,
      };
    } catch (error) {
      console.error('Google Play validation error:', error);
      return {
        isValid: false,
        error: error.message || 'Failed to validate purchase',
      };
    }
  }

  async cancelSubscription(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      if (!this.androidPublisher) {
        throw new Error('Google Play service not initialized');
      }

      await this.androidPublisher.purchases.subscriptions.cancel({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      return true;
    } catch (error) {
      console.error('Google Play cancellation error:', error);
      return false;
    }
  }

  async refundSubscription(productId: string, purchaseToken: string): Promise<boolean> {
    try {
      if (!this.androidPublisher) {
        throw new Error('Google Play service not initialized');
      }

      await this.androidPublisher.purchases.subscriptions.refund({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      return true;
    } catch (error) {
      console.error('Google Play refund error:', error);
      return false;
    }
  }

  async deferSubscription(productId: string, purchaseToken: string, expectedExpiryTimeMillis: string): Promise<boolean> {
    try {
      if (!this.androidPublisher) {
        throw new Error('Google Play service not initialized');
      }

      await this.androidPublisher.purchases.subscriptions.defer({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken,
        requestBody: {
          deferralInfo: {
            expectedExpiryTimeMillis,
            desiredExpiryTimeMillis: (parseInt(expectedExpiryTimeMillis) + 30 * 24 * 60 * 60 * 1000).toString(), // Add 30 days
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Google Play deferral error:', error);
      return false;
    }
  }

  async handleDeveloperNotification(notification: any) {
    const { subscriptionNotification, testNotification } = notification;

    if (testNotification) {
      console.log('Received Google Play test notification');
      return { type: 'TEST' };
    }

    if (!subscriptionNotification) {
      console.warn('Unknown Google Play notification format');
      return null;
    }

    const { notificationType, purchaseToken, subscriptionId } = subscriptionNotification;

    switch (notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
        return {
          type: 'RECOVERED',
          subscriptionId,
          purchaseToken,
        };
      case 2: // SUBSCRIPTION_RENEWED
        return {
          type: 'RENEWED',
          subscriptionId,
          purchaseToken,
        };
      case 3: // SUBSCRIPTION_CANCELED
        return {
          type: 'CANCELED',
          subscriptionId,
          purchaseToken,
        };
      case 4: // SUBSCRIPTION_PURCHASED
        return {
          type: 'PURCHASED',
          subscriptionId,
          purchaseToken,
        };
      case 5: // SUBSCRIPTION_ON_HOLD
        return {
          type: 'ON_HOLD',
          subscriptionId,
          purchaseToken,
        };
      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        return {
          type: 'GRACE_PERIOD',
          subscriptionId,
          purchaseToken,
        };
      case 7: // SUBSCRIPTION_RESTARTED
        return {
          type: 'RESTARTED',
          subscriptionId,
          purchaseToken,
        };
      case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
        return {
          type: 'PRICE_CHANGE_CONFIRMED',
          subscriptionId,
          purchaseToken,
        };
      case 9: // SUBSCRIPTION_DEFERRED
        return {
          type: 'DEFERRED',
          subscriptionId,
          purchaseToken,
        };
      case 10: // SUBSCRIPTION_PAUSED
        return {
          type: 'PAUSED',
          subscriptionId,
          purchaseToken,
        };
      case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
        return {
          type: 'PAUSE_SCHEDULE_CHANGED',
          subscriptionId,
          purchaseToken,
        };
      case 12: // SUBSCRIPTION_REVOKED
        return {
          type: 'REVOKED',
          subscriptionId,
          purchaseToken,
        };
      case 13: // SUBSCRIPTION_EXPIRED
        return {
          type: 'EXPIRED',
          subscriptionId,
          purchaseToken,
        };
      default:
        console.log('Unknown Google Play notification type:', notificationType);
        return null;
    }
  }

  async getSubscriptionDetails(productId: string, purchaseToken: string) {
    try {
      if (!this.androidPublisher) {
        throw new Error('Google Play service not initialized');
      }

      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get subscription details:', error);
      return null;
    }
  }
}