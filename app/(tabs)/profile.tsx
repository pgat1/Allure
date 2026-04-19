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
  const [aboutMeTab, setAboutMeTab]             = useState<'interests' | 'knowme'>('interests');
  const [editingInterest, setEditingInterest]   = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [interestDesc, setInterestDesc]         = useState('');
  const [photoSlotModal, setPhotoSlotModal]     = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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
          showToast('📸', 'More Photos Needed', 'You need at least 4 photos to use Allure.');
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
        showToast('❌', 'Permission needed', 'Please allow photo access in Settings');
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
      showToast('✨', 'Photo uploaded!');
    } catch (err: any) {
      showToast('❌', 'Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function takeSelfie(index: number) {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      showToast('❌', 'Permission needed', 'Please allow camera access in Settings');
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
    setUploadingProfilePic(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const fileName = `${userData.user.id}_profile_pic.jpg`;
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
      showToast('✨', 'Profile picture updated!');
    } catch (err: any) {
      showToast('❌', 'Upload failed', err.message);
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

  function openInterestEdit(index: number) {
    setEditingInterest(index);
    const existing = interests[index];
    if (existing) {
      setSelectedCategory({ emoji: existing.emoji, label: existing.label });
      setInterestDesc(existing.desc || '');
    } else {
      setSelectedCategory(null);
      setInterestDesc('');
    }
  }

  async function saveInterest() {
    if (!selectedCategory) { showToast('⚠️', 'Pick a category first'); return; }
    const newInterests = [...interests];
    newInterests[editingInterest] = {
      emoji: selectedCategory.emoji,
      label: selectedCategory.label,
      desc: interestDesc.trim(),
    };
    setInterests(newInterests);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ interests: newInterests }).eq('id', userData.user.id);
    showToast('✅', 'Interest saved!');
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
    if (!editName.trim()) { showToast('⚠️', 'Name required', 'Please enter your name'); return; }
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
      showToast('✅', 'Profile saved!');
    } catch (err: any) {
      showToast('❌', 'Save failed', err.message);
    } finally {
      setEditSaving(false);
    }
  }

  function checkPhotoRequirement() {
    const validCount = photos.filter(p => p).length;
    if (validCount < 4) {
      showToast('📸', 'More Photos Needed', 'You need at least 4 photos to use Allure.');
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

  const tierColor   = getTierColor(profile?.tier || 'Bloom');
  const tierEmoji   = getTierEmoji(profile?.tier || 'Bloom');
  const validPhotos = photos.filter(p => p);
  const knowMeCount = Object.keys(knowMe).filter(k => knowMe[k]).length;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.pageWrap}>

        {/* TOP PHOTO BANNER */}
        <View style={s.banner}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#3a0025', '#1a000f']} style={StyleSheet.absoluteFillObject} />
          )}
          {/* Dark gradient overlay */}
          <LinearGradient
            colors={['transparent', '#07000c']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Allure wordmark */}
          <Text style={s.bannerWordmark}>Allure</Text>

          {/* Bottom info row */}
          <View style={s.bannerBottom}>
            <View style={{ flexShrink: 1, marginRight: 8 }}>
              <Text style={s.bannerName}>{profile?.name || 'Your Name'}</Text>
              {profile?.age ? <Text style={s.bannerAge}>Age {profile.age}</Text> : null}
            </View>
            <View style={s.bannerTierPill}>
              <Text style={s.bannerTierTxt}>{tierEmoji} {profile?.score || 0}</Text>
            </View>
          </View>
        </View>

        {/* BELOW BANNER */}
        <View style={s.below}>

          {bio ? <Text style={s.bio}>{bio}</Text> : null}

          {interests.length > 0 && (
            <View style={s.pillsRow}>
              {interests.slice(0, 3).map((int, i) => (
                <View key={i} style={s.interestPill}>
                  <Text style={s.interestPillTxt}>{int.emoji} {int.label}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.divider} />

          {/* Edit Profile */}
          <TouchableOpacity style={s.listRow} onPress={openEditProfile}>
            <Text style={s.listRowTxt}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color="#ff4d82" />
          </TouchableOpacity>
          <View style={s.rowDivider} />

          {/* About Me */}
          <TouchableOpacity style={s.listRow} onPress={() => { setAboutMeTab('interests'); setAboutMeModal(true); }}>
            <Text style={s.listRowTxt}>About Me</Text>
            <Ionicons name="chevron-forward" size={16} color="#ff4d82" />
          </TouchableOpacity>
          <View style={s.rowDivider} />

          {/* Rescan My Face */}
          <TouchableOpacity style={s.listRow} onPress={() => router.push('/facescan')}>
            <Text style={s.listRowTxt}>Rescan My Face</Text>
            <Ionicons name="chevron-forward" size={16} color="#ff4d82" />
          </TouchableOpacity>
          <View style={s.rowDivider} />

          {/* Terms of Service */}
          <TouchableOpacity style={s.listRow} onPress={() => router.push('/terms')}>
            <Text style={s.listRowTxt}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color="#ff4d82" />
          </TouchableOpacity>

          <View style={s.divider} />

          {/* Upgrade */}
          <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/subscription')}>
            <Text style={s.upgradeTxt}>✨ Upgrade to Allure+</Text>
          </TouchableOpacity>

          {/* Log Out */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutTxt}>Log Out</Text>
          </TouchableOpacity>

        </View>

        </View>{/* end pageWrap */}
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
                          if (status !== 'granted') { showToast('❌', 'Permission needed', 'Allow camera access in Settings'); return; }
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
                          if (status !== 'granted') { showToast('❌', 'Permission needed', 'Allow photo access in Settings'); return; }
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

      {/* About Me Modal (Interests + Get to Know Me tabs) */}
      <Modal visible={aboutMeModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight:'94%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>About Me</Text>
              <TouchableOpacity onPress={() => setAboutMeModal(false)}>
                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tabBtn, aboutMeTab === 'interests' && s.tabBtnActive]}
                onPress={() => setAboutMeTab('interests')}
              >
                <Text style={[s.tabBtnTxt, aboutMeTab === 'interests' && s.tabBtnTxtActive]}>Interests</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tabBtn, aboutMeTab === 'knowme' && s.tabBtnActive]}
                onPress={() => setAboutMeTab('knowme')}
              >
                <Text style={[s.tabBtnTxt, aboutMeTab === 'knowme' && s.tabBtnTxtActive]}>Get to Know Me</Text>
              </TouchableOpacity>
            </View>

            {/* Interests tab */}
            {aboutMeTab === 'interests' && (
              <>
                <Text style={s.modalSub}>Up to 5 interests shown on your profile</Text>
                <View style={s.currentInterests}>
                  {[0,1,2,3,4].map(i => (
                    <TouchableOpacity
                      key={i}
                      style={[s.interestSlot, interests[i] && { borderColor:'rgba(255,77,130,0.4)', backgroundColor:'rgba(255,77,130,0.08)' }]}
                      onPress={() => openInterestEdit(i)}
                    >
                      {interests[i]
                        ? <Text style={s.interestSlotTxt}>{interests[i].emoji} {interests[i].label}</Text>
                        : <Text style={s.interestSlotEmpty}>+ Add</Text>
                      }
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.modalLabel}>Pick a category</Text>
                <ScrollView style={s.categoryScroll} showsVerticalScrollIndicator={false}>
                  <View style={s.categoryGrid}>
                    {INTEREST_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.label}
                        style={[s.categoryPill, selectedCategory?.label === cat.label && s.categoryPillSelected]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <Text style={s.categoryEmoji}>{cat.emoji}</Text>
                        <Text style={[s.categoryLabel, selectedCategory?.label === cat.label && s.categoryLabelSelected]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={s.modalInput}
                  placeholder="Add your own description (optional)"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={interestDesc}
                  onChangeText={setInterestDesc}
                  maxLength={60}
                />
                <TouchableOpacity style={s.saveBtn} onPress={saveInterest}>
                  <Text style={s.saveBtnTxt}>Save Interest</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Get to Know Me tab */}
            {aboutMeTab === 'knowme' && (
              <>
                <Text style={s.modalSub}>Fill out what you're comfortable sharing</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight:'80%' }}>
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
                                <Text style={[s.optionPillTxt, knowMe[field.key] === opt && s.optionPillTxtSelected]}>
                                  {opt}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>


      {toastJSX}
    </View>
  );
}

const s = StyleSheet.create({
  container:            { flex:1, backgroundColor:'#07000c' },
  scroll:               { flexGrow:1, backgroundColor:'#07000c' },
  pageWrap:             { flex:1, minHeight:windowHeight, justifyContent:'flex-end' },

  // Banner
  banner:               { position:'absolute', top:0, left:0, right:0, minHeight:windowHeight * 0.55, overflow:'hidden' },
  bannerWordmark:       { position:'absolute', top:52, left:16, fontSize:13, fontStyle:'italic', color:'#ff4d82', fontWeight:'600', letterSpacing:0.5 },
  cameraBadge:          { position:'absolute', bottom:52, left:16, width:30, height:30, borderRadius:15, backgroundColor:'#ff4d82', alignItems:'center', justifyContent:'center', zIndex:10 },
  bannerBottom:         { position:'absolute', bottom:40, left:0, right:0, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', paddingHorizontal:16, paddingBottom:16 },
  bannerName:           { fontSize:20, fontWeight:'700', color:'#fff', letterSpacing:0.2, flexShrink:1, flexWrap:'wrap' },
  bannerAge:            { fontSize:13, color:'rgba(255,255,255,0.45)', marginTop:2 },
  bannerTierPill:       { backgroundColor:'#ff4d82', borderRadius:50, paddingHorizontal:12, paddingVertical:5, flexShrink:0 },
  bannerTierTxt:        { color:'#fff', fontSize:13, fontWeight:'700' },

  // Below banner
  below:                { backgroundColor:'#07000c', paddingTop:0, paddingBottom:120 },
  bio:                  { fontSize:13, color:'rgba(255,255,255,0.42)', fontStyle:'italic', paddingHorizontal:16, paddingTop:12, paddingBottom:4, lineHeight:20 },
  pillsRow:             { flexDirection:'row', gap:8, paddingHorizontal:16, paddingTop:10, marginBottom:14, flexWrap:'nowrap' },
  interestPill:         { paddingHorizontal:12, paddingVertical:5, borderRadius:50, borderWidth:1, borderColor:'#ff4d82', backgroundColor:'rgba(255,77,130,0.10)' },
  interestPillTxt:      { fontSize:12, color:'#ff4d82', fontWeight:'600' },

  // Dividers
  divider:              { height:1, backgroundColor:'rgba(255,255,255,0.06)', marginBottom:4 },
  rowDivider:           { height:1, backgroundColor:'rgba(255,255,255,0.06)', marginHorizontal:16 },

  // List rows
  listRow:              { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:16 },
  listRowTxt:           { fontSize:15, color:'rgba(255,255,255,0.85)', fontWeight:'500' },

  // Upgrade button
  upgradeBtn:           { marginHorizontal:16, marginTop:24, borderRadius:50, backgroundColor:'#ff4d82', paddingVertical:15, alignItems:'center' },
  upgradeTxt:           { color:'#fff', fontSize:15, fontWeight:'700' },

  // Logout
  logoutBtn:            { alignItems:'center', marginTop:14, marginBottom:10, paddingVertical:14 },
  logoutTxt:            { color:'rgba(255,255,255,0.32)', fontSize:14, fontWeight:'500' },

  // Modals
  tabRow:               { flexDirection:'row', gap:8, marginBottom:14 },
  tabBtn:               { flex:1, paddingVertical:9, borderRadius:50, alignItems:'center', backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  tabBtnActive:         { backgroundColor:'rgba(255,77,130,0.18)', borderColor:'#ff4d82' },
  tabBtnTxt:            { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.4)' },
  tabBtnTxtActive:      { color:'#ff4d82' },
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
  currentInterests:     { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:12 },
  interestSlot:         { paddingHorizontal:12, paddingVertical:7, borderRadius:50, borderWidth:1, borderColor:'rgba(255,255,255,0.15)', backgroundColor:'rgba(255,255,255,0.07)' },
  interestSlotTxt:      { fontSize:13, color:'#ff4d82', fontWeight:'600' },
  interestSlotEmpty:    { fontSize:13, color:'rgba(255,255,255,0.2)' },
  categoryScroll:       { maxHeight:180, marginBottom:10 },
  categoryGrid:         { flexDirection:'row', flexWrap:'wrap', gap:8 },
  categoryPill:         { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:20, paddingHorizontal:12, paddingVertical:8, borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  categoryPillSelected: { backgroundColor:'rgba(255,77,130,0.2)', borderColor:'#ff4d82' },
  categoryEmoji:        { fontSize:14 },
  categoryLabel:        { fontSize:12, color:'rgba(255,255,255,0.65)' },
  categoryLabelSelected:{ color:'#ff4d82', fontWeight:'700' },
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
