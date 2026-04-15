import { supabase } from '@/app/lib/supabase';
import { initializePurchases, checkSubscriptionStatus } from '@/app/lib/purchases';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Set up StoreKit listener once, then check session
    initializePurchases().finally(() => checkSession());
  }, []);

  async function checkSession() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Sync subscription tier from Supabase → AsyncStorage so
        // getUserTier() works correctly throughout the app session
        await checkSubscriptionStatus();
        router.replace('/(tabs)/swipe');
      } else {
        router.replace('/auth');
      }
    } catch (err) {
      router.replace('/auth');
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.logo}>Allure</Text>
      <ActivityIndicator color="#ff4d82" size="large" style={{ marginTop:20 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#000', alignItems:'center', justifyContent:'center' },
  logo:      { fontSize:72, fontWeight:'700', fontStyle:'italic', color:'#ff4d82' },
});
