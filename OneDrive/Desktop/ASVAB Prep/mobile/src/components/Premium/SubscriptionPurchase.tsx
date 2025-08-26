import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { MilitaryBranch } from '@asvab-prep/shared';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { purchaseService, PurchaseProduct, PurchaseResult } from '@/services/purchaseService';
import { MilitaryCard, MilitaryCardHeader, MilitaryCardContent } from '../UI/MilitaryCard';

interface SubscriptionPurchaseProps {
  onClose: () => void;
  onSuccess: (result: PurchaseResult) => void;
  branch?: MilitaryBranch;
}

export const SubscriptionPurchase: React.FC<SubscriptionPurchaseProps> = ({
  onClose,
  onSuccess,
  branch,
}) => {
  const { user } = useAuthStore();
  const userBranch = branch || user?.selectedBranch || MilitaryBranch.ARMY;
  const branchColor = theme.branchColors[userBranch];

  const [products, setProducts] = useState<PurchaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      await purchaseService.initialize();
      const availableProducts = await purchaseService.getProducts();
      setProducts(availableProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert(
        'Connection Error',
        'Failed to load subscription options. Please check your connection and try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(true);
      
      const result = await purchaseService.purchaseSubscription(productId);
      
      if (result.success) {
        Alert.alert(
          'Mission Accomplished!',
          'Welcome to Premium! You now have access to all advanced training features.',
          [{ text: 'Continue', onPress: () => onSuccess(result) }]
        );
      } else if (result.cancelled) {
        // User cancelled, no action needed
      } else {
        Alert.alert(
          'Purchase Failed',
          result.error || 'Failed to process your purchase. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      
      const result = await purchaseService.restorePurchases();
      
      if (result.success) {
        Alert.alert(
          'Subscription Restored!',
          'Your premium subscription has been successfully restored.',
          [{ text: 'Continue', onPress: () => onSuccess(result) }]
        );
      } else {
        Alert.alert(
          'No Subscription Found',
          'No active subscription found to restore. If you believe this is an error, please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert(
        'Restore Error',
        'Failed to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRestoring(false);
    }
  };

  const getMilitaryGreeting = (): string => {
    switch (userBranch) {
      case MilitaryBranch.ARMY:
        return "Ready to upgrade your arsenal, Soldier? Premium access unlocks elite training capabilities!";
      case MilitaryBranch.NAVY:
        return "Time to chart a premium course, Sailor! Upgrade for ship-shape training excellence!";
      case MilitaryBranch.AIR_FORCE:
        return "Ready for takeoff, Airman? Premium features will elevate your training to new heights!";
      case MilitaryBranch.MARINES:
        return "Semper Fi, Marine! Premium access delivers the tactical advantage you need!";
      case MilitaryBranch.COAST_GUARD:
        return "Semper Paratus, Coastie! Premium training keeps you always ready!";
      case MilitaryBranch.SPACE_FORCE:
        return "Reach for the stars, Guardian! Premium features unlock stellar training potential!";
      default:
        return "Ready to unlock premium training features?";
    }
  };

  const getPremiumFeatures = () => [
    { icon: 'infinite', text: 'Unlimited questions and quizzes' },
    { icon: 'star', text: 'Full ASVAB replica exam (2h 29min)' },
    { icon: 'create', text: 'Digital whiteboard/scratch paper' },
    { icon: 'duplicate', text: 'Flashcards with spaced repetition' },
    { icon: 'briefcase', text: 'Military jobs database' },
    { icon: 'fitness', text: 'Physical fitness tracking' },
    { icon: 'bulb', text: 'AI coaching and daily missions' },
    { icon: 'people', text: 'Social features and study groups' },
    { icon: 'analytics', text: 'Advanced progress analytics' },
    { icon: 'download', text: 'Export progress reports' },
    { icon: 'notifications', text: 'Daily intelligent notifications' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.DARK_OLIVE }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={branchColor} />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.DARK_OLIVE }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: branchColor }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={[styles.premiumIcon, { backgroundColor: `${branchColor}20` }]}>
            <Ionicons name="star" size={32} color={branchColor} />
          </View>
          <Text style={[styles.headerTitle, { color: branchColor }]}>
            PREMIUM UPGRADE
          </Text>
          <Text style={styles.headerSubtitle}>
            ELITE TRAINING ACCESS
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Welcome Message */}
        <MilitaryCard variant="command" branch={userBranch} style={styles.welcomeCard}>
          <MilitaryCardHeader
            title="MISSION BRIEFING"
            subtitle="Premium features overview"
            variant="command"
          />
          <MilitaryCardContent>
            <Text style={styles.welcomeText}>
              {getMilitaryGreeting()}
            </Text>
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Features List */}
        <MilitaryCard variant="intel" branch={userBranch} style={styles.featuresCard}>
          <MilitaryCardHeader
            title="PREMIUM CAPABILITIES"
            subtitle="Advanced training features"
            variant="intel"
          />
          <MilitaryCardContent>
            <View style={styles.featuresList}>
              {getPremiumFeatures().map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: `${theme.colors.SUCCESS}20` }]}>
                    <Ionicons name={feature.icon as any} size={16} color={theme.colors.SUCCESS} />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Subscription Options */}
        <MilitaryCard variant="tactical" branch={userBranch} style={styles.subscriptionCard}>
          <MilitaryCardHeader
            title="SUBSCRIPTION PLAN"
            subtitle="Choose your access level"
            variant="tactical"
          />
          <MilitaryCardContent>
            {products.length > 0 ? (
              products.map((product) => (
                <View key={product.productId} style={[styles.planOption, { borderColor: branchColor }]}>
                  <View style={styles.planHeader}>
                    <Text style={[styles.planTitle, { color: branchColor }]}>
                      PREMIUM MONTHLY
                    </Text>
                    <View style={styles.trialBadge}>
                      <Text style={styles.trialBadgeText}>7-DAY FREE TRIAL</Text>
                    </View>
                  </View>
                  
                  <View style={styles.priceContainer}>
                    <Text style={[styles.price, { color: branchColor }]}>
                      {product.price}
                    </Text>
                    <Text style={styles.pricePeriod}>/month</Text>
                  </View>
                  
                  <Text style={styles.planDescription}>
                    Full access to all premium features with 7-day free trial. 
                    Cancel anytime during trial period.
                  </Text>
                  
                  <TouchableOpacity
                    style={[styles.purchaseButton, { backgroundColor: branchColor }]}
                    onPress={() => handlePurchase(product.productId)}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="star" size={20} color="#FFFFFF" />
                        <Text style={styles.purchaseButtonText}>
                          START FREE TRIAL
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>
                  No subscription options available at the moment. Please try again later.
                </Text>
              </View>
            )}
          </MilitaryCardContent>
        </MilitaryCard>

        {/* Restore Purchases */}
        <View style={styles.restoreSection}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={theme.colors.KHAKI} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={theme.colors.KHAKI} />
                <Text style={styles.restoreButtonText}>
                  Restore Previous Purchase
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            • Payment will be charged to your App Store or Google Play account
          </Text>
          <Text style={styles.termsText}>
            • Subscription automatically renews unless cancelled 24 hours before renewal
          </Text>
          <Text style={styles.termsText}>
            • Cancel anytime in your App Store or Google Play account settings
          </Text>
          <Text style={styles.termsText}>
            • Free trial converts to paid subscription if not cancelled
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    marginTop: theme.spacing[4],
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 2,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: theme.spacing[4],
    zIndex: 2,
    padding: theme.spacing[2],
  },
  headerContent: {
    alignItems: 'center',
  },
  premiumIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  headerTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xl,
    marginBottom: theme.spacing[1],
  },
  headerSubtitle: {
    fontFamily: theme.fonts.military.medium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
  },
  content: {
    padding: theme.spacing[4],
  },
  welcomeCard: {
    marginBottom: theme.spacing[4],
  },
  welcomeText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  featuresCard: {
    marginBottom: theme.spacing[4],
  },
  featuresList: {
    gap: theme.spacing[3],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  featureText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    flex: 1,
  },
  subscriptionCard: {
    marginBottom: theme.spacing[4],
  },
  planOption: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  planTitle: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.lg,
  },
  trialBadge: {
    backgroundColor: theme.colors.SUCCESS,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  trialBadgeText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xs,
    color: '#FFFFFF',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing[3],
  },
  price: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.xxl,
  },
  pricePeriod: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    marginLeft: theme.spacing[1],
  },
  planDescription: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.KHAKI,
    lineHeight: 18,
    marginBottom: theme.spacing[4],
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing[2],
  },
  purchaseButtonText: {
    fontFamily: theme.fonts.military.bold,
    fontSize: theme.fontSizes.base,
    color: '#FFFFFF',
  },
  noProductsContainer: {
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  noProductsText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
    textAlign: 'center',
  },
  restoreSection: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[2],
  },
  restoreButtonText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.base,
    color: theme.colors.KHAKI,
  },
  termsSection: {
    padding: theme.spacing[4],
    backgroundColor: `${theme.colors.MILITARY_GREEN}20`,
    borderRadius: theme.borderRadius.base,
  },
  termsText: {
    fontFamily: theme.fonts.body.regular,
    fontSize: theme.fontSizes.xs,
    color: theme.colors.KHAKI,
    lineHeight: 16,
    marginBottom: theme.spacing[1],
  },
});