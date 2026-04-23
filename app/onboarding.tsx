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
const SLOT_SIZE = (width - 64 - 16) / 3;

const INTEREST_CATEGORIES = [
  { emoji:'🏋️', label:'Gym' },
  { emoji:'🏃', label:'Running' },
  { emoji:'🧘', label:'Yoga' },
  { emoji:'🍕', label:'Foodie' },
  { emoji:'🍳', label:'Cooking' },
  { emoji:'📸', label:'Photography' },
  { emoji:'🎵', label:'Music' },
  { emoji:'🎮', label:'Gaming' },
  { emoji:'✈️', label:'Travel' },
  { emoji:'📚', label:'Reading' },
  { emoji:'🎨', label:'Art' },
  { emoji:'🏄', label:'Surfing' },
  { emoji:'🐶', label:'Dogs' },
  { emoji:'🐱', label:'Cats' },
  { emoji:'🏀', label:'Basketball' },
  { emoji:'⚽', label:'Soccer' },
  { emoji:'🎾', label:'Tennis' },
  { emoji:'🍷', label:'Wine' },
  { emoji:'☕', label:'Coffee' },
  { emoji:'🎬', label:'Movies' },
  { emoji:'🌿', label:'Nature' },
  { emoji:'💃', label:'Dancing' },
  { emoji:'🎤', label:'Singing' },
  { emoji:'🏊', label:'Swimming' },
];

