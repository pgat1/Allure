import { supabase } from '@/app/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image, Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

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
  const [profile, setProfile]                 = useState<any>(null);
  const [loading, setLoading]                 = useState(true);
  const [editing, setEditing]                 = useState(false);
  const [bio, setBio]                         = useState('');
  const [saving, setSaving]                   = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [photos, setPhotos]                   = useState<string[]>([]);
  const [interests, setInterests]             = useState<any[]>([]);
  const [knowMe, setKnowMe]                   = useState<any>({});
  const [photoModal, setPhotoModal]           = useState(false);
  const [interestModal, setInterestModal]     = useState(false);
  const [knowMeModal, setKnowMeModal]         = useState(false);
  const [editingInterest, setEditingInterest] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [interestDesc, setInterestDesc]       = useState('');
  const [editingField, setEditingField]       = useState<any>(null);
  const [fieldValue, setFieldValue]           = useState('');

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
        setPhotos(Array.isArray(data.photo_urls) ? data.photo_urls : []);
        setKnowMe(data.get_to_know_me || {});
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
      Alert.alert('Photo uploaded! ✨');
    } catch (err: any) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function takeSelfie(index: number) {
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true, aspect: [3, 4], quality: 0.8,
    });
    if (!result.canceled) await uploadPhoto(index, result.assets[0].uri);
  }

  function handleProfilePhotoPress() {
    Alert.alert('Profile Photo', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      { text: '🤳 Take a Selfie', onPress: () => takeSelfie(0) },
      { text: '🖼️ Choose from Library', onPress: () => uploadPhoto(0) },
      { text: '👁️ Preview Photos', onPress: () => setPhotoModal(true) },
    ]);
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
    setInterestModal(true);
  }

  async function saveInterest() {
    if (!selectedCategory) { Alert.alert('Please select a category'); return; }
    const newInterests = [...interests];
    newInterests[editingInterest!] = {
      emoji: selectedCategory.emoji,
      label: selectedCategory.label,
      desc: interestDesc.trim(),
    };
    setInterests(newInterests);
    setInterestModal(false);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ interests: newInterests }).eq('id', userData.user.id);
  }

  async function saveKnowMeField(key: string, value: string) {
    const newKnowMe = { ...knowMe, [key]: value };
    setKnowMe(newKnowMe);
    setEditingField(null);
    setFieldValue('');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ get_to_know_me: newKnowMe }).eq('id', userData.user.id);
  }

  async function saveBio() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('profiles').update({ bio }).eq('id', userData.user.id);
    setProfile((prev: any) => ({ ...prev, bio }));
    setEditing(false);
    setSaving(false);
    Alert.alert('Saved!');
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
      <ActivityIndicator color="#ff4d82" size="large" />
    </View>
  );

  const tierColor   = getTierColor(profile?.tier || 'Bloom');
  const tierEmoji   = getTierEmoji(profile?.tier || 'Bloom');
  const intentIcon  = profile?.intent === 'hookup' ? '🔥' : '💞';
  const validPhotos = photos.filter(p => p);
  const knowMeCount = Object.keys(knowMe).filter(k => knowMe[k]).length;

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#1a0010', '#0d0008', '#000']}
        start={{ x:0.5, y:0 }}
        end={{ x:0.5, y:1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Allure logo */}
        <View style={s.topBar}>
          <Text style={s.logo}>Allure</Text>
          <View style={s.logoLine} />
        </View>

        {/* Profile circle + necklace */}
        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            <TouchableOpacity
              style={[s.avatarRing, { borderColor: tierColor }]}
              onPress={handleProfilePhotoPress}
            >
              {validPhotos[0] ? (
                <Image source={{ uri: validPhotos[0] }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarEmpty}>
                  <Ionicons name="person" size={36} color="rgba(255,255,255,0.2)" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.plusBtn} onPress={handleProfilePhotoPress}>
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>

            <View style={[s.necklace, s.necklaceLeft, { borderColor: tierColor }]}>
              <Text style={[s.necklaceScore, { color: tierColor }]}>{profile?.score || 0}</Text>
            </View>
            <View style={[s.necklace, s.necklaceMiddle, { borderColor: tierColor }]}>
              <Text style={s.necklaceIcon}>{intentIcon}</Text>
            </View>
            <View style={[s.necklace, s.necklaceRight, { borderColor: tierColor }]}>
              <Text style={s.necklaceIcon}>{tierEmoji}</Text>
            </View>
          </View>

          <Text style={s.name}>{profile?.name || 'Your Name'}</Text>
          <Text style={s.age}>{profile?.age ? `${profile.age} years old` : ''}</Text>
        </View>

        {/* Bio */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardLabel}>Bio</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={s.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          {editing ? (
            <View>
              <TextInput
                style={s.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Write something about yourself..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                multiline
                maxLength={150}
              />
              <Text style={s.charCount}>{bio.length}/150</Text>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity:0.6 }]}
                onPress={saveBio}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={s.bioText}>{profile?.bio || 'No bio yet — tap Edit to add one!'}</Text>
          )}
        </View>

        {/* Edit Photos */}
        <TouchableOpacity style={s.editRow} onPress={() => setPhotoModal(true)}>
          <View style={s.editRowLeft}>
            <View style={s.editRowIcon}>
              <Ionicons name="images-outline" size={16} color="#ff4d82" />
            </View>
            <Text style={s.editRowTxt}>Edit Photos</Text>
            <Text style={s.editRowCount}>{validPhotos.length}/8</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
        </TouchableOpacity>

        {/* Edit Interests */}
        <TouchableOpacity style={s.editRow} onPress={() => openInterestEdit(0)}>
          <View style={s.editRowLeft}>
            <View style={s.editRowIcon}>
              <Ionicons name="star-outline" size={16} color="#ff4d82" />
            </View>
            <Text style={s.editRowTxt}>Edit Interests</Text>
            <Text style={s.editRowCount}>{interests.length}/5</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
        </TouchableOpacity>

        {/* Get to Know Me */}
        <TouchableOpacity style={s.editRow} onPress={() => setKnowMeModal(true)}>
          <View style={s.editRowLeft}>
            <View style={s.editRowIcon}>
              <Ionicons name="person-circle-outline" size={16} color="#ff4d82" />
            </View>
            <Text style={s.editRowTxt}>Get to Know Me</Text>
            <Text style={s.editRowCount}>{knowMeCount} filled</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
        </TouchableOpacity>

        {/* Preview filled Know Me */}
        {knowMeCount > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>About Me</Text>
            <View style={s.knowMePreview}>
              {KNOW_ME_FIELDS.filter(f => knowMe[f.key]).slice(0, 6).map(f => (
                <View key={f.key} style={s.knowMeTag}>
                  <Text style={s.knowMeTagEmoji}>{f.emoji}</Text>
                  <Text style={s.knowMeTagTxt}>{knowMe[f.key]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {[{ n:0, l:'Matches' }, { n:0, l:'Likes' }, { n:0, l:'Messages' }].map(stat => (
            <View key={stat.l} style={s.statCard}>
              <Text style={[s.statNum, { color: tierColor }]}>{stat.n}</Text>
              <Text style={s.statLabel}>{stat.l}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Settings</Text>
          {[
            { label:'Rescan My Face',    icon:'scan-outline',          action: () => router.push('/facescan') },
            { label:'Notifications',     icon:'notifications-outline', action: () => {} },
            { label:'Privacy',           icon:'lock-closed-outline',   action: () => {} },
            { label:'Upgrade to Gold ⭐', icon:'star-outline',          action: () => {} },
          ].map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[s.settingsRow, idx === 3 && { borderBottomWidth:0 }]}
              onPress={item.action}
            >
              <View style={s.settingsLeft}>
                <Ionicons name={item.icon as any} size={16} color="rgba(255,255,255,0.35)" />
                <Text style={s.settingsLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutTxt}>Log Out</Text>
        </TouchableOpacity>
        <Text style={s.version}>Allure v1.0.0</Text>

      </ScrollView>

      {/* Photo Manager Modal */}
      <Modal visible={photoModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>My Photos</Text>
              <TouchableOpacity onPress={() => setPhotoModal(false)}>
                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>Tap to add · Long press to remove · Up to 8 photos</Text>
            <View style={s.photoGrid}>
              {[0,1,2,3,4,5,6,7].map(i => (
                <TouchableOpacity
                  key={i}
                  style={s.photoSlot}
                  onPress={() => Alert.alert('Add Photo', '', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: '🤳 Take Selfie', onPress: () => takeSelfie(i) },
                    { text: '🖼️ Choose from Library', onPress: () => uploadPhoto(i) },
                  ])}
                  onLongPress={() => photos[i] && Alert.alert('Remove?', '', [
                    { text:'Cancel', style:'cancel' },
                    { text:'Remove', style:'destructive', onPress:() => removePhoto(i) }
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
          </View>
        </View>
      </Modal>

      {/* Interest Modal */}
      <Modal visible={interestModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>My Interests</Text>
              <TouchableOpacity onPress={() => setInterestModal(false)}>
                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>Up to 5 interests shown on your profile</Text>
            <View style={s.currentInterests}>
              {[0,1,2,3,4].map(i => (
                <TouchableOpacity
                  key={i}
                  style={[s.interestSlot, interests[i] && { borderColor:'rgba(255,77,130,0.4)', backgroundColor:'rgba(255,77,130,0.08)' }]}
                  onPress={() => openInterestEdit(i)}
                >
                  {interests[i] ? (
                    <Text style={s.interestSlotTxt}>{interests[i].emoji} {interests[i].label}</Text>
                  ) : (
                    <Text style={s.interestSlotEmpty}>+ Add</Text>
                  )}
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
          </View>
        </View>
      </Modal>

      {/* Get to Know Me Modal */}
      <Modal visible={knowMeModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Get to Know Me</Text>
              <TouchableOpacity onPress={() => setKnowMeModal(false)}>
                <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>Fill out what you're comfortable sharing</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '85%' }}>
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
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container:            { flex:1, backgroundColor:'#000' },
  scroll:               { flexGrow:1, padding:20, paddingTop:54, paddingBottom:100 },
  topBar:               { flexDirection:'row', alignItems:'center', gap:6, marginBottom:24 },
  logo:                 { fontSize:18, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4 },
  logoLine:             { flex:1, height:0.5, backgroundColor:'rgba(255,77,130,0.3)', marginTop:3 },
  avatarSection:        { alignItems:'center', marginBottom:24 },
  avatarWrap:           { position:'relative', width:100, height:100, marginBottom:32 },
  avatarRing:           { width:100, height:100, borderRadius:50, borderWidth:2, overflow:'hidden' },
  avatarImg:            { width:'100%', height:'100%' },
  avatarEmpty:          { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.04)' },
  plusBtn:              { position:'absolute', top:-8, left:-8, backgroundColor:'#ff4d82', borderRadius:14, width:28, height:28, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#000', zIndex:10 },
  necklace:             { position:'absolute', width:30, height:30, borderRadius:15, borderWidth:2, backgroundColor:'#000', alignItems:'center', justifyContent:'center', zIndex:10 },
  necklaceLeft:         { bottom:-14, left:-18 },
  necklaceMiddle:       { bottom:-22, left:'50%', marginLeft:-15 },
  necklaceRight:        { bottom:-14, right:-18 },
  necklaceScore:        { fontSize:9, fontWeight:'700' },
  necklaceIcon:         { fontSize:12 },
  name:                 { fontSize:26, fontWeight:'700', color:'#fff', letterSpacing:0.3, marginTop:4 },
  age:                  { fontSize:14, color:'rgba(255,255,255,0.35)', marginTop:2 },
  card:                 { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:16, padding:16, marginBottom:10, borderWidth:1, borderColor:'rgba(255,255,255,0.07)' },
  cardHeader:           { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  cardLabel:            { fontSize:11, fontWeight:'700', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 },
  editBtn:              { fontSize:13, color:'#ff4d82', fontWeight:'600' },
  bioInput:             { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', padding:12, fontSize:14, color:'#fff', minHeight:70, textAlignVertical:'top' },
  charCount:            { fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'right', marginTop:4 },
  saveBtn:              { backgroundColor:'#ff4d82', borderRadius:50, padding:12, alignItems:'center', marginTop:10 },
  saveBtnTxt:           { color:'#fff', fontSize:14, fontWeight:'700' },
  bioText:              { fontSize:14, color:'rgba(255,255,255,0.45)', lineHeight:20 },
  editRow:              { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:'rgba(255,77,130,0.1)' },
  editRowLeft:          { flexDirection:'row', alignItems:'center', gap:10 },
  editRowIcon:          { width:28, height:28, borderRadius:14, backgroundColor:'rgba(255,77,130,0.1)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,77,130,0.2)' },
  editRowTxt:           { fontSize:14, color:'rgba(255,255,255,0.7)', fontWeight:'500' },
  editRowCount:         { fontSize:12, color:'rgba(255,77,130,0.6)', marginLeft:4 },
  knowMePreview:        { flexDirection:'row', flexWrap:'wrap', gap:8 },
  knowMeTag:            { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(255,77,130,0.08)', borderRadius:20, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'rgba(255,77,130,0.15)' },
  knowMeTagEmoji:       { fontSize:13 },
  knowMeTagTxt:         { fontSize:12, color:'rgba(255,255,255,0.6)' },
  statsRow:             { flexDirection:'row', gap:8, marginBottom:10 },
  statCard:             { flex:1, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:12, alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  statNum:              { fontSize:20, fontWeight:'700' },
  statLabel:            { fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:2, textTransform:'uppercase', letterSpacing:0.5 },
  settingsRow:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:13, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.04)' },
  settingsLeft:         { flexDirection:'row', alignItems:'center', gap:10 },
  settingsLabel:        { fontSize:14, color:'rgba(255,255,255,0.55)' },
  logoutBtn:            { borderWidth:1, borderColor:'rgba(255,77,109,0.2)', borderRadius:50, padding:14, alignItems:'center', marginTop:8, marginBottom:10 },
  logoutTxt:            { color:'rgba(255,77,109,0.6)', fontSize:15, fontWeight:'600' },
  version:              { fontSize:11, color:'rgba(255,255,255,0.08)', textAlign:'center', marginBottom:10 },
  modalOverlay:         { flex:1, backgroundColor:'rgba(0,0,0,0.9)', justifyContent:'flex-end' },
  modalCard:            { backgroundColor:'#111', borderRadius:24, padding:22, maxHeight:'92%', borderWidth:1, borderColor:'rgba(255,255,255,0.07)' },
  modalHeader:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  modalTitle:           { fontSize:18, fontWeight:'700', color:'#fff' },
  modalSub:             { fontSize:12, color:'rgba(255,255,255,0.25)', marginBottom:16 },
  modalLabel:           { fontSize:11, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, marginTop:8 },
  photoGrid:            { flexDirection:'row', flexWrap:'wrap', gap:8 },
  photoSlot:            { width:'23%', aspectRatio:3/4, borderRadius:10, overflow:'hidden', backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.07)', position:'relative' },
  photoImg:             { width:'100%', height:'100%' },
  photoEmpty:           { flex:1, alignItems:'center', justifyContent:'center' },
  mainBadge:            { position:'absolute', bottom:4, left:4, backgroundColor:'#ff4d82', borderRadius:4, paddingHorizontal:4, paddingVertical:1 },
  mainBadgeTxt:         { fontSize:8, color:'#fff', fontWeight:'700' },
  uploadRow:            { flexDirection:'row', alignItems:'center', gap:8, marginTop:10 },
  uploadTxt:            { fontSize:13, color:'rgba(255,255,255,0.4)' },
  currentInterests:     { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:12 },
  interestSlot:         { paddingHorizontal:12, paddingVertical:7, borderRadius:50, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.04)' },
  interestSlotTxt:      { fontSize:13, color:'#ff4d82', fontWeight:'600' },
  interestSlotEmpty:    { fontSize:13, color:'rgba(255,255,255,0.2)' },
  categoryScroll:       { maxHeight:180, marginBottom:10 },
  categoryGrid:         { flexDirection:'row', flexWrap:'wrap', gap:8 },
  categoryPill:         { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:20, paddingHorizontal:12, paddingVertical:8, borderWidth:1, borderColor:'rgba(255,255,255,0.07)' },
  categoryPillSelected: { backgroundColor:'rgba(255,77,130,0.2)', borderColor:'#ff4d82' },
  categoryEmoji:        { fontSize:14 },
  categoryLabel:        { fontSize:12, color:'rgba(255,255,255,0.5)' },
  categoryLabelSelected:{ color:'#ff4d82', fontWeight:'700' },
  modalInput:           { backgroundColor:'rgba(255,255,255,0.06)', borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', padding:12, fontSize:14, color:'#fff', marginBottom:4 },
  knowMeField:          { marginBottom:16 },
  knowMeFieldLeft:      { flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  knowMeFieldEmoji:     { fontSize:16 },
  knowMeFieldLabel:     { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.6)' },
  knowMeInput:          { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', padding:11, fontSize:14, color:'#fff' },
  optionsScroll:        { marginBottom:4 },
  optionsRow:           { flexDirection:'row', gap:8, paddingBottom:4 },
  optionPill:           { paddingHorizontal:14, paddingVertical:7, borderRadius:50, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.04)' },
  optionPillSelected:   { borderColor:'#ff4d82', backgroundColor:'rgba(255,77,130,0.15)' },
  optionPillTxt:        { fontSize:13, color:'rgba(255,255,255,0.4)' },
  optionPillTxtSelected:{ color:'#ff4d82', fontWeight:'600' },
});
