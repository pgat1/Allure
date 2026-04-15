import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/app/lib/supabase';

export type UserTier = 'free' | 'plus' | 'plusplus';

/** AsyncStorage key shared with purchases.ts */
export const TIER_STORAGE_KEY = 'allure_subscription_tier';

/**
 * Returns the user's tier.
 * Reads from AsyncStorage (populated by checkSubscriptionStatus on startup).
 * Falls back to 'free' — no network call needed in hot paths like swipe/crush.
 */
export async function getUserTier(_userId: string): Promise<UserTier> {
  try {
    const stored = await AsyncStorage.getItem(TIER_STORAGE_KEY);
    if (stored === 'plus' || stored === 'plusplus') return stored;
  } catch {}
  return 'free';
}

/**
 * Reads subscription_tier directly from the profiles table.
 */
export async function getUserSubscription(userId: string): Promise<UserTier> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
  const t = data?.subscription_tier;
  if (t === 'plus' || t === 'plusplus') return t;
  return 'free';
}

/**
 * Returns true only if the user's subscription_tier is 'plusplus'.
 */
export async function canBoost(userId: string): Promise<boolean> {
  const tier = await getUserSubscription(userId);
  return tier === 'plusplus';
}

/**
 * Returns the boost_expires_at timestamp string, or null if not boosted.
 */
export async function getBoostExpiry(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('boost_expires_at')
    .eq('id', userId)
    .single();
  return data?.boost_expires_at ?? null;
}

/**
 * Activates a 24-hour boost for a plusplus user if they haven't boosted
 * in the last 24 hours.
 */
export async function maybeActivateBoost(userId: string): Promise<void> {
  const eligible = await canBoost(userId);
  if (!eligible) return;

  const expiry = await getBoostExpiry(userId);
  const now    = Date.now();

  if (expiry && new Date(expiry).getTime() > now) return;

  const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('profiles')
    .update({ boosted: true, boost_expires_at: expiresAt })
    .eq('id', userId);
}

// ── Crush limits ──────────────────────────────────────────────────────────────

export const CRUSH_LIMIT: Record<UserTier, number> = {
  free:     0,
  plus:     3,
  plusplus: Infinity,
};

// ── Rescan limits (per week) ──────────────────────────────────────────────────

export const RESCAN_LIMIT: Record<UserTier, number> = {
  free:     0,
  plus:     1,
  plusplus: 3,
};
