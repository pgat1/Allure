import { supabase } from '@/app/lib/supabase';
import { registerForPushNotifications } from '@/app/lib/notifications';
import { useToast } from '@/app/lib/Toast';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AuthScreen() {
  const router = useRouter();
  const { showToast, toastJSX } = useToast();
  const [isSignUp, setIsSignUp] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [birthday, setBirthday]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [tosChecked, setTosChecked] = useState(false);

  function calculateAge(birthdayStr: string): number {
    const today = new Date();
    const birth = new Date(birthdayStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function formatBirthday(text: string): string {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  }

  async function requestLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({});
      return loc.coords;
    } catch {
      return null;
    }
  }

  async function handleSubmit() {
    if (isSignUp) {
      if (!firstName.trim()) { showToast('First name required'); return; }
      if (!lastName.trim())  { showToast('Last name required'); return; }
      if (!birthday.trim() || birthday.length < 10) {
        showToast('Birthday required — MM/DD/YYYY');
        return;
      }
      const age = calculateAge(
        `${birthday.slice(6, 10)}-${birthday.slice(0, 2)}-${birthday.slice(3, 5)}`
      );
      if (age < 18) {
        showToast('You must be 18 or older to use Allure');
        return;
      }
      if (!tosChecked) {
        showToast('Please agree to the Terms of Service');
        return;
      }
    }
    if (!email.trim())        { showToast('Email required'); return; }
    if (password.length < 6)  { showToast('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error('Sign up failed');

        const formattedBirthday = `${birthday.slice(6, 10)}-${birthday.slice(0, 2)}-${birthday.slice(3, 5)}`;
        const age = calculateAge(formattedBirthday);

        const coords = await requestLocation();

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name: `${firstName.trim()} ${lastName.trim()}`,
          tier: 'Bloom',
          score: 0,
          birthday: formattedBirthday,
          age,
          age_verified: true,
          intent: 'dating',
          location_lat: coords?.latitude || null,
          location_lng: coords?.longitude || null,
          photo_urls: [],
          profile_picture: null,
          interests: [],
          get_to_know_me: {},
          bio: '',
        }, { onConflict: 'id' });
        if (profileError) console.error('Profile create error:', profileError);

        registerForPushNotifications();
        router.push('/onboarding');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.code === 'invalid_credentials' || error.code === 'user_not_found') {
            showToast('No account found with this email — please sign up');
            return;
          }
          throw error;
        }
        registerForPushNotifications();
        router.push('/swipe');
      }
    } catch (err: any) {
      showToast(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logo}>Allure</Text>
          <Text style={s.tagline}>Know Your Worth</Text>
        </View>

        {/* Fields */}
        <View style={s.fields}>
          {isSignUp && (
            <>
              <View style={s.row}>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Text style={s.lbl}>First Name</Text>
                  <TextInput
                    style={s.input}
                    placeholder="First"
                    placeholderTextColor="rgba(255,255,255,0.18)"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Text style={s.lbl}>Last Name</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Last"
                    placeholderTextColor="rgba(255,255,255,0.18)"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={s.inputWrap}>
                <Text style={s.lbl}>Birthday</Text>
                <TextInput
                  style={s.input}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  value={birthday}
                  onChangeText={t => setBirthday(formatBirthday(t))}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </>
          )}

          <View style={s.inputWrap}>
            <Text style={s.lbl}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="your@email.com"
              placeholderTextColor="rgba(255,255,255,0.18)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={s.inputWrap}>
            <Text style={s.lbl}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="At least 6 characters"
              placeholderTextColor="rgba(255,255,255,0.18)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {isSignUp && (
            <TouchableOpacity style={s.tosRow} onPress={() => setTosChecked(v => !v)} activeOpacity={0.7}>
              <View style={[s.checkbox, tosChecked && s.checkboxChecked]}>
                {tosChecked && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={s.tosText}>
                I agree to the{' '}
                <Text style={s.tosLink} onPress={() => router.push('/terms')}>Terms of Service</Text>
                {' '}and confirm I am 18 or older
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>{isSignUp ? 'Create Account' : 'Log In'}</Text>
          }
        </TouchableOpacity>

        {/* Toggle */}
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={s.toggle}>
            {isSignUp ? 'Already have an account?  ' : "Don't have an account?  "}
            <Text style={s.toggleLink}>{isSignUp ? 'Log In' : 'Sign Up'}</Text>
          </Text>
        </TouchableOpacity>

        <Text style={s.terms}>
          By continuing you agree to our Terms of Service.{'\n'}
          You must be 18 or older to use Allure.
        </Text>
      </ScrollView>
      {toastJSX}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#08000d' },
  scroll:     { flexGrow: 1, paddingHorizontal: 32, paddingTop: 110, paddingBottom: 44, justifyContent: 'center' },
  logoWrap:   { alignItems: 'center', marginBottom: 60 },
  logo:       { fontSize: 52, fontWeight: '200', fontStyle: 'italic', color: '#ff4d82', letterSpacing: 8, marginBottom: 12 },
  tagline:    { fontSize: 9, letterSpacing: 5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' },
  fields:     { width: '100%', gap: 28, marginBottom: 40 },
  row:        { flexDirection: 'row', gap: 20 },
  inputWrap:  { gap: 8 },
  lbl:        { fontSize: 9, color: 'rgba(255,77,130,0.65)', textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: '600' },
  input:      { fontSize: 15, color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(255,77,130,0.3)', paddingVertical: 10, paddingHorizontal: 0 },
  btn:        { backgroundColor: '#ff4d82', borderRadius: 50, paddingVertical: 18, alignItems: 'center', marginBottom: 22 },
  btnTxt:     { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  toggle:          { textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 22 },
  toggleLink:      { color: 'rgba(255,100,150,0.85)', fontWeight: '600' },
  terms:           { fontSize: 10, color: 'rgba(255,255,255,0.14)', textAlign: 'center', lineHeight: 17, letterSpacing: 0.3 },
  tosRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox:        { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(255,77,130,0.5)', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: '#ff4d82', borderColor: '#ff4d82' },
  tosText:         { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },
  tosLink:         { color: '#4d9fff', textDecorationLine: 'underline' },
});
