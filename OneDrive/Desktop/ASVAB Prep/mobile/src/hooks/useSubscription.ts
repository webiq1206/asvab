import { useState, useEffect, useCallback } from 'react';
import { purchaseService, SubscriptionStatus } from '@/services/purchaseService';
import { useAuthStore } from '@/store/authStore';

export interface SubscriptionHookReturn {
  subscriptionStatus: SubscriptionStatus | null;
  usage: any;
  limits: any;
  loading: boolean;
  error: string | null;
  hasValidSubscription: boolean;
  isInTrial: boolean;
  isPremium: boolean;
  trialDaysLeft: number | null;
  refreshSubscription: () => Promise<void>;
  checkFeatureAccess: (feature: string) => Promise<boolean>;
  upgradeToSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

export const useSubscription = (): SubscriptionHookReturn => {
  const { user } = useAuthStore();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptionData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [status, usageData, limitsData] = await Promise.all([
        purchaseService.getSubscriptionStatus(),
        purchaseService.getSubscriptionUsage(),
        purchaseService.getSubscriptionLimits(),
      ]);

      setSubscriptionStatus(status);
      setUsage(usageData);
      setLimits(limitsData);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscriptionData();
  }, [loadSubscriptionData]);

  const checkFeatureAccess = useCallback(async (feature: string): Promise<boolean> => {
    try {
      return await purchaseService.checkSubscriptionGate(feature);
    } catch (error) {
      console.error('Failed to check feature access:', error);
      return false;
    }
  }, []);

  const upgradeToSubscription = useCallback(async () => {
    try {
      await purchaseService.initialize();
      const products = await purchaseService.getProducts();
      
      if (products.length === 0) {
        throw new Error('No subscription products available');
      }

      const result = await purchaseService.purchaseSubscription(products[0].productId);
      
      if (result.success) {
        await refreshSubscription();
        return result;
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      throw error;
    }
  }, [refreshSubscription]);

  const restorePurchases = useCallback(async () => {
    try {
      const result = await purchaseService.restorePurchases();
      
      if (result.success) {
        await refreshSubscription();
        return result;
      } else {
        throw new Error(result.error || 'No purchases to restore');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }, [refreshSubscription]);

  // Computed values
  const hasValidSubscription = subscriptionStatus?.isActive || false;
  const isInTrial = subscriptionStatus?.isInTrial || false;
  const isPremium = hasValidSubscription && !isInTrial;

  const trialDaysLeft = (() => {
    if (!subscriptionStatus?.trialEndsAt) return null;
    
    const now = new Date();
    const trialEnd = new Date(subscriptionStatus.trialEndsAt);
    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  })();

  return {
    subscriptionStatus,
    usage,
    limits,
    loading,
    error,
    hasValidSubscription,
    isInTrial,
    isPremium,
    trialDaysLeft,
    refreshSubscription,
    checkFeatureAccess,
    upgradeToSubscription,
    restorePurchases,
  };
};