import { useToast } from '@/app/lib/Toast';
import {
  PRODUCT_IDS,
  purchaseProduct,
  restorePurchases,
  setOnPurchaseSuccess,
  type ProductId,
} from '@/app/lib/purchases';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const PINK  = '#ff4d82';
const GOLD  = '#FFD700';
const BG    = '#08000d';

const PLUS_MONTHLY   = 8.99;
const PLUS_YEARLY    = +(PLUS_MONTHLY * 12 * 0.85).toFixed(2);
const PP_MONTHLY     = 14.99;
const PP_YEARLY      = +(PP_MONTHLY * 12 * 0.85).toFixed(2);

function fmt(d: Date): string {
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

type Plan    = 'plus' | 'plusplus';
type Billing = 'monthly' | 'yearly';

const PLUS_FEATURES = [
  'See who liked you',
  'Unlimited likes',
  '3 crushes per day',
  '1 face rescan per week',
  'Pink verified badge',
];

const PP_FEATURES = [
  'Everything in Allure+',
  'Unlimited crushes',
  '3 face rescans per week',
  'Profile boost — show up first for 24h',
  'Read receipts in chat',
  'Gold verified badge',
  'Priority matching',
];

export default function SubscriptionScreen() {
  const router                    = useRouter();
  const { toast, showToast }      = useToast();
  const [plan, setPlan]           = useState<Plan>('plus');
  const [billing, setBilling]     = useState<Billing>('monthly');
  const [purchasing, setPurchasing] = useState(false);

  // Navigate away automatically when a purchase succeeds
  useEffect(() => {
    setOnPurchaseSuccess(() => {
      setPurchasing(false);
      router.replace('/(tabs)/swipe');
    });
  }, []);

  const today = new Date();

  const isPlus    = plan === 'plus';
  const isMonthly = billing === 'monthly';
  const isTrial   = isPlus && isMonthly;

  const startDate = fmt(today);
  const endDate = isTrial
    ? fmt(addDays(today, 7))
    : isMonthly
    ? fmt(addMonths(today, 1))
    : fmt(addYears(today, 1));

  const accentColor = isPlus ? PINK : GOLD;

  const priceMonthly = isPlus ? PLUS_MONTHLY : PP_MONTHLY;
  const priceYearly  = isPlus ? PLUS_YEARLY  : PP_YEARLY;
  const displayPrice = isMonthly ? priceMonthly : priceYearly;

  const ctaLabel = isTrial
    ? 'Start 7 Day Trial'
    : isPlus
    ? 'Get Allure+'
    : 'Get Allure++';

  const features = isPlus ? PLUS_FEATURES : PP_FEATURES;

  function getProductId(): ProductId {
    if (isPlus)   return isMonthly ? PRODUCT_IDS.plusMonthly     : PRODUCT_IDS.plusYearly;
    return isMonthly ? PRODUCT_IDS.plusplusMonthly : PRODUCT_IDS.plusplusYearly;
  }

  async function handlePurchase() {
    setPurchasing(true);
    try {
      await purchaseProduct(getProductId());
      // Success handled by setOnPurchaseSuccess listener
    } catch (err: any) {
      setPurchasing(false);
      // User cancelled — no error shown; any real error surfaces as a toast
      if (err?.code !== 'E_USER_CANCELLED') {
        showToast('Purchase failed. Please try again.');
      }
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const tier = await restorePurchases();
      setPurchasing(false);
      if (tier !== 'free') {
        showToast(`Restored! Welcome back to Allure${tier === 'plusplus' ? '++' : '+'}.`);
        setTimeout(() => router.replace('/(tabs)/swipe'), 1500);
      } else {
        showToast('No previous purchases found.');
      }
    } catch {
      setPurchasing(false);
      showToast('Restore failed. Please try again.');
    }
  }

  return (
    <View style={s.root}>
      {/* Close */}
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={20} color="#aaa" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <Text style={s.logo}>Allure</Text>
        <Text style={s.headline}>Upgrade Your Allure</Text>
        <Text style={s.subtext}>Find better matches faster</Text>

        {/* Plan toggle */}
        <View style={s.planToggle}>
          <TouchableOpacity
            style={[s.planTab, plan === 'plus' && { borderColor: PINK, backgroundColor: 'rgba(255,77,130,0.12)' }]}
            onPress={() => setPlan('plus')}
          >
            <Text style={[s.planTabText, plan === 'plus' && { color: PINK }]}>Allure+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.planTab, plan === 'plusplus' && { borderColor: GOLD, backgroundColor: 'rgba(255,215,0,0.1)' }]}
            onPress={() => setPlan('plusplus')}
          >
            <View style={s.planTabInner}>
              <Text style={[s.planTabText, plan === 'plusplus' && { color: GOLD }]}>Allure++</Text>
              <View style={s.bestValueBadge}>
                <Text style={s.bestValueText}>BEST VALUE</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plan card */}
        <LinearGradient
          colors={isPlus
            ? ['rgba(255,77,130,0.12)', 'rgba(255,77,130,0.03)']
            : ['rgba(255,215,0,0.12)', 'rgba(255,215,0,0.03)']}
          style={[s.card, { borderColor: accentColor }]}
        >
          {/* Price */}
          <View style={s.priceRow}>
            <Text style={[s.priceAmount, { color: accentColor }]}>
              ${displayPrice}
            </Text>
            <Text style={s.pricePer}>/{isMonthly ? 'mo' : 'yr'}</Text>
          </View>

          {isTrial && (
            <View style={s.trialBadge}>
              <Text style={s.trialBadgeText}>FREE 7-day trial — then ${PLUS_MONTHLY}/mo</Text>
            </View>
          )}

          {!isMonthly && (
            <Text style={s.savingText}>Save 15% vs monthly</Text>
          )}

          {/* Dates */}
          <View style={s.datesRow}>
            <View style={s.dateBlock}>
              <Text style={s.dateLabel}>Start date</Text>
              <Text style={s.dateValue}>{startDate}</Text>
            </View>
            <View style={s.dateDivider} />
            <View style={s.dateBlock}>
              <Text style={s.dateLabel}>{isTrial ? 'Trial ends' : 'Renews'}</Text>
              <Text style={s.dateValue}>{endDate}</Text>
            </View>
          </View>

          <View style={s.featureDivider} />

          {/* Features */}
          {features.map((f) => (
            <View key={f} style={s.featureRow}>
              <Ionicons name="checkmark" size={15} color={accentColor} />
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </LinearGradient>

        {/* Billing toggle */}
        <View style={s.billingToggle}>
          <TouchableOpacity
            style={[s.billingTab, isMonthly && s.billingTabActive]}
            onPress={() => setBilling('monthly')}
          >
            <Text style={[s.billingTabText, isMonthly && s.billingTabTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.billingTab, !isMonthly && s.billingTabActive]}
            onPress={() => setBilling('yearly')}
          >
            <Text style={[s.billingTabText, !isMonthly && s.billingTabTextActive]}>Yearly  </Text>
            <View style={s.saveBadge}>
              <Text style={s.saveBadgeText}>-15%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: accentColor }, purchasing && s.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={isPlus ? '#fff' : '#1a1000'} />
          ) : (
            <Text style={[s.ctaText, !isPlus && { color: '#1a1000' }]}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>

        {isTrial && (
          <Text style={s.cancelNote}>Cancel anytime before trial ends. No charge today.</Text>
        )}

        <TouchableOpacity onPress={() => router.back()} style={s.maybeLater} disabled={purchasing}>
          <Text style={s.maybeLaterText}>Maybe Later</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} style={s.restoreBtn} disabled={purchasing}>
          <Text style={s.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Toast */}
      {!!toast && (
        <View style={s.toastWrap}>
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 48,
    alignItems: 'center',
  },

  closeBtn: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    fontSize: 34,
    fontStyle: 'italic',
    fontWeight: '700',
    color: PINK,
    marginBottom: 14,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 26,
  },

  // Plan toggle
  planToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
  planTab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  planTabInner: {
    alignItems: 'center',
    gap: 4,
  },
  planTabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
  },
  bestValueBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestValueText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  // Card
  card: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
  },
  pricePer: {
    fontSize: 16,
    color: '#666',
    marginBottom: 6,
    marginLeft: 2,
  },
  trialBadge: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  trialBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  savingText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: '#555',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
  dateDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  featureDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  featureText: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },

  // Billing toggle
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    width: '100%',
    marginBottom: 20,
  },
  billingTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  billingTabActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  billingTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  billingTabTextActive: {
    color: '#fff',
  },
  saveBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '700',
  },

  // CTA
  ctaBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelNote: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginBottom: 6,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  maybeLater: {
    paddingVertical: 12,
  },
  maybeLaterText: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
  },
  restoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreText: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // Toast
  toastWrap: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
