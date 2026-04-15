import { supabase } from '@/app/lib/supabase';
import { clearLikesBadge } from '@/app/lib/badgeCounts';
import { getUserTier, UserTier } from '@/app/lib/subscription';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type SubTab = 'likedYou' | 'sent';

export default function LikesTabScreen() {
  const router                  = useRouter();
  const [subTab, setSubTab]     = useState<SubTab>('likedYou');
  const [likedYou, setLikedYou] = useState<any[]>([]);
  const [sent, setSent]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tier, setTier]         = useState<UserTier>('free');

  useEffect(() => { clearLikesBadge(); }, []);
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const userId = userData.user.id;

      const userTier = await getUserTier(userId);
      setTier(userTier);

      // Liked You
      const { data: likesReceived } = await supabase
        .from('likes').select('from_user').eq('to_user', userId);

      if (likesReceived && likesReceived.length > 0) {
        const ids = likesReceived.map(l => l.from_user);
        const { data: profiles } = await supabase
          .from('profiles').select('*').in('id', ids);
        setLikedYou(profiles || []);
      } else {
        setLikedYou([]);
      }

      // Sent
      const { data: likesSent } = await supabase
        .from('likes').select('to_user').eq('from_user', userId);

      if (likesSent && likesSent.length > 0) {
        const ids = likesSent.map(l => l.to_user);
        const { data: profiles } = await supabase
          .from('profiles').select('*').in('id', ids);
        setSent(profiles || []);
      } else {
        setSent([]);
      }
    } catch (err) {
      console.log('Error loading likes tab:', err);
    } finally {
      setLoading(false);
    }
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

  function ProfileCard({ profile, blurred }: { profile: any; blurred: boolean }) {
    const tierColor = getTierColor(profile.tier);
    return (
      <View style={s.card}>
        <View style={s.cardImg}>
          {profile.profile_picture ? (
            <Image
              source={{ uri: profile.profile_picture }}
              style={[s.cardPhoto, blurred && s.cardPhotoBlurred]}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.cardPhotoEmpty, blurred && s.cardPhotoBlurred]}>
              <Ionicons name="person" size={32} color="rgba(255,255,255,0.2)" />
            </View>
          )}
          {blurred && (
            <View style={s.lockOverlay}>
              <Ionicons name="lock-closed" size={18} color="#ff4d82" />
              <Text style={s.lockTxt}>Allure+</Text>
            </View>
          )}
          {!blurred && <View style={[s.tierDot, { backgroundColor: tierColor }]} />}
        </View>
        {!blurred && <Text style={s.cardName} numberOfLines={1}>{profile.name}</Text>}
        {!blurred && (
          <Text style={[s.cardTier, { color: tierColor }]}>
            {getTierEmoji(profile.tier)} {profile.tier}
          </Text>
        )}
      </View>
    );
  }

  const currentData = subTab === 'likedYou' ? likedYou : sent;

  if (loading) return (
    <View style={s.container}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
      <ActivityIndicator color="#ff4d82" size="large" style={{ flex: 1 }} />
    </View>
  );

  return (
    <View style={s.container}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>Allure</Text>
        <View style={s.logoLine} />
      </View>

      {/* Sub-tabs */}
      <View style={s.subTabRow}>
        <TouchableOpacity
          style={[s.subTab, subTab === 'likedYou' && s.subTabActive]}
          onPress={() => setSubTab('likedYou')}
        >
          <Text style={[s.subTabTxt, subTab === 'likedYou' && s.subTabTxtActive]}>Liked You</Text>
          {likedYou.length > 0 && (
            <View style={s.badge}><Text style={s.badgeTxt}>{likedYou.length}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.subTab, subTab === 'sent' && s.subTabActive]}
          onPress={() => setSubTab('sent')}
        >
          <Text style={[s.subTabTxt, subTab === 'sent' && s.subTabTxtActive]}>Sent</Text>
          {sent.length > 0 && (
            <View style={s.badge}><Text style={s.badgeTxt}>{sent.length}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Upgrade banner — only shown to free users on the Liked You tab */}
      {subTab === 'likedYou' && tier === 'free' && likedYou.length > 0 && (
        <View style={s.upgradeBanner}>
          <Ionicons name="lock-closed" size={14} color="#ff4d82" />
          <Text style={s.upgradeTxt}>Upgrade to Allure+ to see who likes you</Text>
          <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/subscription')}>
            <Text style={s.upgradeBtnTxt}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {currentData.length === 0 ? (
        <View style={s.empty}>
          <Ionicons
            name={subTab === 'likedYou' ? 'star-outline' : 'arrow-up-circle-outline'}
            size={54}
            color="rgba(255,255,255,0.08)"
          />
          <Text style={s.emptyTxt}>
            {subTab === 'likedYou'
              ? `Nobody here yet!\nMake sure your profile looks great ✨`
              : `You haven't liked anyone yet`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProfileCard profile={item} blurred={subTab === 'likedYou' && tier === 'free'} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex:1, backgroundColor:'#000' },
  header:         { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:20, paddingTop:54, paddingBottom:4 },
  logo:           { fontSize:18, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4 },
  logoLine:       { flex:1, height:0.5, backgroundColor:'rgba(255,77,130,0.3)', marginTop:3 },
  title:          { fontSize:22, fontWeight:'700', color:'#fff', paddingHorizontal:20, marginTop:10, marginBottom:14 },

  // Sub-tabs
  subTabRow:      { flexDirection:'row', marginHorizontal:20, marginBottom:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.08)' },
  subTab:         { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:12 },
  subTabActive:   { borderBottomWidth:2, borderBottomColor:'#ff4d82' },
  subTabTxt:      { fontSize:14, fontWeight:'600', color:'rgba(255,255,255,0.38)' },
  subTabTxtActive:{ color:'#ff4d82' },

  // Badge
  badge:          { backgroundColor:'#ff4d82', borderRadius:10, paddingHorizontal:5, paddingVertical:2 },
  badgeTxt:       { fontSize:10, color:'#fff', fontWeight:'700' },

  // Upgrade banner
  upgradeBanner:  { flexDirection:'row', alignItems:'center', gap:8, marginHorizontal:20, marginBottom:12, backgroundColor:'rgba(255,77,130,0.06)', borderRadius:12, padding:12, borderWidth:1, borderColor:'rgba(255,77,130,0.15)' },
  upgradeTxt:     { flex:1, fontSize:12, color:'rgba(255,255,255,0.58)' },
  upgradeBtn:     { backgroundColor:'#ff4d82', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  upgradeBtnTxt:  { fontSize:12, color:'#fff', fontWeight:'700' },

  // Empty
  empty:          { flex:1, alignItems:'center', justifyContent:'center', gap:16, paddingHorizontal:40 },
  emptyTxt:       { fontSize:15, color:'rgba(255,255,255,0.42)', textAlign:'center', lineHeight:22 },

  // Grid
  grid:           { padding:12, paddingBottom:120 },
  card:           { flex:1, margin:4, alignItems:'center', gap:5 },
  cardImg:        { width:'100%', aspectRatio:3/4, borderRadius:12, overflow:'hidden', position:'relative', backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.11)' },
  cardPhoto:      { width:'100%', height:'100%' },
  cardPhotoEmpty: { width:'100%', height:'100%', alignItems:'center', justifyContent:'center' },
  cardPhotoBlurred:{ opacity:0.12 },
  lockOverlay:    { position:'absolute', inset:0, alignItems:'center', justifyContent:'center', gap:4 },
  lockTxt:        { fontSize:10, color:'#ff4d82', fontWeight:'700' },
  tierDot:        { position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4 },
  cardName:       { fontSize:11, color:'rgba(255,255,255,0.78)', textAlign:'center', width:'100%' },
  cardTier:       { fontSize:10, textAlign:'center' },
});