const PERSONAL_FIELDS = [
  { key:'height',    label:'Height',         emoji:'📏', type:'text',   placeholder:"e.g. 5'11\"" },
  { key:'ethnicity', label:'Race/Ethnicity',  emoji:'🌎', type:'select', options:['White','Black','Hispanic','Asian','Middle Eastern','Mixed','Other','Prefer not to say'] },
  { key:'zodiac',    label:'Zodiac Sign',     emoji:'♈', type:'select', options:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'] },
  { key:'religion',  label:'Religion',        emoji:'🙏', type:'select', options:['Christian','Catholic','Muslim','Jewish','Hindu','Buddhist','Spiritual','Atheist','Agnostic','Other','Prefer not to say'] },
  { key:'politics',  label:'Politics',        emoji:'🗳️', type:'select', options:['Liberal','Conservative','Moderate','Apolitical','Prefer not to say'] },
  { key:'languages', label:'Languages',       emoji:'🌍', type:'text',   placeholder:'e.g. English, Spanish' },
  { key:'hometown',  label:'Hometown',        emoji:'🏠', type:'text',   placeholder:'e.g. Nashville, TN' },
];

const GOALS_FIELDS = [
  { key:'want_kids',             label:'Want Kids',             emoji:'👶', options:['Yes','No','Open to it','Already have kids'] },
  { key:'how_many_kids',         label:'How Many Kids',         emoji:'👨‍👩‍👧‍👦', options:['1','2','3','4+','Not sure'] },
  { key:'marriage',              label:'Marriage',              emoji:'💍', options:['Yes, I want to get married','No','Open to it'] },
  { key:'where_to_marry',        label:'Where to Marry',        emoji:'💒', options:['Beach','Church','Destination','Courthouse','Backyard','Not sure'] },
  { key:'where_to_live',         label:'Where to Live',         emoji:'🏡', options:['Big city','Suburbs','Small town','Countryside','Travel the world','Not sure'] },
  { key:'career_goals',          label:'Career Goals',          emoji:'💼', options:['Entrepreneur','Corporate career','Creative field','Healthcare','Education','Military','Not sure'] },
  { key:'financial_goals',       label:'Financial Goals',       emoji:'💰', options:['Buy a house','Retire early','Travel the world','Build wealth','Live comfortably','Not sure'] },
  { key:'relationship_timeline', label:'Relationship Timeline', emoji:'⏳', options:['Ready now','Taking it slow','Not sure yet','Eventually'] },
  { key:'long_distance',         label:'Open to Long Distance', emoji:'✈️', options:['Yes','No','Maybe'] },
  { key:'adventure_goals',       label:'Adventure Goals',       emoji:'🌍', options:['Travel every year','Visit every continent','Try new things monthly','Homebody','Not sure'] },
  { key:'family_closeness',      label:'Family Closeness',      emoji:'👨‍👩‍👦', options:['Very close family','Independent','Somewhere between'] },
  { key:'spiritual_goals',       label:'Spiritual Goals',       emoji:'✨', options:['Grow in faith','Find my beliefs','Already grounded','Not religious'] },
];

const KNOW_ME_FIELDS = [
  { key:'job_title',         label:'Job Title',       emoji:'💼', type:'text',   placeholder:'e.g. Software Engineer' },
  { key:'work',              label:'Company',         emoji:'🏢', type:'text',   placeholder:'e.g. Google' },
  { key:'school',            label:'School',          emoji:'🎓', type:'text',   placeholder:'e.g. University of Tennessee' },
  { key:'education_level',   label:'Education',       emoji:'📚', type:'select', options:['High School','Some College','Bachelors','Masters','PhD','Trade School','Self Taught'] },
  { key:'pets',              label:'Pets',            emoji:'🐾', type:'select', options:['Dogs','Cats','Both','No Pets','Want Pets'] },
  { key:'has_tattoos',       label:'Tattoos',         emoji:'💉', type:'select', options:['None','A Few','Many','Sleeves'] },
  { key:'smoking',           label:'Smoking',         emoji:'🚬', type:'select', options:['Never','Socially','Sometimes','Yes'] },
  { key:'drinking',          label:'Drinking',        emoji:'🍺', type:'select', options:['Sober','Never','Socially','Often'] },
  { key:'lifestyle',         label:'Lifestyle',       emoji:'✨', type:'select', options:['Homebody','Social Butterfly','Party Person','Balanced','Outdoorsy'] },
  { key:'workout',           label:'Workout',         emoji:'💪', type:'select', options:['Never','Sometimes','Weekly','Daily','Obsessed'] },
  { key:'diet',              label:'Diet',            emoji:'🥗', type:'select', options:['Omnivore','Vegetarian','Vegan','Keto','Halal','Kosher','Gluten Free'] },
  { key:'fav_food',          label:'Favorite Food',   emoji:'🍕', type:'text',   placeholder:'e.g. Sushi, Pizza, Tacos' },
  { key:'mbti',              label:'Personality',     emoji:'🧠', type:'select', options:['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'] },
  { key:'love_language',     label:'Love Language',   emoji:'💕', type:'select', options:['Words of Affirmation','Quality Time','Physical Touch','Acts of Service','Gift Giving'] },
  { key:'relationship_type', label:'Looking For',     emoji:'💞', type:'select', options:['Something Serious','Casual','Marriage','Friendship First','Not Sure Yet'] },
  { key:'sleeping_schedule', label:'Sleep Schedule',  emoji:'😴', type:'select', options:['Early Bird','Night Owl','Depends on the Day'] },
  { key:'social_media',      label:'Social Media',    emoji:'📱', type:'select', options:['Very Active','Sometimes','Rarely','Not on Social Media'] },
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

  // Main step state
  const [step, setStep] = useState(0);
  const [aboutMeSubStep, setAboutMeSubStep] = useState<0|1|2|3>(0);
  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  // About Me — Interests
  const [selectedInterests, setSelectedInterests] = useState<{emoji:string, label:string}[]>([]);
  const [addingCustomInterest, setAddingCustomInterest] = useState(false);
  const [customInterestText, setCustomInterestText] = useState('');

  // About Me — Personal
  const [personalData, setPersonalData] = useState<Record<string,string>>({});
  const [customPersonalOpts, setCustomPersonalOpts] = useState<Record<string,string[]>>({});
  const [addingCustomPersonal, setAddingCustomPersonal] = useState<string|null>(null);
  const [customPersonalText, setCustomPersonalText] = useState('');

  // About Me — Goals
  const [goalsData, setGoalsData] = useState<Record<string,string>>({});
  const [customGoalOpts, setCustomGoalOpts] = useState<Record<string,string[]>>({});
  const [addingCustomGoal, setAddingCustomGoal] = useState<string|null>(null);
  const [customGoalText, setCustomGoalText] = useState('');

  // About Me — Know Me
  const [knowMeData, setKnowMeData] = useState<Record<string,string>>({});

  // ─── Profile Picture helpers ────────────────────────────────────────────────
  async function pickProfilePicture() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setProfilePicUri(result.assets[0].uri);
  }

  async function takeProfileSelfie() {
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
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
    if (!profilePicUri) { showToast('Please add a profile picture to continue'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `${user.id}/profile_picture.jpg`;
      const response = await fetch(profilePicUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from('profile-photos').upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
      await supabase.from('profiles').update({ profile_picture: urlData.publicUrl }).eq('id', user.id);
    } catch {
      showToast('Photo upload failed — you can re-upload from your profile');
    } finally {
      setLoading(false);
      setStep(1);
    }
  }

  // ─── Photos helpers ─────────────────────────────────────────────────────────
  async function pickPhoto(index: number) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 4], quality: 0.85,
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

  async function handlePhotosNext() {
    const filled = photos.filter(Boolean) as string[];
    if (filled.length === 0) { setPhotoError(true); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        if (photos[i]) {
          const url = await uploadPhoto(photos[i]!, user.id, i);
          if (url) urls.push(url);
        }
      }
      await supabase.from('profiles').update({ photo_urls: urls }).eq('id', user.id);
      setStep(2);
    } catch {} finally { setLoading(false); }
  }

  // ─── Bio helpers ────────────────────────────────────────────────────────────
  async function handleBioNext(skip = false) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      if (!skip && bio.trim()) {
        await supabase.from('profiles').update({ bio: bio.trim() }).eq('id', user.id);
      }
      setStep(3);
    } catch {} finally { setLoading(false); }
  }

  // ─── About Me helpers ────────────────────────────────────────────────────────
  function toggleInterest(cat: {emoji:string, label:string}) {
    const exists = selectedInterests.some(i => i.label === cat.label);
    if (exists) {
      setSelectedInterests(prev => prev.filter(i => i.label !== cat.label));
    } else if (selectedInterests.length < 5) {
      setSelectedInterests(prev => [...prev, cat]);
    }
  }

  function confirmCustomInterest() {
    const trimmed = customInterestText.trim();
    if (!trimmed || selectedInterests.length >= 5) return;
    setSelectedInterests(prev => [...prev, { emoji: '✨', label: trimmed }]);
    setCustomInterestText('');
    setAddingCustomInterest(false);
  }

  function confirmCustomPersonal(key: string) {
    const trimmed = customPersonalText.trim();
    if (!trimmed) return;
    setCustomPersonalOpts(prev => ({ ...prev, [key]: [...(prev[key] || []), trimmed] }));
    setPersonalData(prev => ({ ...prev, [key]: trimmed }));
    setCustomPersonalText('');
    setAddingCustomPersonal(null);
  }

  function confirmCustomGoal(key: string) {
    const trimmed = customGoalText.trim();
    if (!trimmed) return;
    setCustomGoalOpts(prev => ({ ...prev, [key]: [...(prev[key] || []), trimmed] }));
    setGoalsData(prev => ({ ...prev, [key]: trimmed }));
    setCustomGoalText('');
    setAddingCustomGoal(null);
  }

  async function getMergedKnowMe() {
    const { data: profile } = await supabase.from('profiles').select('get_to_know_me').eq('id', (await supabase.auth.getUser()).data.user!.id).single();
    return profile?.get_to_know_me || {};
  }

  async function saveInterestsAndNext() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      await supabase.from('profiles').update({ interests: selectedInterests }).eq('id', user.id);
      setAboutMeSubStep(1);
    } catch {} finally { setLoading(false); }
  }

  async function savePersonalAndNext() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const existing = await getMergedKnowMe();
      await supabase.from('profiles').update({ get_to_know_me: { ...existing, ...personalData } }).eq('id', user.id);
      setAboutMeSubStep(2);
    } catch {} finally { setLoading(false); }
  }

  async function saveGoalsAndNext() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const existing = await getMergedKnowMe();
      await supabase.from('profiles').update({ get_to_know_me: { ...existing, ...goalsData } }).eq('id', user.id);
      setAboutMeSubStep(3);
    } catch {} finally { setLoading(false); }
  }

  async function saveKnowMeAndNext() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const existing = await getMergedKnowMe();
      await supabase.from('profiles').update({ get_to_know_me: { ...existing, ...knowMeData } }).eq('id', user.id);
      setStep(4);
    } catch {} finally { setLoading(false); }
  }

  function handleAboutMeBack() {
    if (aboutMeSubStep === 0) setStep(2);
    else setAboutMeSubStep((aboutMeSubStep - 1) as 0|1|2|3);
  }

  function handleAboutMeSkip() {
    if (aboutMeSubStep < 3) setAboutMeSubStep((aboutMeSubStep + 1) as 1|2|3);
    else setStep(4);
  }

  // ─── STEP 0: PROFILE PICTURE ────────────────────────────────────────────────
  if (step === 0) return (
    <View style={s.container}>
      <ProgressBar step={0} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.stepLabel}>Step 1 of 5</Text>
        <Text style={s.heading}>Profile Picture</Text>
        <Text style={s.sub}>
          This is your avatar shown everywhere on Allure — pick a clear, well-lit photo of your face.
        </Text>
        <TouchableOpacity style={s.profilePicCircle} onPress={pickProfilePicture} activeOpacity={0.8}>
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
        <TouchableOpacity style={[s.btn, loading && { opacity:0.6 }]} onPress={handleProfilePictureNext} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Continue</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.skipLinkBtn} onPress={() => setStep(1)} disabled={loading}>
          <Text style={s.skipLinkTxt}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
      {toastJSX}
    </View>
  );

  // ─── STEP 1: PHOTOS ─────────────────────────────────────────────────────────
  if (step === 1) return (
    <View style={s.container}>
      <ProgressBar step={1} />
      <TouchableOpacity style={s.backBtn} onPress={() => setStep(0)}>
        <Ionicons name="chevron-back" size={22} color="#ff4d82" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.stepLabel}>Step 2 of 5</Text>
        <Text style={s.heading}>Add Your Photos</Text>
        <Text style={s.sub}>Add at least 1 to continue — 4 or more get the most matches.</Text>
        <View style={s.photoGrid}>
          {photos.map((uri, i) => (
            <TouchableOpacity
              key={i} style={s.photoSlot}
              onPress={() => uri ? removePhoto(i) : pickPhoto(i)}
              activeOpacity={0.7}
            >
              {uri ? (
                <>
                  <Image source={{ uri }} style={s.photoImg} />
                  <View style={s.photoRemoveBadge}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                  {i === 0 && <View style={s.mainBadge}><Text style={s.mainBadgeTxt}>Main</Text></View>}
                </>
              ) : (
                <View style={s.photoEmpty}>
                  <Ionicons name="add" size={26} color="rgba(255,77,130,0.45)" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        {photoError && <Text style={s.errorTxt}>Add at least one photo to continue.</Text>}
        <TouchableOpacity style={[s.btn, loading && { opacity:0.6 }]} onPress={handlePhotosNext} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Continue</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ─── STEP 2: BIO ────────────────────────────────────────────────────────────
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
        <TouchableOpacity style={[s.btn, loading && { opacity:0.6 }]} onPress={() => handleBioNext(false)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── STEP 3: ABOUT ME (4 sub-steps) ─────────────────────────────────────────
  if (step === 3) return (
    <View style={s.container}>
      <ProgressBar step={3} />
      <TouchableOpacity style={s.backBtn} onPress={handleAboutMeBack}>
        <Ionicons name="chevron-back" size={22} color="#ff4d82" />
      </TouchableOpacity>
      <TouchableOpacity style={s.skipBtn} onPress={handleAboutMeSkip} disabled={loading}>
        <Text style={s.skipTxt}>Skip</Text>
      </TouchableOpacity>

      {/* Sub-step progress bar */}
      <View style={s.subProgressWrap}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[s.subProgressSeg, i <= aboutMeSubStep && s.subProgressActive]} />
        ))}
      </View>

      {/* ── SUB-STEP 0: INTERESTS ── */}
      {aboutMeSubStep === 0 && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.stepLabel}>About Me · 1 of 4</Text>
          <Text style={s.heading}>Your Interests</Text>
          <Text style={s.sub}>
            Pick up to 5.{selectedInterests.length > 0 ? `  ${selectedInterests.length}/5 selected` : ''}
          </Text>

          <View style={s.pillsWrap}>
            {INTEREST_CATEGORIES.map(cat => {
              const isSelected = selectedInterests.some(i => i.label === cat.label);
              const isMaxed = !isSelected && selectedInterests.length >= 5;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[s.pill, isSelected && s.pillSelected, isMaxed && s.pillMaxed]}
                  onPress={() => toggleInterest(cat)}
                  disabled={isMaxed}
                >
                  <Text style={[s.pillTxt, isSelected && s.pillTxtSelected]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {!addingCustomInterest && (
              <TouchableOpacity
                style={[s.pill, { borderStyle:'dashed', borderColor:'rgba(255,77,130,0.35)' }]}
                onPress={() => setAddingCustomInterest(true)}
                disabled={selectedInterests.length >= 5}
              >
                <Text style={[s.pillTxt, { color:'rgba(255,77,130,0.55)' }]}>+ Custom</Text>
              </TouchableOpacity>
            )}
          </View>

          {addingCustomInterest && (
            <View style={s.customRow}>
              <TextInput
                style={[s.fieldInput, { flex:1, marginBottom:0 }]}
                placeholder="e.g. Rock Climbing"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={customInterestText}
                onChangeText={setCustomInterestText}
                autoFocus
                onSubmitEditing={confirmCustomInterest}
              />
              <TouchableOpacity style={s.customAddBtn} onPress={confirmCustomInterest}>
                <Text style={s.customAddBtnTxt}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingCustomInterest(false); setCustomInterestText(''); }}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[s.btn, loading && { opacity:0.6 }]} onPress={saveInterestsAndNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── SUB-STEP 1: PERSONAL ── */}
      {aboutMeSubStep === 1 && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.stepLabel}>About Me · 2 of 4</Text>
          <Text style={s.heading}>About You</Text>
          <Text style={s.sub}>Tell people a bit more about yourself</Text>

          {PERSONAL_FIELDS.map(field => (
            <View key={field.key} style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{field.emoji}  {field.label}</Text>
              {field.type === 'text' ? (
                <TextInput
                  style={s.fieldInput}
                  placeholder={field.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={personalData[field.key] || ''}
                  onChangeText={v => setPersonalData(prev => ({ ...prev, [field.key]: v }))}
                />
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:'row', gap:8, paddingBottom:4 }}>
                      {[...(field.options || []), ...(customPersonalOpts[field.key] || [])].map(opt => (
                        <TouchableOpacity
                          key={opt}
                          style={[s.optPill, personalData[field.key] === opt && s.optPillSelected]}
                          onPress={() => setPersonalData(prev => ({ ...prev, [field.key]: opt }))}
                        >
                          <Text style={[s.optPillTxt, personalData[field.key] === opt && s.optPillTxtSelected]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={s.optAddBtn}
                        onPress={() => { setAddingCustomPersonal(field.key); setCustomPersonalText(''); }}
                      >
                        <Text style={s.optAddBtnTxt}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                  {addingCustomPersonal === field.key && (
                    <View style={[s.customRow, { marginTop:8 }]}>
                      <TextInput
                        style={[s.fieldInput, { flex:1, marginBottom:0 }]}
                        placeholder="Custom value..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={customPersonalText}
                        onChangeText={setCustomPersonalText}
                        autoFocus
                        onSubmitEditing={() => confirmCustomPersonal(field.key)}
                      />
                      <TouchableOpacity style={s.customAddBtn} onPress={() => confirmCustomPersonal(field.key)}>
                        <Text style={s.customAddBtnTxt}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          ))}

          <TouchableOpacity style={[s.btn, loading && { opacity:0.6 }]} onPress={savePersonalAndNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── SUB-STEP 2: GOALS ── */}
      {aboutMeSubStep === 2 && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.stepLabel}>About Me · 3 of 4</Text>
          <Text style={s.heading}>Your Goals</Text>
          <Text style={s.sub}>Share what you're working toward</Text>

          {GOALS_FIELDS.map(field => (
            <View key={field.key} style={s.fieldWrap}>
              <View style={s.fieldLabelRow}>
                <Text style={s.fieldLabel}>{field.emoji}  {field.label}</Text>
                <TouchableOpacity
                  style={s.optAddBtn}
                  onPress={() => { setAddingCustomGoal(field.key); setCustomGoalText(''); }}
                >
                  <Text style={s.optAddBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection:'row', gap:8, paddingBottom:4 }}>
                  {[...(field.options || []), ...(customGoalOpts[field.key] || [])].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.optPill, goalsData[field.key] === opt && s.optPillSelected]}
                      onPress={() => setGoalsData(prev => ({ ...prev, [field.key]: opt }))}
                    >
                      <Text style={[s.optPillTxt, goalsData[field.key] === opt && s.optPillTxtSelected]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {addingCustomGoal === field.key && (
                <View style={[s.customRow, { marginTop:8 }]}>
                  <TextInput
                    style={[s.fieldInput, { flex:1, marginBottom:0 }]}
                    placeholder="Custom goal..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={customGoalText}
                    onChangeText={setCustomGoalText}
                    autoFocus
                    onSubmitEditing={() => confirmCustomGoal(field.key)}
                  />
                  <TouchableOpacity style={s.customAddBtn} onPress={() => confirmCustomGoal(field.key)}>
                    <Text style={s.customAddBtnTxt}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={[s.btn, loading && { opacity:0.6 }]} onPress={saveGoalsAndNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── SUB-STEP 3: GET TO KNOW ME ── */}
      {aboutMeSubStep === 3 && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.stepLabel}>About Me · 4 of 4</Text>
          <Text style={s.heading}>Get to Know Me</Text>
          <Text style={s.sub}>Fill out what you're comfortable sharing</Text>

          {KNOW_ME_FIELDS.map(field => (
            <View key={field.key} style={s.fieldWrap}>
              <Text style={s.fieldLabel}>{field.emoji}  {field.label}</Text>
              {field.type === 'text' ? (
                <TextInput
                  style={s.fieldInput}
                  placeholder={field.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={knowMeData[field.key] || ''}
                  onChangeText={v => setKnowMeData(prev => ({ ...prev, [field.key]: v }))}
                />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection:'row', gap:8, paddingBottom:4 }}>
                    {field.options?.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[s.optPill, knowMeData[field.key] === opt && s.optPillSelected]}
                        onPress={() => setKnowMeData(prev => ({ ...prev, [field.key]: opt }))}
                      >
                        <Text style={[s.optPillTxt, knowMeData[field.key] === opt && s.optPillTxtSelected]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          ))}

          <TouchableOpacity style={[s.btn, loading && { opacity:0.6 }]} onPress={saveKnowMeAndNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {toastJSX}
    </View>
  );

  // ─── STEP 4: FACE SCAN ──────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <ProgressBar step={4} />
      <TouchableOpacity style={s.backBtn} onPress={() => { setStep(3); setAboutMeSubStep(3); }}>
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
            { e:'♛', n:'Celestial', c:'#e8d5ff' },
            { e:'◈', n:'Luxe',      c:'#ffe066' },
            { e:'❋', n:'Radiant',   c:'#aaddff' },
            { e:'✦', n:'Bloom',     c:'#ffaad0' },
          ].map(t => (
            <View key={t.n} style={s.scorePreviewCard}>
              <Text style={{ fontSize:14 }}>{t.e}</Text>
              <Text style={[s.scorePreviewName, { color:t.c }]}>{t.n}</Text>
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
  container:       { flex:1, backgroundColor:'#08000d' },
  scroll:          { flexGrow:1, paddingHorizontal:32, paddingTop:20, paddingBottom:44 },

  progressWrap:    { flexDirection:'row', gap:6, paddingHorizontal:32, paddingTop:62, marginBottom:4 },
  progressSeg:     { flex:1, height:2, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:2 },
  progressActive:  { backgroundColor:'#ff4d82' },

  subProgressWrap: { flexDirection:'row', gap:4, paddingHorizontal:32, marginBottom:6, marginTop:4 },
  subProgressSeg:  { flex:1, height:1.5, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:2 },
  subProgressActive:{ backgroundColor:'rgba(255,77,130,0.5)' },

  backBtn:         { position:'absolute', top:54, left:20, zIndex:10, width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  skipBtn:         { position:'absolute', top:54, right:20, zIndex:10, padding:8 },
  skipTxt:         { fontSize:13, color:'rgba(255,255,255,0.28)', fontWeight:'500', letterSpacing:0.5 },

  stepLabel:       { fontSize:9, color:'rgba(255,77,130,0.55)', textTransform:'uppercase', letterSpacing:3, marginBottom:8, fontWeight:'600' },
  heading:         { fontSize:28, fontWeight:'700', color:'#fff', marginBottom:8, letterSpacing:0.2 },
  sub:             { fontSize:13, color:'rgba(255,255,255,0.32)', lineHeight:20, marginBottom:28 },

  // Photos
  photoGrid:       { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:8 },
  photoSlot:       { width:SLOT_SIZE, height:SLOT_SIZE*(4/3), borderRadius:12, overflow:'hidden' },
  photoEmpty:      { flex:1, borderWidth:1, borderColor:'rgba(255,77,130,0.2)', borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,77,130,0.04)' },
  photoImg:        { width:'100%', height:'100%' },
  photoRemoveBadge:{ position:'absolute', top:6, right:6, width:20, height:20, borderRadius:10, backgroundColor:'rgba(0,0,0,0.65)', alignItems:'center', justifyContent:'center' },
  mainBadge:       { position:'absolute', bottom:6, left:6, paddingHorizontal:8, paddingVertical:3, backgroundColor:'rgba(255,77,130,0.8)', borderRadius:50 },
  mainBadgeTxt:    { fontSize:9, color:'#fff', fontWeight:'700', letterSpacing:0.5 },
  errorTxt:        { fontSize:12, color:'rgba(255,77,130,0.7)', marginBottom:16, textAlign:'center' },

  // Profile pic
  profilePicCircle:       { width:160, height:160, borderRadius:80, borderWidth:3, borderColor:'#ff4d82', overflow:'hidden', alignSelf:'center', marginBottom:20 },
  profilePicImg:          { width:'100%', height:'100%' },
  profilePicPlaceholder:  { flex:1, alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'rgba(255,77,130,0.06)' },
  profilePicPlaceholderTxt:{ fontSize:12, color:'rgba(255,77,130,0.5)', fontWeight:'500' },
  picBtnRow:              { flexDirection:'row', gap:12, marginBottom:28 },
  picOptionBtn:           { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:12, borderRadius:50, borderWidth:1, borderColor:'rgba(255,77,130,0.3)', backgroundColor:'rgba(255,77,130,0.06)' },
  picOptionTxt:           { fontSize:13, color:'#ff4d82', fontWeight:'600' },

  // Bio
  bioInput:        { fontSize:15, color:'#fff', borderWidth:1, borderColor:'rgba(255,77,130,0.18)', borderRadius:14, padding:16, height:160, marginBottom:8, backgroundColor:'rgba(255,77,130,0.04)', lineHeight:22 },
  charCount:       { fontSize:11, color:'rgba(255,255,255,0.18)', textAlign:'right', marginBottom:28 },

  // Interests pills
  pillsWrap:       { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:20 },
  pill:            { paddingHorizontal:14, paddingVertical:8, borderRadius:50, borderWidth:1, borderColor:'rgba(255,77,130,0.22)', backgroundColor:'rgba(255,77,130,0.05)' },
  pillSelected:    { backgroundColor:'#ff4d82', borderColor:'#ff4d82' },
  pillMaxed:       { opacity:0.25 },
  pillTxt:         { fontSize:13, color:'rgba(255,255,255,0.45)', fontWeight:'500' },
  pillTxtSelected: { color:'#fff', fontWeight:'600' },

  // Personal / Goals / Know Me fields
  fieldWrap:       { marginBottom:22 },
  fieldLabel:      { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.75)', marginBottom:10 },
  fieldLabelRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  fieldInput:      { backgroundColor:'rgba(255,255,255,0.06)', borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', padding:11, fontSize:14, color:'#fff', marginBottom:4 },
  optPill:         { paddingHorizontal:14, paddingVertical:8, borderRadius:50, borderWidth:1, borderColor:'rgba(255,255,255,0.14)', backgroundColor:'rgba(255,255,255,0.06)' },
  optPillSelected: { borderColor:'#ff4d82', backgroundColor:'rgba(255,77,130,0.18)' },
  optPillTxt:      { fontSize:13, color:'rgba(255,255,255,0.5)', fontWeight:'500' },
  optPillTxtSelected:{ color:'#ff4d82', fontWeight:'600' },
  optAddBtn:       { width:28, height:28, borderRadius:14, borderWidth:1, borderColor:'rgba(255,77,130,0.35)', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,77,130,0.07)' },
  optAddBtnTxt:    { fontSize:16, color:'#ff4d82', lineHeight:20 },

  // Custom input row
  customRow:       { flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  customAddBtn:    { paddingHorizontal:14, paddingVertical:9, borderRadius:50, backgroundColor:'#ff4d82' },
  customAddBtnTxt: { fontSize:13, color:'#fff', fontWeight:'700' },

  // Face scan
  faceScanContent: { flex:1, justifyContent:'center' },
  allureLogo:      { fontSize:36, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:7, marginBottom:20, textAlign:'center' },
  faceOval:        { width:110, height:140, borderRadius:55, borderWidth:1, borderColor:'rgba(255,77,130,0.22)', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,77,130,0.04)', alignSelf:'center', marginBottom:24 },
  scorePreviewRow: { flexDirection:'row', gap:6, marginBottom:32 },
  scorePreviewCard:{ flex:1, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:10, padding:10, alignItems:'center', gap:4, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  scorePreviewName:{ fontSize:9, fontWeight:'700', textAlign:'center' },

  btn:             { backgroundColor:'#ff4d82', borderRadius:50, paddingVertical:18, alignItems:'center', marginTop:8 },
  btnTxt:          { color:'#fff', fontSize:15, fontWeight:'700', letterSpacing:1.5 },
  skipLinkBtn:     { alignItems:'center', marginTop:16 },
  skipLinkTxt:     { fontSize:13, color:'rgba(255,255,255,0.28)', fontWeight:'500' },
});
