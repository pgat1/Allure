import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/app/lib/Toast';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

const SLOT_SIZE = (width - 64 - 16) / 3; // 32px side padding × 2, 2 gaps × 8px

const INTERESTS = [
  'Travel', 'Fitness', 'Music', 'Art', 'Food', 'Fashion',
  'Gaming', 'Movies', 'Books', 'Photography', 'Yoga', 'Cooking',
  'Sports', 'Dancing', 'Nature', 'Coffee', 'Wine', 'Hiking',
  'Tech', 'Animals', 'Business', 'Comedy', 'Meditation', 'Nightlife',
];

async function uploadPhoto(uri: string, userId: string, index: number): Promise<string | null> {
  try {
    const path = `${userId}/${Date.now()}_${index}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={s.progressWrap}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={[s.progressSeg, i <= step && s.progressActive]} />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { showToast, toastJSX } = useToast();
  const [step, setStep] = useState(0);
  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  async function pickProfilePicture() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePicUri(result.assets[0].uri);
    }
  }

  async function takeProfileSelfie() {
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const flipped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setProfilePicUri(flipped.uri);
    }
  }

  async function handleProfilePictureNext() {
    if (!profilePicUri) {
      showToast('📸', 'Please add a profile picture to continue');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `${user.id}/profile_picture.jpg`;
      const response = await fetch(profilePicUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from('profile-photos')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
      await supabase.from('profiles')
        .update({ profile_picture: urlData.publicUrl })
        .eq('id', user.id);
    } catch {
      showToast('⚠️', 'Photo upload failed', 'You can re-upload from your profile later');
    } finally {
      setLoading(false);
      setStep(1);
    }
  }

  async function pickPhoto(index: number) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const next = [...photos];
      next[index] = result.assets[0].uri;
      setPhotos(next);
      setPhotoError(false);
    }
  }

  function removePhoto(index: number) {
    const next = [...photos];
    next[index] = null;
    setPhotos(next);
  }

  function toggleInterest(interest: string) {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else if (interests.length < 5) {
      setInterests([...interests, interest]);
    }
  }

  async function handlePhotosNext() {
    const filled = photos.filter(Boolean) as string[];
    if (filled.length === 0) { setPhotoError(true); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        if (photos[i]) {
          const url = await uploadPhoto(photos[i]!, user.id, i);
          if (url) urls.push(url);
        }
      }

      await supabase.from('profiles').update({ photo_urls: urls }).eq('id', user.id);
      setStep(2);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleBioNext(skip = false) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!skip && bio.trim()) {
        await supabase.from('profiles').update({ bio: bio.trim() }).eq('id', user.id);
      }
      setStep(3);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleInterestsNext() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase.from('profiles').update({ interests }).eq('id', user.id);
      setStep(4);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  // ─── STEP 0: PROFILE PICTURE ───────────────────────────────────────────────
  if (step === 0) return (
    <View style={s.container}>
      <ProgressBar step={0} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.stepLabel}>Step 1 of 5</Text>
        <Text style={s.heading}>Profile Picture</Text>
        <Text style={s.sub}>
          This is your avatar shown everywhere on Allure — pick a clear, well-lit photo of your face.
        </Text>

        <TouchableOpacity
          style={s.profilePicCircle}
          onPress={pickProfilePicture}
          activeOpacity={0.8}
        >
          {profilePicUri ? (
            <Image source={{ uri: profilePicUri }} style={s.profilePicImg} resizeMode="cover" />
          ) : (
            <View style={s.profilePicPlaceholder}>
              <Ionicons name="person" size={52} color="rgba(255,77,130,0.35)" />
              <Text style={s.profilePicPlaceholderTxt}>Tap to add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={s.picBtnRow}>
          <TouchableOpacity style={s.picOptionBtn} onPress={takeProfileSelfie}>
            <Ionicons name="camera" size={18} color="#ff4d82" />
            <Text style={s.picOptionTxt}>Take Selfie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.picOptionBtn} onPress={pickProfilePicture}>
            <Ionicons name="images" size={18} color="#ff4d82" />
            <Text style={s.picOptionTxt}>Choose Photo</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handleProfilePictureNext}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Continue</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.skipLinkBtn} onPress={() => setStep(1)} disabled={loading}>
          <Text style={s.skipLinkTxt}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
      {toastJSX}
    </View>
  );

  // ─── STEP 1: PHOTOS ────────────────────────────────────────────────────────
  if (step === 1) return (
    <View style={s.container}>
      <ProgressBar step={1} />
      <TouchableOpacity style={s.backBtn} onPress={() => setStep(0)}>
        <Ionicons name="chevron-back" size={22} color="#ff4d82" />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.stepLabel}>Step 2 of 5</Text>
        <Text style={s.heading}>Add Your Photos</Text>
        <Text style={s.sub}>
          Add at least 1 to continue — 4 or more get the most matches.
        </Text>

        <View style={s.photoGrid}>
          {photos.map((uri, i) => (
            <TouchableOpacity
              key={i}
              style={s.photoSlot}
              onPress={() => uri ? removePhoto(i) : pickPhoto(i)}
              activeOpacity={0.7}
            >
              {uri ? (
                <>
                  <Image source={{ uri }} style={s.photoImg} />
                  <View style={s.photoRemoveBadge}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                  {i === 0 && (
                    <View style={s.mainBadge}>
                      <Text style={s.mainBadgeTxt}>Main</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={s.photoEmpty}>
                  <Ionicons name="add" size={26} color="rgba(255,77,130,0.45)" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {photoError && (
          <Text style={s.errorTxt}>Add at least one photo to continue.</Text>
        )}

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handlePhotosNext}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Continue</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ─── STEP 2: BIO ───────────────────────────────────────────────────────────
  if (step === 2) return (
    <View style={s.container}>
      <ProgressBar step={2} />
      <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
        <Ionicons name="chevron-back" size={22} color="#ff4d82" />
      </TouchableOpacity>
      <TouchableOpacity style={s.skipBtn} onPress={() => handleBioNext(true)} disabled={loading}>
        <Text style={s.skipTxt}>Skip</Text>
      </TouchableOpacity>
      <View style={s.scroll}>
        <Text style={s.stepLabel}>Step 3 of 5</Text>
        <Text style={s.heading}>Your Bio</Text>
        <Text style={s.sub}>Tell people what makes you unique.</Text>
        <TextInput
          style={s.bioInput}
          placeholder="Tell people about yourself..."
          placeholderTextColor="rgba(255,255,255,0.18)"
          value={bio}
          onChangeText={t => setBio(t.slice(0, 300))}
          multiline
          textAlignVertical="top"
        />
        <Text style={s.charCount}>{bio.length} / 300</Text>
        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={() => handleBioNext(false)}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Continue</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── STEP 3: INTERESTS ─────────────────────────────────────────────────────
  if (step === 3) return (
    <View style={s.container}>
      <ProgressBar step={3} />
      <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)}>
        <Ionicons name="chevron-back" size={22} color="#ff4d82" />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.stepLabel}>Step 4 of 5</Text>
        <Text style={s.heading}>Your Interests</Text>
        <Text style={s.sub}>
          Pick up to 5 things that define you.
          {interests.length > 0 && `  ${interests.length}/5 selected`}
        </Text>

        <View style={s.pillsWrap}>
          {INTERESTS.map(interest => {
            const selected = interests.includes(interest);
            const maxed = !selected && interests.length >= 5;
            return (
              <TouchableOpacity
                key={interest}
                style={[s.pill, selected && s.pillSelected, maxed && s.pillMaxed]}
                onPress={() => toggleInterest(interest)}
                disabled={maxed}
              >
                <Text style={[s.pillTxt, selected && s.pillTxtSelected]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handleInterestsNext}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Continue</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ─── STEP 4: FACE SCAN ─────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <ProgressBar step={4} />
      <TouchableOpacity style={s.backBtn} onPress={() => setStep(3)}>
        <Ionicons name="chevron-back" size={22} color="#ff4d82" />
      </TouchableOpacity>
      <View style={[s.scroll, s.faceScanContent]}>
        <Text style={s.allureLogo}>Allure</Text>
        <Text style={s.stepLabel}>Last Step</Text>
        <Text style={s.heading}>Face Scan</Text>
        <Text style={s.sub}>
          Scan your face to receive your Allure score.{'\n'}
          Your score determines your tier and match pool.{'\n'}
          It's permanent after your first scan.
        </Text>

        <View style={s.faceOval}>
          <Ionicons name="scan-outline" size={56} color="rgba(255,77,130,0.4)" />
        </View>

        <View style={s.scorePreviewRow}>
          {[
            { e: '♛', n: 'Celestial', c: '#e8d5ff' },
            { e: '◈', n: 'Luxe',      c: '#ffe066' },
            { e: '❋', n: 'Radiant',   c: '#aaddff' },
            { e: '✦', n: 'Bloom',     c: '#ffaad0' },
          ].map(t => (
            <View key={t.n} style={s.scorePreviewCard}>
              <Text style={{ fontSize: 14 }}>{t.e}</Text>
              <Text style={[s.scorePreviewName, { color: t.c }]}>{t.n}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.btn} onPress={() => router.push('/facescan')}>
          <Text style={s.btnTxt}>Start Face Scan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#08000d' },
  scroll:          { flexGrow: 1, paddingHorizontal: 32, paddingTop: 20, paddingBottom: 44 },

  progressWrap:    { flexDirection: 'row', gap: 6, paddingHorizontal: 32, paddingTop: 62, marginBottom: 10 },
  progressSeg:     { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  progressActive:  { backgroundColor: '#ff4d82' },

  backBtn:         { position: 'absolute', top: 54, left: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  skipBtn:         { position: 'absolute', top: 54, right: 20, zIndex: 10, padding: 8 },
  skipTxt:         { fontSize: 13, color: 'rgba(255,255,255,0.28)', fontWeight: '500', letterSpacing: 0.5 },

  stepLabel:       { fontSize: 9, color: 'rgba(255,77,130,0.55)', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8, fontWeight: '600' },
  heading:         { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8, letterSpacing: 0.2 },
  sub:             { fontSize: 13, color: 'rgba(255,255,255,0.32)', lineHeight: 20, marginBottom: 28 },

  photoGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  photoSlot:       { width: SLOT_SIZE, height: SLOT_SIZE * (4 / 3), borderRadius: 12, overflow: 'hidden' },
  photoEmpty:      { flex: 1, borderWidth: 1, borderColor: 'rgba(255,77,130,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,77,130,0.04)' },
  photoImg:        { width: '100%', height: '100%' },
  photoRemoveBadge:{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  mainBadge:       { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,77,130,0.8)', borderRadius: 50 },
  mainBadgeTxt:    { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  errorTxt:        { fontSize: 12, color: 'rgba(255,77,130,0.7)', marginBottom: 16, textAlign: 'center' },

  profilePicCircle:       { width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: '#ff4d82', overflow: 'hidden', alignSelf: 'center', marginBottom: 20 },
  profilePicImg:          { width: '100%', height: '100%' },
  profilePicPlaceholder:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,77,130,0.06)' },
  profilePicPlaceholderTxt: { fontSize: 12, color: 'rgba(255,77,130,0.5)', fontWeight: '500' },
  picBtnRow:              { flexDirection: 'row', gap: 12, marginBottom: 28 },
  picOptionBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,77,130,0.3)', backgroundColor: 'rgba(255,77,130,0.06)' },
  picOptionTxt:           { fontSize: 13, color: '#ff4d82', fontWeight: '600' },

  bioInput:        { fontSize: 15, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,77,130,0.18)', borderRadius: 14, padding: 16, height: 160, marginBottom: 8, backgroundColor: 'rgba(255,77,130,0.04)', lineHeight: 22 },
  charCount:       { fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'right', marginBottom: 28 },

  pillsWrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  pill:            { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,77,130,0.22)', backgroundColor: 'rgba(255,77,130,0.05)' },
  pillSelected:    { backgroundColor: '#ff4d82', borderColor: '#ff4d82' },
  pillMaxed:       { opacity: 0.3 },
  pillTxt:         { fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: '500' },
  pillTxtSelected: { color: '#fff', fontWeight: '600' },

  faceScanContent: { flex: 1, justifyContent: 'center' },
  allureLogo:      { fontSize: 36, fontWeight: '200', fontStyle: 'italic', color: '#ff4d82', letterSpacing: 7, marginBottom: 20, textAlign: 'center' },
  faceOval:        { width: 110, height: 140, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(255,77,130,0.22)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,77,130,0.04)', alignSelf: 'center', marginBottom: 24 },
  scorePreviewRow: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  scorePreviewCard:{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  scorePreviewName:{ fontSize: 9, fontWeight: '700', textAlign: 'center' },

  btn:             { backgroundColor: '#ff4d82', borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnTxt:          { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  skipLinkBtn:     { alignItems: 'center', marginTop: 16 },
  skipLinkTxt:     { fontSize: 13, color: 'rgba(255,255,255,0.28)', fontWeight: '500' },
});
