import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';
import { apiService } from './api';
import { SubscriptionTier, PaymentProvider } from '@asvab-prep/shared';

export interface PurchaseProduct {
  productId: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  title: string;
  description: string;
}

export interface PurchaseResult {
  success: boolean;
  subscription?: any;
  error?: string;
  cancelled?: boolean;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  isInTrial: boolean;
  trialEndsAt?: Date;
  subscription?: any;
}

class PurchaseService {
  private isInitialized = false;
  private products: PurchaseProduct[] = [];

  // Product IDs for different platforms
  private readonly PRODUCT_IDS = {
    ios: {
      premium_monthly: 'com.asvabprep.premium.monthly',
    },
    android: {
      premium_monthly: 'com.asvabprep.premium.monthly',
    },
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const isAvailable = await InAppPurchases.isAvailableAsync();
      
      if (!isAvailable) {
        console.warn('In-app purchases not available on this device');
        return;
      }

      await InAppPurchases.connectAsync();
      
      // Get product IDs for current platform
      const platformProducts = Platform.OS === 'ios' 
        ? this.PRODUCT_IDS.ios 
        : this.PRODUCT_IDS.android;

      const productIds = Object.values(platformProducts);
      
      // Fetch product information
      const { results } = await InAppPurchases.getProductsAsync(productIds);
      
      this.products = results.map(product => ({
        productId: product.productId,
        price: product.price,
        priceAmountMicros: product.priceAmountMicros,
        priceCurrencyCode: product.priceCurrencyCode,
        title: product.title,
        description: product.description,
      }));

      // Set up purchase update listener
      InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          // Handle successful purchase
          if (results && results.length > 0) {
            const purchase = results[0];
            this.handlePurchaseSuccess(purchase);
          }
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('Purchase was cancelled by user');
        } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
          console.log('Purchase was deferred');
        } else {
          console.error('Purchase error:', errorCode);
        }
      });

      this.isInitialized = true;
      console.log('In-app purchases initialized successfully');
    } catch (error) {
      console.error('Failed to initialize in-app purchases:', error);
      throw error;
    }
  }

  async getProducts(): Promise<PurchaseProduct[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.products;
  }

  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('Attempting to purchase:', productId);
      
      const purchaseResult = await InAppPurchases.purchaseItemAsync(productId);
      
      if (purchaseResult.responseCode === InAppPurchases.IAPResponseCode.OK) {
        const purchase = purchaseResult.results?.[0];
        
        if (purchase) {
          // Verify purchase with backend
          const subscription = await this.verifyPurchaseWithBackend(purchase);
          
          if (subscription) {
            // Finish the transaction
            await InAppPurchases.finishTransactionAsync(purchase, true);
            
            return {
              success: true,
              subscription,
            };
          } else {
            // Finish the transaction but mark as failed
            await InAppPurchases.finishTransactionAsync(purchase, false);
            return {
              success: false,
              error: 'Failed to verify purchase with server',
            };
          }
        }
      } else if (purchaseResult.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        return {
          success: false,
          cancelled: true,
        };
      }

      return {
        success: false,
        error: 'Purchase failed with unknown error',
      };
    } catch (error) {
      console.error('Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown purchase error',
      };
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('Restoring purchases...');
      
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        // Find the most recent active subscription
        const activeSubscriptions = results.filter(purchase => 
          purchase.purchaseState === InAppPurchases.InAppPurchaseState.PURCHASED
        );
        
        if (activeSubscriptions.length > 0) {
          const latestPurchase = activeSubscriptions[activeSubscriptions.length - 1];
          
          // Verify with backend
          const subscription = await this.verifyPurchaseWithBackend(latestPurchase);
          
          if (subscription) {
            return {
              success: true,
              subscription,
            };
          }
        }
      }

      return {
        success: false,
        error: 'No active subscriptions found',
      };
    } catch (error) {
      console.error('Restore purchases error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore purchases',
      };
    }
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    try {
      const status = await apiService.getSubscriptionStatus();
      return {
        ...status,
        trialEndsAt: status.trialEndsAt ? new Date(status.trialEndsAt) : undefined,
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return null;
    }
  }

  async cancelSubscription(): Promise<boolean> {
    try {
      await apiService.cancelSubscription();
      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  private async verifyPurchaseWithBackend(purchase: any): Promise<any> {
    try {
      const paymentProvider = Platform.OS === 'ios' 
        ? PaymentProvider.APPLE_APP_STORE 
        : PaymentProvider.GOOGLE_PLAY;

      const verificationData = {
        tier: SubscriptionTier.PREMIUM,
        paymentProvider,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionId || purchase.transactionId,
        receipt: Platform.OS === 'ios' ? purchase.transactionReceipt : purchase.purchaseToken,
        receiptData: purchase,
      };

      const subscription = await apiService.createSubscription(verificationData);
      console.log('Purchase verified with backend:', subscription);
      
      return subscription;
    } catch (error) {
      console.error('Backend verification failed:', error);
      return null;
    }
  }

  private async handlePurchaseSuccess(purchase: any): Promise<void> {
    console.log('Purchase successful:', purchase);
    
    // This is called automatically by the purchase listener
    // The actual verification happens in purchaseSubscription method
  }

  async checkSubscriptionGate(feature: string): Promise<boolean> {
    try {
      return await apiService.checkSubscriptionGate(feature);
    } catch (error) {
      console.error('Failed to check subscription gate:', error);
      return false;
    }
  }

  async getSubscriptionUsage(): Promise<any> {
    try {
      return await apiService.getSubscriptionUsage();
    } catch (error) {
      console.error('Failed to get subscription usage:', error);
      return null;
    }
  }

  async getSubscriptionLimits(): Promise<any> {
    try {
      return await apiService.getSubscriptionLimits();
    } catch (error) {
      console.error('Failed to get subscription limits:', error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isInitialized) {
      try {
        await InAppPurchases.disconnectAsync();
        this.isInitialized = false;
        console.log('In-app purchases disconnected');
      } catch (error) {
        console.error('Failed to disconnect in-app purchases:', error);
      }
    }
  }

  // Helper method to get formatted price
  getFormattedPrice(productId: string): string {
    const product = this.products.find(p => p.productId === productId);
    return product?.price || '$9.97';
  }

  // Helper method to check if premium features are available
  async hasPremiumAccess(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    return status?.isActive || status?.isInTrial || false;
  }

  // Helper method to get trial status
  async getTrialInfo(): Promise<{ hasTrialAvailable: boolean; trialDaysLeft?: number }> {
    const status = await this.getSubscriptionStatus();
    
    if (!status) {
      return { hasTrialAvailable: true };
    }

    if (status.isInTrial && status.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(status.trialEndsAt);
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        hasTrialAvailable: false,
        trialDaysLeft: Math.max(0, daysLeft),
      };
    }

    return { hasTrialAvailable: false };
  }
}

export const purchaseService = new PurchaseService();