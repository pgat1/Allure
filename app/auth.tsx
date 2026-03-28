import { supabase } from '@/app/lib/supabase';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function AuthScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [birthday, setBirthday]   = useState('');
  const [loading, setLoading]     = useState(false);

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
    if (cleaned.length <= 4) return `${cleaned.slice(0,2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
  }

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    return loc.coords;
  }

  async function handleSubmit() {
    if (isSignUp) {
      if (!firstName.trim()) { Alert.alert('Please enter your first name'); return; }
      if (!lastName.trim())  { Alert.alert('Please enter your last name'); return; }
      if (!birthday.trim() || birthday.length < 10) {
        Alert.alert('Please enter your birthday', 'Format: MM/DD/YYYY');
        return;
      }
      const age = calculateAge(
        `${birthday.slice(6,10)}-${birthday.slice(0,2)}-${birthday.slice(3,5)}`
      );
      if (age < 18) {
        Alert.alert('Sorry!', 'You must be 18 or older to use Allure.');
        return;
      }
    }
    if (!email.trim())    { Alert.alert('Please enter your email'); return; }
    if (password.length < 6) { Alert.alert('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error('Sign up failed');

        const formattedBirthday = `${birthday.slice(6,10)}-${birthday.slice(0,2)}-${birthday.slice(3,5)}`;
        const age = calculateAge(formattedBirthday);

        // Request location
        const coords = await requestLocation();

await supabase.from('profiles').insert({
  id: data.user.id,
  name: `${firstName.trim()} ${lastName.trim()}`,
  tier: 'Bloom',
  score: 0,
  birthday: formattedBirthday,
  age: age,
  age_verified: true,
  intent: 'dating',
  location_lat: coords?.latitude || null,
  location_lng: coords?.longitude || null,
  photo_urls: [],
  interests: [],
  get_to_know_me: {},
  bio: '',
});
        router.push('/facescan');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/swipe');
      }
    } catch (err: any) {
      Alert.alert('Something went wrong', err.message);
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
          <View style={s.logoUnderline} />
          <Text style={s.tagline}>Know Your Worth</Text>
        </View>

        {/* Fields */}
        <View style={s.fields}>
          {isSignUp && (
            <>
              <View style={s.row}>
                <View style={[s.inputWrap, { flex:1 }]}>
                  <Text style={s.lbl}>First Name</Text>
                  <View style={s.input}>
                    <TextInput
                      style={s.inputTxt}
                      placeholder="First"
                      placeholderTextColor="rgba(255,255,255,0.12)"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <View style={[s.inputWrap, { flex:1 }]}>
                  <Text style={s.lbl}>Last Name</Text>
                  <View style={s.input}>
                    <TextInput
                      style={s.inputTxt}
                      placeholder="Last"
                      placeholderTextColor="rgba(255,255,255,0.12)"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              <View style={s.inputWrap}>
                <Text style={s.lbl}>Date of Birth</Text>
                <View style={s.input}>
                  <TextInput
                    style={s.inputTxt}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="rgba(255,255,255,0.12)"
                    value={birthday}
                    onChangeText={t => setBirthday(formatBirthday(t))}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            </>
          )}

          <View style={s.inputWrap}>
            <Text style={s.lbl}>Email</Text>
            <View style={s.input}>
              <TextInput
                style={s.inputTxt}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.12)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={s.inputWrap}>
            <Text style={s.lbl}>Password</Text>
            <View style={s.input}>
              <TextInput
                style={s.inputTxt}
                placeholder="At least 6 characters"
                placeholderTextColor="rgba(255,255,255,0.12)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>
        </View>

        {/* Location notice */}
        {isSignUp && (
          <View style={s.locationNotice}>
            <Text style={s.locationIcon}>📍</Text>
            <Text style={s.locationTxt}>
              We'll ask for your location after sign up to show you people nearby
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[s.btn, loading && { opacity:0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>
                {isSignUp ? 'Create Account' : 'Log In'}
              </Text>
          }
        </TouchableOpacity>

        {/* Toggle */}
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={s.toggle}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={s.toggleLink}>
              {isSignUp ? 'Log In' : 'Sign Up'}
            </Text>
          </Text>
        </TouchableOpacity>

        <Text style={s.terms}>
          By signing up you agree to our Terms of Service.{'\n'}
          You must be 18 or older to use Allure.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:       { flex:1, backgroundColor:'#050005' },
  scroll:          { flexGrow:1, padding:28, paddingTop:70, justifyContent:'center' },
  logoWrap:        { alignItems:'center', marginBottom:36 },
  logo:            { fontSize:28, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:8 },
  logoUnderline:   { width:'100%', height:0.5, backgroundColor:'rgba(255,77,130,0.35)', marginTop:5, marginBottom:8 },
  tagline:         { fontSize:10, letterSpacing:4, textTransform:'uppercase', color:'rgba(255,255,255,0.12)' },
  fields:          { width:'100%', display:'flex', flexDirection:'column', gap:12, marginBottom:16 },
  row:             { flexDirection:'row', gap:10 },
  inputWrap:       { gap:5 },
  lbl:             { fontSize:10, color:'rgba(255,77,130,0.6)', textTransform:'uppercase', letterSpacing:1.5, fontWeight:'600' },
  input:           { borderWidth:1, borderColor:'rgba(255,255,255,0.06)', borderRadius:8, paddingHorizontal:12, paddingVertical:11, backgroundColor:'rgba(255,255,255,0.03)' },
  inputTxt:        { fontSize:14, color:'#fff' },
  locationNotice:  { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(255,77,130,0.05)', borderRadius:10, padding:12, borderWidth:1, borderColor:'rgba(255,77,130,0.1)', marginBottom:16 },
  locationIcon:    { fontSize:14 },
  locationTxt:     { fontSize:12, color:'rgba(255,255,255,0.3)', flex:1, lineHeight:16 },
  btn:             { backgroundColor:'#ff4d82', borderRadius:8, padding:15, alignItems:'center', marginBottom:14 },
  btnTxt:          { color:'#fff', fontSize:15, fontWeight:'700', letterSpacing:0.5 },
  toggle:          { textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.2)', marginBottom:16 },
  toggleLink:      { color:'#ff4d82', fontWeight:'600' },
  terms:           { fontSize:11, color:'rgba(255,255,255,0.1)', textAlign:'center', lineHeight:18 },
});
