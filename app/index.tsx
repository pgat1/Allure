import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Already logged in — go straight to swipe
        router.replace('/swipe');
      } else {
        // Not logged in — show auth screen
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
