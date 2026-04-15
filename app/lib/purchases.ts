import * as InAppPurchases from 'expo-iap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/app/lib/supabase';
import { TIER_STORAGE_KEY } from '@/app/lib/subscription';
import type { UserTier } from '@/app/lib/subscription';

// ── Product IDs (must match App Store Connect exactly) ────────────────────────

export const PRODUCT_IDS = {
  PLUS_MONTHLY:  'com.pgat.allure.plus.monthly',
  PLUS_YEARLY:   'com.pgat.allure.plus.yearly',
  PP_MONTHLY:    'com.pgat.allure.plusplus.monthly',
  PP_YEARLY:     'com.pgat.allure.plusplus.yearly',
} as const;

export type ProductId = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS];

// ── Internal state ────────────────────────────────────────────────────────────

let initialized = false;
let onSuccessCallback: ((tier: UserTier) => void) | null = null;

/** Register a callback that fires after a successful purchase is finalized. */
export function setOnPurchaseSuccess(cb: (tier: UserTier) => void) {
  onSuccessCallback = cb;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierFromProductId(productId: string): UserTier {
  if (productId.includes('plusplus')) return 'plusplus';
  if (productId.includes('plus'))     return 'plus';
  return 'free';
}

async function persistTier(userId: string, tier: UserTier): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(TIER_STORAGE_KEY, tier),
    supabase
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', userId),
  ]);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Connect to StoreKit and register the purchase listener.
 * Safe to call on every app startup — guarded against double-init.
 */
export async function initializePurchases(): Promise<void> {
  if (initialized) return;
  try {
    await InAppPurchases.connectAsync();
    initialized = true;

    InAppPurchases.setPurchaseListener(async ({ responseCode, results }) => {
      if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results?.length) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      for (const purchase of results) {
        if (!purchase.acknowledged) {
          // Finish the transaction with shouldConsume=false (subscriptions are non-consumable)
          await InAppPurchases.finishTransactionAsync(purchase, false);
          const tier = tierFromProductId(purchase.productId);
          await persistTier(userData.user.id, tier);
          onSuccessCallback?.(tier);
        }
      }
    });
  } catch (err) {
    console.log('[IAP] init error:', err);
  }
}

/**
 * Fetch localised product info from the App Store.
 * Returns an empty array if the store is unavailable.
 */
export async function getProducts(): Promise<InAppPurchases.IAPItemDetails[]> {
  try {
    const { responseCode, results } = await InAppPurchases.getProductsAsync(
      Object.values(PRODUCT_IDS)
    );
    if (responseCode === InAppPurchases.IAPResponseCode.OK) return results ?? [];
    return [];
  } catch {
    return [];
  }
}

/**
 * Present the App Store payment sheet for a given product.
 * The result is delivered asynchronously via the purchase listener.
 */
export async function purchaseProduct(productId: ProductId): Promise<void> {
  await InAppPurchases.purchaseItemAsync(productId);
}

/**
 * Restore previous purchases (required button for App Store review).
 * Updates Supabase and AsyncStorage, returns the restored tier.
 */
export async function restorePurchases(): Promise<UserTier> {
  try {
    const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
    if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results?.length) return 'free';

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return 'free';

    // Prefer plusplus, then plus
    const best =
      results.find(p => p.productId.includes('plusplus')) ??
      results.find(p => p.productId.includes('plus'));

    if (best) {
      const tier = tierFromProductId(best.productId);
      await persistTier(userData.user.id, tier);
      return tier;
    }
    return 'free';
  } catch {
    return 'free';
  }
}

/**
 * Reads subscription status — first from Supabase (source of truth),
 * then falls back to AsyncStorage for offline use.
 * Syncs AsyncStorage on success.
 */
export async function checkSubscriptionStatus(): Promise<UserTier> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return 'free';

    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userData.user.id)
      .single();

    const dbTier = data?.subscription_tier as UserTier | undefined;
    if (dbTier === 'plus' || dbTier === 'plusplus') {
      await AsyncStorage.setItem(TIER_STORAGE_KEY, dbTier);
      return dbTier;
    }
  } catch {
    // Network unavailable — fall back below
  }

  // Offline fallback
  const stored = await AsyncStorage.getItem(TIER_STORAGE_KEY);
  if (stored === 'plus' || stored === 'plusplus') return stored;
  return 'free';
}
