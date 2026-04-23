import { supabase } from '@/app/lib/supabase';
import { Toast, useToast } from '@/app/lib/Toast';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height: windowHeight } = Dimensions.get('window');

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

const KNOW_ME_FIELDS = [
  { key:'job_title',        label:'Job Title',       emoji:'💼', type:'text',   placeholder:'e.g. Software Engineer' },
  { key:'work',             label:'Company',         emoji:'🏢', type:'text',   placeholder:'e.g. Google' },
  { key:'school',           label:'School',          emoji:'🎓', type:'text',   placeholder:'e.g. University of Tennessee' },
  { key:'graduated_from',   label:'Graduated From',  emoji:'🏫', type:'text',   placeholder:'e.g. Harvard' },
  { key:'education_level',  label:'Education',       emoji:'📚', type:'select', options:['High School','Some College','Bachelors','Masters','PhD','Trade School','Self Taught'] },
  { key:'hometown',         label:'Hometown',        emoji:'🏠', type:'text',   placeholder:'e.g. New York, NY' },
  { key:'height',           label:'Height',          emoji:'📏', type:'text',   placeholder:'e.g. 6\'1"' },
  { key:'zodiac',           label:'Zodiac Sign',     emoji:'♈', type:'select', options:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'] },
  { key:'pets',             label:'Pets',            emoji:'🐾', type:'select', options:['Dogs','Cats','Both','No Pets','Want Pets'] },
  { key:'has_tattoos',      label:'Tattoos',         emoji:'💉', type:'select', options:['None','A Few','Many','Sleeves'] },
  { key:'smoking',          label:'Smoking',         emoji:'🚬', type:'select', options:['Never','Socially','Sometimes','Yes'] },
  { key:'drinking',         label:'Drinking',        emoji:'🍺', type:'select', options:['Sober','Never','Socially','Often'] },
  { key:'lifestyle',        label:'Lifestyle',       emoji:'✨', type:'select', options:['Homebody','Social Butterfly','Party Person','Balanced','Outdoorsy'] },
  { key:'workout',          label:'Workout',         emoji:'💪', type:'select', options:['Never','Sometimes','Weekly','Daily','Obsessed'] },
  { key:'diet',             label:'Diet',            emoji:'🥗', type:'select', options:['Omnivore','Vegetarian','Vegan','Keto','Halal','Kosher','Gluten Free'] },
  { key:'fav_food',         label:'Favorite Food',   emoji:'🍕', type:'text',   placeholder:'e.g. Sushi, Pizza, Tacos' },
  { key:'religion',         label:'Religion',        emoji:'🙏', type:'select', options:['Christian','Catholic','Muslim','Jewish','Hindu','Buddhist','Spiritual','Atheist','Agnostic','Other','Prefer not to say'] },
  { key:'politics',         label:'Politics',        emoji:'🗳️', type:'select', options:['Liberal','Conservative','Moderate','Apolitical','Prefer not to say'] },
  { key:'kids',             label:'Kids',            emoji:'👶', type:'select', options:['Have Kids','Want Kids','Open to Kids','Do Not Want Kids'] },
  { key:'languages',        label:'Languages',       emoji:'🌍', type:'text',   placeholder:'e.g. English, Spanish' },
  { key:'mbti',             label:'Personality',     emoji:'🧠', type:'select', options:['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'] },
  { key:'love_language',    label:'Love Language',   emoji:'💕', type:'select', options:['Words of Affirmation','Quality Time','Physical Touch','Acts of Service','Gift Giving'] },
  { key:'relationship_type',label:'Looking For',     emoji:'💞', type:'select', options:['Something Serious','Casual','Marriage','Friendship First','Not Sure Yet'] },
  { key:'sleeping_schedule',label:'Sleep Schedule',  emoji:'😴', type:'select', options:['Early Bird','Night Owl','Depends on the Day'] },
  { key:'social_media',     label:'Social Media',    emoji:'📱', type:'select', options:['Very Active','Sometimes','Rarely','Not on Social Media'] },
];

const PERSONAL_FIELDS = [
  { key:'height',      label:'Height',          emoji:'📏', type:'text',   placeholder:"e.g. 5'11\"" },
  { key:'ethnicity',   label:'Race/Ethnicity',  emoji:'🌎', type:'select', options:['White','Black','Hispanic','Asian','Middle Eastern','Mixed','Other','Prefer not to say'] },
  { key:'zodiac',      label:'Zodiac Sign',     emoji:'♈', type:'select', options:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'] },
  { key:'religion',    label:'Religion',        emoji:'🙏', type:'select', options:['Christian','Catholic','Muslim','Jewish','Hindu','Buddhist','Spiritual','Atheist','Agnostic','Other','Prefer not to say'] },
  { key:'politics',    label:'Politics',        emoji:'🗳️', type:'select', options:['Liberal','Conservative','Moderate','Apolitical','Prefer not to say'] },
  { key:'languages',   label:'Languages',       emoji:'🌍', type:'text',   placeholder:'e.g. English, Spanish' },
  { key:'hometown',    label:'Hometown',        emoji:'🏠', type:'text',   placeholder:'e.g. Nashville, TN' },
];

const GOALS_FIELDS = [
  { key:'want_kids',         label:'Want Kids',            emoji:'👶', type:'select', options:['Yes','No','Open to it','Already have kids'] },
  { key:'how_many_kids',     label:'How Many Kids',        emoji:'👨‍👩‍👧‍👦', type:'select', options:['1','2','3','4+','Not sure'] },
  { key:'marriage',          label:'Marriage',             emoji:'💍', type:'select', options:['Yes, I want to get married','No','Open to it'] },
  { key:'where_to_marry',    label:'Where to Marry',       emoji:'💒', type:'select', options:['Beach','Church','Destination','Courthouse','Backyard','Not sure'] },
  { key:'where_to_live',     label:'Where to Live',        emoji:'🏡', type:'select', options:['Big city','Suburbs','Small town','Countryside','Travel the world','Not sure'] },
  { key:'career_goals',      label:'Career Goals',         emoji:'💼', type:'select', options:['Entrepreneur','Corporate career','Creative field','Healthcare','Education','Military','Not sure'] },
  { key:'financial_goals',   label:'Financial Goals',      emoji:'💰', type:'select', options:['Buy a house','Retire early','Travel the world','Build wealth','Live comfortably','Not sure'] },
  { key:'relationship_timeline', label:'Relationship Timeline', emoji:'⏳', type:'select', options:['Ready now','Taking it slow','Not sure yet','Eventually'] },
  { key:'long_distance',     label:'Open to Long Distance',emoji:'✈️', type:'select', options:['Yes','No','Maybe'] },
  { key:'adventure_goals',   label:'Adventure Goals',      emoji:'🌍', type:'select', options:['Travel every year','Visit every continent','Try new things monthly','Homebody','Not sure'] },
  { key:'family_closeness',  label:'Family Closeness',     emoji:'👨‍👩‍👦', type:'select', options:['Very close family','Independent','Somewhere between'] },
  { key:'spiritual_goals',   label:'Spiritual Goals',      emoji:'✨', type:'select', options:['Grow in faith','Find my beliefs','Already grounded','Not religious'] },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast, toastJSX } = useToast();
  const [profile, setProfile]                   = useState<any>(null);
  const [loading, setLoading]                   = useState(true);
  const [bio, setBio]                           = useState('');
  const [profilePicture, setProfilePicture]     = useState<string | null>(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [uploading, setUploading]               = useState(false);
  const [photos, setPhotos]                     = useState<string[]>([]);
  const [interests, setInterests]               = useState<any[]>([]);
  const [knowMe, setKnowMe]                     = useState<any>({});
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editName, setEditName]                 = useState('');
  const [editBirthday, setEditBirthday]         = useState('');
  const [editBio, setEditBio]                   = useState('');
  const [editSaving, setEditSaving]             = useState(false);
  const [aboutMeModal, setAboutMeModal]         = useState(false);
  const [customOptions, setCustomOptions]       = useState<Record<string,string[]>>({});
  const [customEntryField, setCustomEntryField] = useState<string|null>(null);
  const [customEntryValue, setCustomEntryValue] = useState('');
  const [photoSlotModal, setPhotoSlotModal]     = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [previewModal, setPreviewModal]         = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.push('/auth'); return; }
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userData.user.id).single();
      if (error) { console.log('Profile error:', error); return; }
      if (data) {
        setProfile(data);
        setBio(data.bio || '');
        setInterests(data.interests || []);
        const loadedPhotos = Array.isArray(data.photo_urls) ? data.photo_urls : [];
        setPhotos(loadedPhotos);
        setProfilePicture(data.profile_picture || null);
        setKnowMe(data.get_to_know_me || {});
        const validCount = loadedPhotos.filter((p: string) => p).length;
        if (validCount < 4) {
          showToast('You need at least 4 photos to use Allure');
        }
      }
    } catch (err) {
      console.log('Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function uploadPhoto(index: number, uri?: string) {
    let photoUri = uri;
    if (!photoUri) {
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryStatus !== 'granted') {
        showToast('Allow photo access in Settings');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8,
      });
      if (result.canceled) return;
      photoUri = result.assets[0].uri;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const fileName = `${userData.user.id}_${index}_${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' as any });
      const byteArray = Uint8Array.from(atob(base64).split('').map((c: string) => c.charCodeAt(0)));
      const { error: uploadError } = await supabase.storage
        .from('photos').upload(fileName, byteArray, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
      const newPhotos = [...photos];
      newPhotos[index] = urlData.publicUrl;
      setPhotos([...newPhotos]);
      await supabase.from('profiles')
        .update({ photo_urls: newPhotos.filter(p => p) })
        .eq('id', userData.user.id);
    } catch (err: any) {
      showToast(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function takeSelfie(index: number) {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      showToast('Allow camera access in Settings');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false, exif: false, quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const flipped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      await uploadPhoto(index, flipped.uri);
    }
  }

  async function doUploadProfilePic(uri: string) {
    console.log('uploading pic', uri);
    setUploadingProfilePic(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const fileName = `${userData.user.id}_profile_pic_${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
      const byteArray = Uint8Array.from(atob(base64).split('').map((c: string) => c.charCodeAt(0)));
      const { error: uploadError } = await supabase.storage
        .from('photos').upload(fileName, byteArray, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
      setProfilePicture(urlData.publicUrl);
      await supabase.from('profiles')
        .update({ profile_picture: urlData.publicUrl })
        .eq('id', userData.user.id);
    } catch (err: any) {
      showToast(err.message || 'Upload failed');
    } finally {
      setUploadingProfilePic(false);
    }
  }

  function openEditProfile() {
    setEditName(profile?.name || '');
    const stored = profile?.birthday || '';
    if (stored && stored.length === 10 && stored.includes('-')) {
      const [y, m, d] = stored.split('-');
      setEditBirthday(`${m}/${d}/${y}`);
    } else {
      setEditBirthday('');
    }
    setEditBio(bio);
    setEditProfileModal(true);
  }

  async function removePhoto(index: number) {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos([...newPhotos]);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ photo_urls: newPhotos }).eq('id', userData.user.id);
  }

  async function toggleInterestDirect(cat: {emoji:string, label:string}) {
    const exists = interests.some((i: any) => i.label === cat.label);
    let newInterests: any[];
    if (exists) {
      newInterests = interests.filter((i: any) => i.label !== cat.label);
    } else if (interests.length < 5) {
      newInterests = [...interests, { emoji: cat.emoji, label: cat.label, desc: '' }];
    } else {
      return;
    }
    setInterests(newInterests);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ interests: newInterests }).eq('id', userData.user.id);
  }

  function openCustomEntry(fieldKey: string) {
    setCustomEntryField(fieldKey);
    setCustomEntryValue('');
  }

  function confirmCustomEntry() {
    const trimmed = customEntryValue.trim();
    if (!trimmed || !customEntryField) return;
    if (customEntryField === 'interest') {
      if (interests.length < 5) {
        const newInterests = [...interests, { emoji: '✨', label: trimmed, desc: '' }];
        setInterests(newInterests);
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) supabase.from('profiles').update({ interests: newInterests }).eq('id', data.user.id);
        });
      }
    } else {
      setCustomOptions(prev => ({ ...prev, [customEntryField]: [...(prev[customEntryField] || []), trimmed] }));
      saveKnowMeField(customEntryField, trimmed);
    }
    setCustomEntryField(null);
    setCustomEntryValue('');
  }

  async function saveKnowMeField(key: string, value: string) {
    const newKnowMe = { ...knowMe, [key]: value };
    setKnowMe(newKnowMe);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ get_to_know_me: newKnowMe }).eq('id', userData.user.id);
  }

  function formatBirthday(text: string): string {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0,2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
  }

  function calculateAge(birthdayStr: string): number {
    const today = new Date();
    const birth = new Date(birthdayStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  async function saveEditProfile() {
    if (!editName.trim()) { showToast('Name is required'); return; }
    setEditSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const updates: any = { name: editName.trim(), bio: editBio };
      if (editBirthday.length === 10) {
        const [m, d, y] = editBirthday.split('/');
        const isoDate = `${y}-${m}-${d}`;
        updates.birthday = isoDate;
        updates.age = calculateAge(isoDate);
      }
      await supabase.from('profiles').update(updates).eq('id', userData.user.id);
      setBio(editBio);
      setProfile((prev: any) => ({ ...prev, ...updates }));
      setEditProfileModal(false);
    } catch (err: any) {
      showToast(err.message || 'Save failed');
    } finally {
      setEditSaving(false);
    }
  }

  function checkPhotoRequirement() {
    const validCount = photos.filter(p => p).length;
    if (validCount < 4) {
      showToast('You need at least 4 photos to use Allure');
      return false;
    }
    return true;
  }

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.push('/auth');
      }}
    ]);
  }

  function getTierColor(tier: string) {
    if (tier === 'Celestial') return '#e8d5ff';
    if (tier === 'Luxe')      return '#ffe066';
    if (tier === 'Radiant')   return '#aaddff';
    return '#ffaad0';
  }

  function getTierEmoji(tier: string) {
    if (tier === 'Celestial') return '♛';
    if (tier === 'Luxe')      return '◈';
    if (tier === 'Radiant')   return '❋';
    return '✦';
  }

  if (loading) return (
    <View style={s.container}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
      <ActivityIndicator color="#ff4d82" size="large" />
    </View>
  );

  const validPhotos = photos.filter(p => p);
  const firstName   = profile?.name?.split(' ')[0] || 'Your Name';

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* PHOTO BANNER */}
        <View style={s.banner}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#3d0020', '#1a000e']} style={StyleSheet.absoluteFillObject} />
          )}
          <LinearGradient colors={['transparent', '#07000c']} style={StyleSheet.absoluteFillObject} />
          <Text style={s.bannerLogo}>Allure</Text>
          {/* Name + Age */}
          <View style={s.bannerBottom}>
            <Text style={s.bannerName}>{firstName}</Text>
            {profile?.age ? <Text style={s.bannerAge}>Age {profile.age}</Text> : null}
          </View>
          {/* Score pill */}
          {profile?.score ? (
            <View style={s.scorePill}>
              <Text style={s.scorePillTxt}>✦ {profile.score}</Text>
            </View>
          ) : null}
        </View>

        {/* BIO */}
        {bio ? <Text style={s.bio}>{bio}</Text> : null}

        {/* DIVIDER */}
        <View style={s.divider} />

        {/* LIST ROWS */}
        <TouchableOpacity style={s.listRow} onPress={openEditProfile}>
          <Text style={s.listRowTxt}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,77,130,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity style={s.listRow} onPress={() => setPreviewModal(true)}>
          <Text style={s.listRowTxt}>View My Profile</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,77,130,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity style={s.listRow} onPress={() => setAboutMeModal(true)}>
          <Text style={s.listRowTxt}>About Me</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,77,130,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity style={s.listRow} onPress={() => router.push('/facescan')}>
          <Text style={s.listRowTxt}>Rescan My Face</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,77,130,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity style={s.listRow} onPress={() => router.push('/terms')}>
          <Text style={s.listRowTxt}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,77,130,0.6)" />
        </TouchableOpacity>

        {/* UPGRADE BUTTON */}
        <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/subscription')}>
          <Text style={s.upgradeTxt}>✨ Upgrade to Allure+</Text>
        </TouchableOpacity>

        {/* LOG OUT */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutTxt}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editProfileModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight:'94%' }]}>

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileModal(false)}>
                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Profile Picture */}
              <Text style={s.modalLabel}>Profile Picture</Text>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12 }}>
                  {profilePicture
                    ? <Image source={{ uri: profilePicture }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                    : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person" size={36} color="rgba(255,255,255,0.2)" />
                      </View>
                  }
                </View>
                {uploadingProfilePic
                  ? <ActivityIndicator color="#ff4d82" />
                  : <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={{ borderWidth: 1, borderColor: '#ff4d82', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
                        onPress={async () => {
                          const { status } = await ImagePicker.requestCameraPermissionsAsync();
                          if (status !== 'granted') { showToast('Allow camera access in Settings'); return; }
                          const result = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, allowsEditing: true, quality: 0.8 });
                          if (!result.canceled && result.assets[0]) {
                            const flipped = await ImageManipulator.manipulateAsync(
                              result.assets[0].uri,
                              [{ flip: ImageManipulator.FlipType.Horizontal }],
                              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                            );
                            await doUploadProfilePic(flipped.uri);
                          }
                        }}
                      >
                        <Text style={{ color: '#ff4d82', fontSize: 13, fontWeight: '600' }}>Take Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ borderWidth: 1, borderColor: '#ff4d82', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
                        onPress={async () => {
                          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                          if (status !== 'granted') { showToast('Allow photo access in Settings'); return; }
                          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                          if (!result.canceled && result.assets[0]) await doUploadProfilePic(result.assets[0].uri);
                        }}
                      >
                        <Text style={{ color: '#ff4d82', fontSize: 13, fontWeight: '600' }}>Choose Photo</Text>
                      </TouchableOpacity>
                    </View>
                }
              </View>

              <Text style={s.modalLabel}>Name</Text>
              <TextInput
                style={s.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="words"
              />

              <Text style={s.modalLabel}>Bio</Text>
              <TextInput
                style={[s.modalInput, { minHeight:80, textAlignVertical:'top' }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Write something about yourself..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                multiline
                maxLength={150}
              />
              <Text style={s.charCount}>{editBio.length}/150</Text>

              <Text style={s.modalLabel}>Birthday</Text>
              <TextInput
                style={s.modalInput}
                value={editBirthday}
                onChangeText={t => setEditBirthday(formatBirthday(t))}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={[s.modalLabel, { marginTop:16 }]}>Photos</Text>
              <Text style={s.modalSub}>Tap to add · Long press to remove · Up to 8 photos</Text>
              <View style={s.photoGrid}>
                {[0,1,2,3,4,5,6,7].map(i => (
                  <TouchableOpacity
                    key={i}
                    style={s.photoSlot}
                    activeOpacity={0.7}
                    onPress={() => { setActivePhotoIndex(i); setPhotoSlotModal(true); }}
                    onLongPress={() => photos[i] && Alert.alert('Remove?', '', [
                      { text:'Cancel', style:'cancel' },
                      { text:'Remove', style:'destructive', onPress:() => removePhoto(i) },
                    ])}
                  >
                    {photos[i] ? (
                      <Image source={{ uri: photos[i] }} style={s.photoImg} resizeMode="cover" />
                    ) : (
                      <View style={s.photoEmpty}>
                        <Ionicons name="add" size={20} color="rgba(255,255,255,0.15)" />
                      </View>
                    )}
                    {i === 0 && photos[0] && (
                      <View style={s.mainBadge}><Text style={s.mainBadgeTxt}>Main</Text></View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {uploading && (
                <View style={s.uploadRow}>
                  <ActivityIndicator color="#ff4d82" size="small" />
                  <Text style={s.uploadTxt}>Uploading...</Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.saveBtn, editSaving && { opacity:0.6 }]}
                onPress={saveEditProfile}
                disabled={editSaving}
              >
                {editSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnTxt}>Save Profile</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>

          {/* Photo Picker Overlay — inside Edit Profile modal to avoid nested Modal on iOS */}
          {photoSlotModal && (
            <View style={{ position:'absolute', inset:0, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.6)' }}>
              <View style={{ backgroundColor:'#0a0005', borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:36, paddingHorizontal:20, paddingTop:12 }}>
                <View style={{ width:36, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.12)', alignSelf:'center', marginBottom:18 }} />
                <Text style={{ fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.28)', textAlign:'center', letterSpacing:1.5, textTransform:'uppercase', marginBottom:16 }}>Add Photo</Text>
                <TouchableOpacity
                  style={{ flexDirection:'row', alignItems:'center', paddingVertical:14, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' }}
                  onPress={() => { setPhotoSlotModal(false); takeSelfie(activePhotoIndex); }}
                >
                  <View style={{ width:34, height:34, borderRadius:17, backgroundColor:'rgba(255,77,130,0.08)', borderWidth:1, borderColor:'rgba(255,77,130,0.18)', alignItems:'center', justifyContent:'center', marginRight:14 }}>
                    <Ionicons name="camera" size={16} color="#ff4d82" />
                  </View>
                  <Text style={{ flex:1, fontSize:16, color:'#fff', fontWeight:'500' }}>Take a Photo</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,77,130,0.6)" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection:'row', alignItems:'center', paddingVertical:14 }}
                  onPress={() => { setPhotoSlotModal(false); uploadPhoto(activePhotoIndex); }}
                >
                  <View style={{ width:34, height:34, borderRadius:17, backgroundColor:'rgba(255,77,130,0.08)', borderWidth:1, borderColor:'rgba(255,77,130,0.18)', alignItems:'center', justifyContent:'center', marginRight:14 }}>
                    <Ionicons name="image" size={16} color="#ff4d82" />
                  </View>
                  <Text style={{ flex:1, fontSize:16, color:'#fff', fontWeight:'500' }}>Choose from Library</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,77,130,0.6)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPhotoSlotModal(false)} style={{ marginTop:16 }}>
                  <Text style={{ textAlign:'center', fontSize:15, color:'rgba(255,255,255,0.3)', fontWeight:'500' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* About Me Modal — single scrollable page */}
      <Modal visible={aboutMeModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight:'94%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>About Me</Text>
              <TouchableOpacity onPress={() => setAboutMeModal(false)}>
                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* ── INTERESTS ── */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>INTERESTS</Text>
                <TouchableOpacity style={s.addCircle} onPress={() => openCustomEntry('interest')}>
                  <Text style={s.addCircleTxt}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.modalSub}>Tap to select up to 5 · {interests.length}/5</Text>
              <View style={s.allPillsWrap}>
                {INTEREST_CATEGORIES.map(cat => {
                  const isSelected = interests.some((i: any) => i.label === cat.label);
                  const isMaxed = !isSelected && interests.length >= 5;
                  return (
                    <TouchableOpacity
                      key={cat.label}
                      style={[s.interestPillAll, isSelected && s.interestPillAllSelected, isMaxed && { opacity:0.25 }]}
                      onPress={() => toggleInterestDirect(cat)}
                      disabled={isMaxed}
                    >
                      <Text style={[s.interestPillAllTxt, isSelected && s.interestPillAllTxtSelected]}>
                        {cat.emoji} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom entry inline (interests) */}
              {customEntryField === 'interest' && (
                <View style={s.customEntryRow}>
                  <TextInput
                    style={[s.knowMeInput, { flex:1 }]}
                    placeholder="Custom interest..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={customEntryValue}
                    onChangeText={setCustomEntryValue}
                    autoFocus
                    onSubmitEditing={confirmCustomEntry}
                  />
                  <TouchableOpacity style={s.customEntryAdd} onPress={confirmCustomEntry}>
                    <Text style={s.customEntryAddTxt}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCustomEntryField(null)}>
                    <Ionicons name="close" size={18} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={s.sectionDivider} />

              {/* ── PERSONAL ── */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>PERSONAL</Text>
              </View>
              {PERSONAL_FIELDS.map(field => (
                <View key={field.key} style={s.knowMeField}>
                  <View style={s.knowMeFieldLeft}>
                    <Text style={s.knowMeFieldEmoji}>{field.emoji}</Text>
                    <Text style={s.knowMeFieldLabel}>{field.label}</Text>
                  </View>
                  {field.type === 'text' ? (
                    <TextInput
                      style={s.knowMeInput}
                      placeholder={field.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.15)"
                      value={knowMe[field.key] || ''}
                      onChangeText={v => setKnowMe({ ...knowMe, [field.key]: v })}
                      onBlur={() => saveKnowMeField(field.key, knowMe[field.key] || '')}
                    />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.optionsScroll}>
                      <View style={s.optionsRow}>
                        {[...(field.options || []), ...(customOptions[field.key] || [])].map(opt => (
                          <TouchableOpacity
                            key={opt}
                            style={[s.optionPill, knowMe[field.key] === opt && s.optionPillSelected]}
                            onPress={() => saveKnowMeField(field.key, opt)}
                          >
                            <Text style={[s.optionPillTxt, knowMe[field.key] === opt && s.optionPillTxtSelected]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={s.inlineAddBtn} onPress={() => openCustomEntry(field.key)}>
                          <Text style={s.inlineAddBtnTxt}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  )}
                  {customEntryField === field.key && (
                    <View style={s.customEntryRow}>
                      <TextInput
                        style={[s.knowMeInput, { flex:1 }]}
                        placeholder="Custom value..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={customEntryValue}
                        onChangeText={setCustomEntryValue}
                        autoFocus
                        onSubmitEditing={confirmCustomEntry}
                      />
                      <TouchableOpacity style={s.customEntryAdd} onPress={confirmCustomEntry}>
                        <Text style={s.customEntryAddTxt}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              <View style={s.sectionDivider} />

              {/* ── GOALS ── */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>GOALS</Text>
              </View>
              {GOALS_FIELDS.map(field => (
                <View key={field.key} style={s.knowMeField}>
                  <View style={[s.knowMeFieldLeft, { justifyContent:'space-between' }]}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <Text style={s.knowMeFieldEmoji}>{field.emoji}</Text>
                      <Text style={s.knowMeFieldLabel}>{field.label}</Text>
                    </View>
                    <TouchableOpacity style={s.inlineAddBtn} onPress={() => openCustomEntry(field.key)}>
                      <Text style={s.inlineAddBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.optionsScroll}>
                    <View style={s.optionsRow}>
                      {[...(field.options || []), ...(customOptions[field.key] || [])].map(opt => (
                        <TouchableOpacity
                          key={opt}
                          style={[s.optionPill, knowMe[field.key] === opt && s.optionPillSelected]}
                          onPress={() => saveKnowMeField(field.key, opt)}
                        >
                          <Text style={[s.optionPillTxt, knowMe[field.key] === opt && s.optionPillTxtSelected]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {customEntryField === field.key && (
                    <View style={s.customEntryRow}>
                      <TextInput
                        style={[s.knowMeInput, { flex:1 }]}
                        placeholder="Custom goal..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={customEntryValue}
                        onChangeText={setCustomEntryValue}
                        autoFocus
                        onSubmitEditing={confirmCustomEntry}
                      />
                      <TouchableOpacity style={s.customEntryAdd} onPress={confirmCustomEntry}>
                        <Text style={s.customEntryAddTxt}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              <View style={s.sectionDivider} />

              {/* ── GET TO KNOW ME ── */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionLabel}>GET TO KNOW ME</Text>
              </View>
              {KNOW_ME_FIELDS.map(field => (
                <View key={field.key} style={s.knowMeField}>
                  <View style={s.knowMeFieldLeft}>
                    <Text style={s.knowMeFieldEmoji}>{field.emoji}</Text>
                    <Text style={s.knowMeFieldLabel}>{field.label}</Text>
                  </View>
                  {field.type === 'text' ? (
                    <TextInput
                      style={s.knowMeInput}
                      placeholder={field.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.15)"
                      value={knowMe[field.key] || ''}
                      onChangeText={v => setKnowMe({ ...knowMe, [field.key]: v })}
                      onBlur={() => saveKnowMeField(field.key, knowMe[field.key] || '')}
                    />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.optionsScroll}>
                      <View style={s.optionsRow}>
                        {field.options?.map(opt => (
                          <TouchableOpacity
                            key={opt}
                            style={[s.optionPill, knowMe[field.key] === opt && s.optionPillSelected]}
                            onPress={() => saveKnowMeField(field.key, opt)}
                          >
                            <Text style={[s.optionPillTxt, knowMe[field.key] === opt && s.optionPillTxtSelected]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                </View>
              ))}

              <View style={{ height:30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Preview Modal */}
      <Modal visible={previewModal} transparent animationType="fade">
        <View style={s.previewContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* All photos stacked */}
            {validPhotos.length > 0 ? validPhotos.map((uri, i) => (
              <View key={i} style={s.previewBanner}>
                <Image source={{ uri }} style={s.previewBannerImg} resizeMode="cover" />
                {i === 0 && (
                  <>
                    <LinearGradient colors={['transparent', '#07000c']} style={s.previewBannerGradient} />
                    <View style={s.previewBannerBottom}>
                      <Text style={s.previewName}>
                        {firstName}{profile?.age ? `, ${profile.age}` : ''}
                      </Text>
                      {profile?.score ? (
                        <View style={s.scorePill}>
                          <Text style={s.scorePillTxt}>✦ {profile.score}</Text>
                        </View>
                      ) : null}
                    </View>
                  </>
                )}
              </View>
            )) : (
              <View style={s.previewBanner}>
                <View style={[s.previewBannerImg, { backgroundColor:'rgba(255,255,255,0.05)', alignItems:'center', justifyContent:'center' }]}>
                  <Ionicons name="person" size={80} color="rgba(255,255,255,0.1)" />
                </View>
                <LinearGradient colors={['transparent', '#07000c']} style={s.previewBannerGradient} />
                <View style={s.previewBannerBottom}>
                  <Text style={s.previewName}>{firstName}{profile?.age ? `, ${profile.age}` : ''}</Text>
                </View>
              </View>
            )}

            {bio ? <Text style={s.previewBio}>{bio}</Text> : null}

            {interests.length > 0 && (
              <View style={s.previewInterestRow}>
                {interests.map((int, i) => (
                  <View key={i} style={s.interestPill}>
                    <Text style={s.interestPillTxt}>{int.emoji} {int.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={s.previewNote}>You are viewing your profile as others see it</Text>
          </ScrollView>

          <TouchableOpacity style={s.previewClose} onPress={() => setPreviewModal(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      {toastJSX}
    </View>
  );
}

const s = StyleSheet.create({
  // Container
  container:            { flex:1, backgroundColor:'#07000c' },
  scroll:               { flexGrow:1, backgroundColor:'#07000c', paddingBottom:120 },

  // Banner
  banner:               { width:'100%', height:windowHeight * 0.65, position:'relative', overflow:'hidden' },
  bannerLogo:           { position:'absolute', top:54, left:16, fontSize:16, fontStyle:'italic', color:'#ff4d82', fontWeight:'200', letterSpacing:3 },
  bannerBottom:         { position:'absolute', bottom:20, left:16 },
  bannerName:           { fontSize:24, fontWeight:'800', color:'#fff' },
  bannerAge:            { fontSize:14, color:'rgba(255,255,255,0.6)', marginTop:3 },
  scorePill:            { position:'absolute', bottom:20, right:16, backgroundColor:'#ff4d82', borderRadius:50, paddingHorizontal:14, paddingVertical:8 },
  scorePillTxt:         { fontSize:13, fontWeight:'700', color:'#fff' },

  // Bio
  bio:                  { paddingHorizontal:16, paddingTop:12, fontSize:14, color:'rgba(255,255,255,0.5)', fontStyle:'italic', lineHeight:20 },

  // Divider
  divider:              { height:1, backgroundColor:'rgba(255,255,255,0.07)', marginTop:14 },

  // List rows
  listRow:              { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:22, paddingVertical:17, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)' },
  listRowTxt:           { fontSize:16, color:'rgba(255,255,255,0.85)', fontWeight:'500' },

  // Interest pills (shared)
  interestPill:         { paddingHorizontal:12, paddingVertical:5, borderRadius:50, borderWidth:1, borderColor:'#ff4d82', backgroundColor:'rgba(255,77,130,0.10)' },
  interestPillTxt:      { fontSize:12, color:'#ff4d82', fontWeight:'600' },

  // Upgrade button
  upgradeBtn:           { marginHorizontal:22, marginTop:22, borderRadius:50, backgroundColor:'#ff4d82', paddingVertical:15, alignItems:'center' },
  upgradeTxt:           { color:'#fff', fontSize:15, fontWeight:'700' },

  // Logout
  logoutBtn:            { alignItems:'center', marginTop:14, marginBottom:10, paddingVertical:14 },
  logoutTxt:            { color:'rgba(255,255,255,0.28)', fontSize:14, fontWeight:'500' },

  // Preview Modal
  previewContainer:     { flex:1, backgroundColor:'#07000c' },
  previewBanner:        { width:'100%', height:windowHeight * 0.6, position:'relative' },
  previewBannerImg:     { width:'100%', height:'100%' },
  previewBannerGradient:{ position:'absolute', left:0, right:0, bottom:0, height:200 },
  previewBannerBottom:  { position:'absolute', bottom:0, left:16, right:16, paddingBottom:20 },
  previewName:          { fontSize:26, fontWeight:'800', color:'#fff', marginBottom:8 },
  previewBio:           { paddingHorizontal:16, paddingTop:14, fontSize:14, color:'rgba(255,255,255,0.6)', fontStyle:'italic', lineHeight:21 },
  previewInterestRow:   { flexDirection:'row', flexWrap:'wrap', gap:8, paddingHorizontal:16, marginTop:14 },
  previewNote:          { fontSize:12, color:'rgba(255,77,130,0.6)', fontStyle:'italic', textAlign:'center', marginTop:24, marginBottom:40, paddingHorizontal:24 },
  previewClose:         { position:'absolute', top:54, right:16, width:36, height:36, borderRadius:18, backgroundColor:'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center' },

  // Section headers (About Me scrollable)
  sectionHeaderRow:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:18, marginBottom:10 },
  sectionLabel:         { fontSize:10, fontWeight:'700', color:'#ff4d82', letterSpacing:2, textTransform:'uppercase' },
  sectionDivider:       { height:1, backgroundColor:'rgba(255,255,255,0.06)', marginVertical:10 },
  addCircle:            { width:24, height:24, borderRadius:12, borderWidth:1, borderColor:'#ff4d82', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,77,130,0.08)' },
  addCircleTxt:         { fontSize:16, color:'#ff4d82', lineHeight:20 },
  allPillsWrap:         { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:10 },
  interestPillAll:      { paddingHorizontal:12, paddingVertical:7, borderRadius:50, borderWidth:1, borderColor:'rgba(255,255,255,0.12)', backgroundColor:'rgba(255,255,255,0.06)' },
  interestPillAllSelected:{ borderColor:'#ff4d82', backgroundColor:'rgba(255,77,130,0.18)' },
  interestPillAllTxt:   { fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:'500' },
  interestPillAllTxtSelected:{ color:'#ff4d82', fontWeight:'600' },
  inlineAddBtn:         { width:26, height:26, borderRadius:13, borderWidth:1, borderColor:'rgba(255,77,130,0.35)', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,77,130,0.06)', marginLeft:4 },
  inlineAddBtnTxt:      { fontSize:15, color:'#ff4d82', lineHeight:18 },
  customEntryRow:       { flexDirection:'row', alignItems:'center', gap:8, marginTop:8, marginBottom:4 },
  customEntryAdd:       { paddingHorizontal:12, paddingVertical:8, borderRadius:50, backgroundColor:'#ff4d82' },
  customEntryAddTxt:    { fontSize:12, color:'#fff', fontWeight:'700' },

  // Modals
  modalOverlay:         { flex:1, backgroundColor:'rgba(0,0,0,0.9)', justifyContent:'flex-end' },
  modalCard:            { backgroundColor:'#1e0012', borderRadius:24, padding:22, maxHeight:'92%', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  modalHeader:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  modalTitle:           { fontSize:18, fontWeight:'700', color:'#fff' },
  modalSub:             { fontSize:12, color:'rgba(255,255,255,0.42)', marginBottom:16 },
  modalLabel:           { fontSize:11, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, marginTop:8 },
  photoGrid:            { flexDirection:'row', flexWrap:'wrap', gap:8 },
  photoSlot:            { width:'23%', aspectRatio:3/4, borderRadius:10, overflow:'hidden', backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', position:'relative' },
  photoImg:             { width:'100%', height:'100%' },
  photoEmpty:           { flex:1, alignItems:'center', justifyContent:'center' },
  mainBadge:            { position:'absolute', bottom:4, left:4, backgroundColor:'#ff4d82', borderRadius:4, paddingHorizontal:4, paddingVertical:1 },
  mainBadgeTxt:         { fontSize:8, color:'#fff', fontWeight:'700' },
  uploadRow:            { flexDirection:'row', alignItems:'center', gap:8, marginTop:10 },
  uploadTxt:            { fontSize:13, color:'rgba(255,255,255,0.4)' },
  charCount:            { fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'right', marginTop:4 },
  saveBtn:              { backgroundColor:'#ff4d82', borderRadius:50, padding:14, alignItems:'center', marginTop:12 },
  saveBtnTxt:           { color:'#fff', fontSize:14, fontWeight:'700' },
  modalInput:           { backgroundColor:'rgba(255,255,255,0.06)', borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', padding:12, fontSize:14, color:'#fff', marginBottom:4 },
  knowMeField:          { marginBottom:18 },
  knowMeFieldLeft:      { flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  knowMeFieldEmoji:     { fontSize:16 },
  knowMeFieldLabel:     { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.75)' },
  knowMeInput:          { backgroundColor:'rgba(255,255,255,0.08)', borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.13)', padding:11, fontSize:14, color:'#fff' },
  optionsScroll:        { marginBottom:4 },
  optionsRow:           { flexDirection:'row', gap:8, paddingBottom:4 },
  optionPill:           { paddingHorizontal:14, paddingVertical:7, borderRadius:50, borderWidth:1, borderColor:'rgba(255,255,255,0.15)', backgroundColor:'rgba(255,255,255,0.07)' },
  optionPillSelected:   { borderColor:'#ff4d82', backgroundColor:'rgba(255,77,130,0.15)' },
  optionPillTxt:        { fontSize:13, color:'rgba(255,255,255,0.58)' },
  optionPillTxtSelected:{ color:'#ff4d82', fontWeight:'600' },
});
