import { supabase } from '@/app/lib/supabase';
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
  View
} from 'react-native';

export default function LikesScreen() {
  const [likes, setLikes]       = useState<any[]>([]);
  const [matches, setMatches]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mainTab, setMainTab]   = useState<'matches' | 'likes'>('matches');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: likesData } = await supabase
        .from('likes').select('from_user').eq('to_user', userData.user.id);

      if (likesData && likesData.length > 0) {
        const likerIds = likesData.map(l => l.from_user);
        const { data: likerProfiles } = await supabase
          .from('profiles').select('*').in('id', likerIds);
        setLikes(likerProfiles || []);
      }

      const { data: matchesData } = await supabase
        .from('matches').select('*')
        .or(`user1_id.eq.${userData.user.id},user2_id.eq.${userData.user.id}`);

      if (matchesData && matchesData.length > 0) {
        const matchIds = matchesData.map(m =>
          m.user1_id === userData.user.id ? m.user2_id : m.user1_id
        );
        const { data: matchProfiles } = await supabase
          .from('profiles').select('*').in('id', matchIds);
        setMatches(matchProfiles || []);
      }
    } catch (err) {
      console.log('Error loading likes:', err);
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

  const currentData = mainTab === 'matches' ? matches : likes;
  const filteredData = currentData;
  ;

  function ProfileCard({ profile, blurred }: { profile: any, blurred: boolean }) {
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
              <Text style={s.lockTxt}>Gold</Text>
            </View>
          )}
          <View style={[s.tierDot, { backgroundColor: tierColor }]} />
        </View>
        {!blurred && (
          <Text style={s.cardName} numberOfLines={1}>{profile.name}</Text>
        )}
        {!blurred && (
          <Text style={[s.cardTier, { color: tierColor }]}>
            {getTierEmoji(profile.tier)} {profile.tier}
          </Text>
        )}
      </View>
    );
  }

  if (loading) return (
    <View style={s.container}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
      <ActivityIndicator color="#ff4d82" size="large" />
    </View>
  );

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#2a0018', '#150010', '#0a0005']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>Allure</Text>
        <View style={s.logoLine} />
      </View>

      {/* Main tabs: Matches / Likes */}
      <View style={s.mainTabRow}>
        <TouchableOpacity
          style={[s.mainTab, mainTab === 'matches' && s.mainTabActive]}
          onPress={() => setMainTab('matches')}
        >
          <Ionicons
            name="heart"
            size={14}
            color={mainTab === 'matches' ? '#ff4d82' : 'rgba(255,255,255,0.3)'}
          />
          <Text style={[s.mainTabTxt, mainTab === 'matches' && s.mainTabTxtActive]}>
            Matches
          </Text>
          {matches.length > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{matches.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.mainTab, mainTab === 'likes' && s.mainTabActive]}
          onPress={() => setMainTab('likes')}
        >
          <Ionicons
            name="star"
            size={14}
            color={mainTab === 'likes' ? '#ff4d82' : 'rgba(255,255,255,0.3)'}
          />
          <Text style={[s.mainTabTxt, mainTab === 'likes' && s.mainTabTxtActive]}>
            Liked You
          </Text>
          {likes.length > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{likes.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Upgrade banner for likes */}
      {mainTab === 'likes' && likes.length > 0 && (
        <View style={s.upgradeBanner}>
          <Ionicons name="lock-closed" size={14} color="#ff4d82" />
          <Text style={s.upgradeTxt}>Upgrade to Gold to see who liked you!</Text>
          <TouchableOpacity style={s.upgradeBtn}>
            <Text style={s.upgradeBtnTxt}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {filteredData.length === 0 ? (
        <View style={s.empty}>
          <Ionicons
            name={mainTab === 'matches' ? 'heart-outline' : 'star-outline'}
            size={50}
            color="rgba(255,255,255,0.08)"
          />
          <Text style={s.emptyTxt}>
            {mainTab === 'matches'
              ? `No matches yet!\nKeep swiping 🔥`
              : `Nobody here yet!\nMake sure your profile looks great ✨`
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProfileCard
              profile={item}
              blurred={mainTab === 'likes'}
            />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex:1, backgroundColor:'#000' },
  header:           { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:20, paddingTop:54, paddingBottom:12 },
  logo:             { fontSize:18, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4 },
  logoLine:         { flex:1, height:0.5, backgroundColor:'rgba(255,77,130,0.3)', marginTop:3 },
  mainTabRow:       { flexDirection:'row', marginHorizontal:20, marginBottom:10, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:12, padding:4, borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  mainTab:          { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:10, borderRadius:10 },
  mainTabActive:    { backgroundColor:'rgba(255,77,130,0.12)' },
  mainTabTxt:       { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.45)' },
  mainTabTxtActive: { color:'#ff4d82' },
  badge:            { backgroundColor:'#ff4d82', borderRadius:10, paddingHorizontal:6, paddingVertical:2 },
  badgeTxt:         { fontSize:10, color:'#fff', fontWeight:'700' },
  upgradeBanner:    { flexDirection:'row', alignItems:'center', gap:8, marginHorizontal:20, marginBottom:12, backgroundColor:'rgba(255,77,130,0.06)', borderRadius:12, padding:12, borderWidth:1, borderColor:'rgba(255,77,130,0.15)' },
  upgradeTxt:       { flex:1, fontSize:12, color:'rgba(255,255,255,0.58)' },
  upgradeBtn:       { backgroundColor:'#ff4d82', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  upgradeBtnTxt:    { fontSize:12, color:'#fff', fontWeight:'700' },
  empty:            { flex:1, alignItems:'center', justifyContent:'center', gap:16, paddingHorizontal:40 },
  emptyTxt:         { fontSize:15, color:'rgba(255,255,255,0.42)', textAlign:'center', lineHeight:22 },
  grid:             { padding:12, paddingBottom:100 },
  card:             { flex:1, margin:4, alignItems:'center', gap:5 },
  cardImg:          { width:'100%', aspectRatio:3/4, borderRadius:12, overflow:'hidden', position:'relative', backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.11)' },
  cardPhoto:        { width:'100%', height:'100%' },
  cardPhotoEmpty:   { width:'100%', height:'100%', alignItems:'center', justifyContent:'center' },
  cardPhotoBlurred: { opacity:0.12 },
  lockOverlay:      { position:'absolute', inset:0, alignItems:'center', justifyContent:'center', gap:4 },
  lockTxt:          { fontSize:10, color:'#ff4d82', fontWeight:'700' },
  tierDot:          { position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4 },
  cardName:         { fontSize:11, color:'rgba(255,255,255,0.78)', textAlign:'center', width:'100%' },
  cardTier:         { fontSize:10, textAlign:'center' },
});
