import { supabase } from '@/app/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image, Modal, ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SwipeScreen() {
  const [profiles, setProfiles]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentUser, setCurrentUser]   = useState<any>(null);
  const [myProfile, setMyProfile]       = useState<any>(null);
  const [lastAction, setLastAction]     = useState<string | null>(null);
  const [matchPopup, setMatchPopup]     = useState<any>(null);
  const [photoModal, setPhotoModal]     = useState<any>(null);
  const [intent, setIntent]             = useState<'dating' | 'hookup'>('dating');
  const swipeAnim = useRef(new Animated.ValueXY()).current;

  const rotateAnim = swipeAnim.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
  });
  const likeOpacity = swipeAnim.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
  });
  const nopeOpacity = swipeAnim.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
  });

  useEffect(() => {
    loadProfiles();
  }, [intent]);

  async function loadProfiles() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setCurrentUser(userData.user);

      const { data: me } = await supabase
        .from('profiles').select('*').eq('id', userData.user.id).single();
      setMyProfile(me);

      const { data: likedUsers } = await supabase
        .from('likes').select('to_user').eq('from_user', userData.user.id);
      const { data: blockedUsers } = await supabase
        .from('blocks').select('blocked_id').eq('blocker_id', userData.user.id);

      const likedIds   = likedUsers?.map(l => l.to_user) || [];
      const blockedIds = blockedUsers?.map(b => b.blocked_id) || [];
      const excludeIds = [...likedIds, ...blockedIds, userData.user.id];

      let query = supabase.from('profiles').select('*').limit(20);
    // DELETE this line:
     if (me?.tier) query = query.eq('tier', me.tier);
      query = query.eq('intent', intent);

      const { data: profileData } = await query;
      const filtered = profileData?.filter(p => !excludeIds.includes(p.id)) || [];
      setProfiles(filtered);
    } catch (err) {
      console.log('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwipe(direction: 'left' | 'right') {
    if (profiles.length === 0) return;
    const current = profiles[0];
    const x = direction === 'right' ? width + 100 : -width - 100;
    setLastAction(direction === 'right' ? '❤️ Liked!' : '✕ Passed');

    Animated.timing(swipeAnim, {
      toValue: { x, y: 0 },
      duration: 350,
      useNativeDriver: true,
    }).start(async () => {
      swipeAnim.setValue({ x: 0, y: 0 });
      setProfiles(prev => prev.slice(1));
      setTimeout(() => setLastAction(null), 1000);

      if (direction === 'right' && currentUser) {
        await supabase.from('likes').insert({
          from_user: currentUser.id,
          to_user: current.id,
        });

        const { data: theirLike } = await supabase
          .from('likes').select('*')
          .eq('from_user', current.id)
          .eq('to_user', currentUser.id)
          .single();

        if (theirLike) {
          await supabase.from('matches').insert({
            user1_id: currentUser.id,
            user2_id: current.id,
          });
          setMatchPopup(current);
        }
      }
    });
  }

  async function handleReport() {
    if (profiles.length === 0) return;
    const current = profiles[0];
    Alert.alert('Report or Block', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        onPress: async () => {
          await supabase.from('blocks').insert({
            blocker_id: currentUser.id,
            blocked_id: current.id,
          });
          setProfiles(prev => prev.slice(1));
          Alert.alert('Blocked', 'You will no longer see this person.');
        }
      },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => Alert.alert('Report Reason', '', [
          { text: 'Fake Profile',         onPress: () => submitReport(current.id, 'Fake Profile') },
          { text: 'Inappropriate Photos', onPress: () => submitReport(current.id, 'Inappropriate Photos') },
          { text: 'Harassment',           onPress: () => submitReport(current.id, 'Harassment') },
          { text: 'Underage',             onPress: () => submitReport(current.id, 'Underage') },
          { text: 'Cancel', style: 'cancel' },
        ])
      },
    ]);
  }

  async function submitReport(reportedId: string, reason: string) {
    await supabase.from('reports').insert({
      reporter_id: currentUser.id,
      reported_id: reportedId,
      reason,
    });
    setProfiles(prev => prev.slice(1));
    Alert.alert('Reported', 'Thank you for keeping Allure safe.');
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
      <LinearGradient colors={['#1a0010','#0d0008','#000']} style={StyleSheet.absoluteFillObject} />
      <ActivityIndicator color="#ff4d82" size="large" />
    </View>
  );

  if (matchPopup) return (
    <View style={s.container}>
      <LinearGradient colors={['#1a0010','#0d0008','#000']} style={StyleSheet.absoluteFillObject} />
      <Text style={s.matchTitle}>It's a Match! ✨</Text>
      {matchPopup.photo_urls?.[0] ? (
        <Image source={{ uri: matchPopup.photo_urls[0] }} style={s.matchPhoto} />
      ) : (
        <View style={s.matchAvatarEmpty}>
          <Ionicons name="person" size={50} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <Text style={s.matchName}>You and {matchPopup.name} liked each other!</Text>
      <TouchableOpacity style={s.matchBtn} onPress={() => setMatchPopup(null)}>
        <Text style={s.matchBtnTxt}>Keep Swiping 🔥</Text>
      </TouchableOpacity>
    </View>
  );

  if (profiles.length === 0) return (
    <View style={s.container}>
      <LinearGradient colors={['#1a0010','#0d0008','#000']} style={StyleSheet.absoluteFillObject} />

      {/* Intent Toggle */}
      <View style={s.intentToggle}>
        <TouchableOpacity
          style={[s.intentBtn, intent === 'dating' && s.intentBtnActive]}
          onPress={() => setIntent('dating')}
        >
          <Text style={[s.intentBtnTxt, intent === 'dating' && s.intentBtnTxtActive]}>
            💞 Dating
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.intentBtn, intent === 'hookup' && s.intentBtnActive]}
          onPress={() => setIntent('hookup')}
        >
          <Text style={[s.intentBtnTxt, intent === 'hookup' && s.intentBtnTxtActive]}>
            🔥 Hookups
          </Text>
        </TouchableOpacity>
      </View>

      <Ionicons name="heart-outline" size={60} color="rgba(255,77,130,0.2)" />
      <Text style={s.empty}>No one here yet!</Text>
      <Text style={s.emptySub}>Switch mode or check back later ✨</Text>
      <TouchableOpacity style={s.refreshBtn} onPress={loadProfiles}>
        <Text style={s.refreshBtnTxt}>🔄 Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const current = profiles[0];
  const next    = profiles[1];
  const tierColor = getTierColor(current.tier);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#1a0010', '#0d0008', '#000']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.glow} />

      {/* Intent Toggle */}
      <View style={s.intentToggle}>
        <TouchableOpacity
          style={[s.intentBtn, intent === 'dating' && s.intentBtnActive]}
          onPress={() => setIntent('dating')}
        >
          <Text style={[s.intentBtnTxt, intent === 'dating' && s.intentBtnTxtActive]}>
            💞 Dating
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.intentBtn, intent === 'hookup' && s.intentBtnActive]}
          onPress={() => setIntent('hookup')}
        >
          <Text style={[s.intentBtnTxt, intent === 'hookup' && s.intentBtnTxtActive]}>
            🔥 Hookups
          </Text>
        </TouchableOpacity>
      </View>

      {lastAction && (
        <View style={s.actionBadge}>
          <Text style={s.actionBadgeTxt}>{lastAction}</Text>
        </View>
      )}

      <View style={s.stack}>
        {/* Back card */}
        {next && (
          <View style={[s.card, s.cardBack]}>
            <View style={s.cardInner}>
              <View style={[s.scoreRing, { borderColor: getTierColor(next.tier) }]}>
                {next.photo_urls?.[0] ? (
                  <Image source={{ uri: next.photo_urls[0] }} style={s.ringPhoto} />
                ) : (
                  <Ionicons name="person" size={36} color="rgba(255,255,255,0.2)" />
                )}
              </View>
              <Text style={s.cardName}>{next.name}</Text>
            </View>
          </View>
        )}

        {/* Main card */}
        <Animated.View style={[s.card, {
          transform: [
            { translateX: swipeAnim.x },
            { translateY: swipeAnim.y },
            { rotate: rotateAnim },
          ]
        }]}>
          <Animated.View style={[s.likeStamp, { opacity: likeOpacity }]}>
            <Text style={s.likeStampTxt}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[s.nopeStamp, { opacity: nopeOpacity }]}>
            <Text style={s.nopeStampTxt}>NOPE</Text>
          </Animated.View>

          <View style={s.cardInner}>
            {/* Score Ring */}
            <View style={s.scoreRingWrap}>
              <View style={[s.scoreRing, { borderColor: tierColor }]}>
                {current.photo_urls?.[0] ? (
                  <Image source={{ uri: current.photo_urls[0] }} style={s.ringPhoto} />
                ) : (
                  <Ionicons name="person" size={44} color="rgba(255,255,255,0.2)" />
                )}
              </View>
              <View style={[s.scoreBadge, { backgroundColor: tierColor }]}>
                <Text style={s.scoreBadgeTxt}>{current.score || '?'}</Text>
              </View>
            </View>

            {/* Name & Tier */}
            <Text style={s.cardName}>{current.name}, {current.age || '?'}</Text>
            <View style={[s.tierPill, { borderColor:`${tierColor}60`, backgroundColor:`${tierColor}15` }]}>
              <Text style={[s.tierPillTxt, { color: tierColor }]}>
                {getTierEmoji(current.tier)} {current.tier}
              </Text>
            </View>

            {/* Intent badge */}
            <View style={[s.intentBadge, { backgroundColor: intent === 'dating' ? 'rgba(255,77,130,0.2)' : 'rgba(100,200,255,0.2)', borderColor: intent === 'dating' ? '#ff4d82' : '#64c8ff' }]}>
              <Text style={[s.intentBadgeTxt, { color: intent === 'dating' ? '#ff4d82' : '#64c8ff' }]}>
                {intent === 'dating' ? '💞 Dating' : '🔥 Hookup'}
              </Text>
            </View>

            {/* Interests */}
            {current.interests && current.interests.length > 0 && (
              <View style={s.interestRow}>
                {current.interests.slice(0,3).map((int: any, i: number) => (
                  <View key={i} style={s.interestPill}>
                    <Text style={s.interestPillTxt}>{int.emoji} {int.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Bio */}
            {current.bio ? (
              <Text style={s.cardBio} numberOfLines={2}>{current.bio}</Text>
            ) : null}

            {/* See photos button */}
            <TouchableOpacity
              style={s.photosBtn}
              onPress={() => setPhotoModal(current)}
            >
              <Ionicons name="images-outline" size={14} color="#ff4d82" />
              <Text style={s.photosBtnTxt}>See Photos</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={s.actions}>
        <TouchableOpacity style={s.reportBtn} onPress={handleReport}>
          <Ionicons name="flag-outline" size={18} color="#ffc800" />
        </TouchableOpacity>
        <TouchableOpacity style={s.passBtn} onPress={() => handleSwipe('left')}>
          <Ionicons name="close" size={28} color="#ff4d6d" />
        </TouchableOpacity>
        <TouchableOpacity style={s.likeBtn} onPress={() => handleSwipe('right')}>
          <Ionicons name="heart" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Photo Modal */}
      <Modal visible={!!photoModal} transparent animationType="slide">
        <View style={s.photoModalOverlay}>
          <View style={s.photoModalCard}>
            <View style={s.photoModalHeader}>
              <Text style={s.photoModalName}>{photoModal?.name}'s Photos</Text>
              <TouchableOpacity onPress={() => setPhotoModal(null)}>
                <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {photoModal?.photo_urls && photoModal.photo_urls.length > 0 ? (
                <View style={s.photoModalGrid}>
                  {photoModal.photo_urls.map((url: string, i: number) => (
                    url ? (
                      <Image key={i} source={{ uri: url }} style={s.photoModalImg} resizeMode="cover" />
                    ) : null
                  ))}
                </View>
              ) : (
                <View style={s.photoModalEmpty}>
                  <Ionicons name="images-outline" size={50} color="rgba(255,255,255,0.1)" />
                  <Text style={s.photoModalEmptyTxt}>No photos uploaded yet</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={s.likeFromModalBtn} onPress={() => {
              setPhotoModal(null);
              handleSwipe('right');
            }}>
              <Text style={s.likeFromModalTxt}>❤️  Like {photoModal?.name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex:1, backgroundColor:'#000', alignItems:'center', justifyContent:'center' },
  glow:               { position:'absolute', top:'20%', left:'50%', marginLeft:-100, width:200, height:200, borderRadius:100, backgroundColor:'rgba(255,77,130,0.08)' },
  intentToggle:       { flexDirection:'row', gap:8, marginBottom:12, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:50, padding:4, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  intentBtn:          { paddingHorizontal:20, paddingVertical:8, borderRadius:50 },
  intentBtnActive:    { backgroundColor:'#ff4d82' },
  intentBtnTxt:       { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.4)' },
  intentBtnTxtActive: { color:'#fff' },
  actionBadge:        { backgroundColor:'rgba(255,77,130,0.15)', borderRadius:20, paddingHorizontal:16, paddingVertical:6, marginBottom:8 },
  actionBadgeTxt:     { fontSize:14, color:'#ff4d82', fontWeight:'600' },
  empty:              { fontSize:22, fontWeight:'700', color:'#fff', marginTop:16, textAlign:'center' },
  emptySub:           { fontSize:14, color:'rgba(255,255,255,0.3)', marginTop:8, textAlign:'center' },
  refreshBtn:         { marginTop:20, backgroundColor:'#ff4d82', paddingVertical:12, paddingHorizontal:32, borderRadius:50 },
  refreshBtnTxt:      { color:'#fff', fontSize:15, fontWeight:'700' },
  matchTitle:         { fontSize:36, fontWeight:'700', color:'#fff', marginBottom:20 },
  matchPhoto:         { width:120, height:120, borderRadius:60, marginBottom:16 },
  matchAvatarEmpty:   { width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.05)', alignItems:'center', justifyContent:'center', marginBottom:16 },
  matchName:          { fontSize:16, color:'rgba(255,255,255,0.6)', marginBottom:32, textAlign:'center' },
  matchBtn:           { backgroundColor:'#ff4d82', paddingVertical:14, paddingHorizontal:40, borderRadius:50 },
  matchBtnTxt:        { color:'#fff', fontSize:16, fontWeight:'700' },
  stack:              { width:width - 40, height:height * 0.58, position:'relative', marginBottom:16 },
  card:               { position:'absolute', width:'100%', height:'100%', backgroundColor:'rgba(255,255,255,0.05)', borderRadius:24, borderWidth:1, borderColor:'rgba(255,77,130,0.2)', overflow:'hidden' },
  cardBack:           { transform:[{ scale:0.95 }], top:10, opacity:0.6 },
  cardInner:          { flex:1, alignItems:'center', justifyContent:'center', padding:24, gap:10 },
  scoreRingWrap:      { position:'relative', marginBottom:4 },
  scoreRing:          { width:110, height:110, borderRadius:55, borderWidth:3, overflow:'hidden', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.05)' },
  ringPhoto:          { width:'100%', height:'100%' },
  scoreBadge:         { position:'absolute', bottom:-4, right:-4, borderRadius:20, paddingHorizontal:8, paddingVertical:3, borderWidth:2, borderColor:'#000' },
  scoreBadgeTxt:      { fontSize:12, fontWeight:'700', color:'#000' },
  cardName:           { fontSize:22, fontWeight:'700', color:'#fff', letterSpacing:0.3 },
  tierPill:           { paddingHorizontal:14, paddingVertical:5, borderRadius:50, borderWidth:1 },
  tierPillTxt:        { fontSize:12, fontWeight:'700', letterSpacing:0.5 },
  intentBadge:        { paddingHorizontal:12, paddingVertical:4, borderRadius:50, borderWidth:1 },
  intentBadgeTxt:     { fontSize:11, fontWeight:'700' },
  interestRow:        { flexDirection:'row', gap:6, flexWrap:'wrap', justifyContent:'center' },
  interestPill:       { backgroundColor:'rgba(255,77,130,0.15)', borderRadius:20, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'rgba(255,77,130,0.25)' },
  interestPillTxt:    { fontSize:11, color:'rgba(255,77,130,0.9)' },
  cardBio:            { fontSize:13, color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:18 },
  photosBtn:          { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'rgba(255,77,130,0.1)', borderRadius:50, paddingHorizontal:16, paddingVertical:8, borderWidth:1, borderColor:'rgba(255,77,130,0.25)', marginTop:4 },
  photosBtnTxt:       { fontSize:13, color:'#ff4d82', fontWeight:'600' },
  likeStamp:          { position:'absolute', top:40, left:20, borderWidth:3, borderColor:'#4dff91', borderRadius:8, padding:8, zIndex:10, transform:[{ rotate:'-15deg' }] },
  likeStampTxt:       { fontSize:28, fontWeight:'900', color:'#4dff91', letterSpacing:2 },
  nopeStamp:          { position:'absolute', top:40, right:20, borderWidth:3, borderColor:'#ff4d6d', borderRadius:8, padding:8, zIndex:10, transform:[{ rotate:'15deg' }] },
  nopeStampTxt:       { fontSize:28, fontWeight:'900', color:'#ff4d6d', letterSpacing:2 },
  actions:            { flexDirection:'row', gap:16, alignItems:'center' },
  reportBtn:          { width:44, height:44, borderRadius:22, borderWidth:1, borderColor:'rgba(255,200,0,0.3)', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,200,0,0.08)' },
  passBtn:            { width:62, height:62, borderRadius:31, borderWidth:2, borderColor:'rgba(255,77,109,0.4)', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,77,109,0.1)' },
  likeBtn:            { width:72, height:72, borderRadius:36, backgroundColor:'#ff4d82', alignItems:'center', justifyContent:'center' },
  photoModalOverlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.9)', justifyContent:'flex-end' },
  photoModalCard:     { backgroundColor:'#111', borderRadius:24, padding:20, maxHeight:'85%', borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  photoModalHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  photoModalName:     { fontSize:18, fontWeight:'700', color:'#fff' },
  photoModalGrid:     { flexDirection:'row', flexWrap:'wrap', gap:8 },
  photoModalImg:      { width:(width - 80) / 2, height:(width - 80) / 2, borderRadius:12 },
  photoModalEmpty:    { alignItems:'center', justifyContent:'center', padding:40, gap:12 },
  photoModalEmptyTxt: { fontSize:14, color:'rgba(255,255,255,0.3)' },
  likeFromModalBtn:   { backgroundColor:'#ff4d82', borderRadius:50, padding:14, alignItems:'center', marginTop:16 },
  likeFromModalTxt:   { color:'#fff', fontSize:16, fontWeight:'700' },
});
