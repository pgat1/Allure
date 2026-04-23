import { supabase } from '@/app/lib/supabase';
import { clearLikesBadge } from '@/app/lib/badgeCounts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [subTab, setSubTab]     = useState<SubTab>('likedYou');
  const [likedYou, setLikedYou] = useState<any[]>([]);
  const [sent, setSent]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { clearLikesBadge(); }, []);
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const userId = userData.user.id;

      // Fetch matches to exclude already-matched users
      const { data: matchesData } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      const matchedIds = new Set(
        (matchesData || []).map(m => m.user1_id === userId ? m.user2_id : m.user1_id)
      );

      // Liked You
      const { data: likesReceived } = await supabase
        .from('likes').select('from_user').eq('to_user', userId);

      if (likesReceived && likesReceived.length > 0) {
        const ids = likesReceived.map(l => l.from_user).filter(id => !matchedIds.has(id));
        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles').select('*').in('id', ids);
          setLikedYou(profiles || []);
        } else {
          setLikedYou([]);
        }
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

  function ProfileCard({ profile }: { profile: any }) {
    const tierColor = getTierColor(profile.tier);
    return (
      <View style={s.card}>
        <View style={s.cardImg}>
          {profile.profile_picture ? (
            <Image source={{ uri: profile.profile_picture }} style={s.cardPhoto} resizeMode="cover" />
          ) : (
            <View style={s.cardPhotoEmpty}>
              <Ionicons name="person" size={32} color="rgba(255,255,255,0.2)" />
            </View>
          )}
          <View style={[s.tierDot, { backgroundColor: tierColor }]} />
        </View>
        <Text style={s.cardName} numberOfLines={1}>{profile.name?.split(' ')[0]}</Text>
        <Text style={[s.cardTier, { color: tierColor }]}>
          {getTierEmoji(profile.tier)} {profile.tier}
        </Text>
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
            <ProfileCard profile={item} />
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

  // Empty
  empty:          { flex:1, alignItems:'center', justifyContent:'center', gap:16, paddingHorizontal:40 },
  emptyTxt:       { fontSize:15, color:'rgba(255,255,255,0.42)', textAlign:'center', lineHeight:22 },

  // Grid
  grid:           { padding:12, paddingBottom:120 },
  card:           { flex:1, margin:4, alignItems:'center', gap:5 },
  cardImg:        { width:'100%', aspectRatio:3/4, borderRadius:12, overflow:'hidden', position:'relative', backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.11)' },
  cardPhoto:      { width:'100%', height:'100%' },
  cardPhotoEmpty: { width:'100%', height:'100%', alignItems:'center', justifyContent:'center' },
  tierDot:        { position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4 },
  cardName:       { fontSize:11, color:'rgba(255,255,255,0.78)', textAlign:'center', width:'100%' },
  cardTier:       { fontSize:10, textAlign:'center' },
});
