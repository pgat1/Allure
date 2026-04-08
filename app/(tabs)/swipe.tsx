import { supabase } from '@/app/lib/supabase';
import { sendMatchNotification } from '@/app/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SwipeScreen() {
  const [profiles, setProfiles]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lastAction, setLastAction]   = useState<string | null>(null);
  const [matchPopup, setMatchPopup]   = useState<any>(null);
const [revealModal, setRevealModal] = useState<any>(null);
  const swipeAnim = useRef(new Animated.ValueXY()).current;

  const rotateAnim = swipeAnim.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-6deg', '0deg', '6deg'],
  });
  const likeOpacity = swipeAnim.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
  });
  const nopeOpacity = swipeAnim.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
  });

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setCurrentUser(userData.user);

      const { data: likedUsers }   = await supabase.from('likes').select('to_user').eq('from_user', userData.user.id);
      const { data: blockedUsers } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userData.user.id);

      const excludeIds = [
        ...(likedUsers?.map(l => l.to_user) || []),
        ...(blockedUsers?.map(b => b.blocked_id) || []),
        userData.user.id,
      ];

      const { data: profileData } = await supabase.from('profiles').select('*').limit(20);
      const filtered = profileData?.filter(p => !excludeIds.includes(p.id)) || [];
      setProfiles(filtered);
    } catch (err) {
      console.log('Error:', err);
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
        await supabase.from('likes').insert({ from_user: currentUser.id, to_user: current.id });
        const { data: theirLike } = await supabase
          .from('likes').select('*')
          .eq('from_user', current.id)
          .eq('to_user', currentUser.id)
          .single();
        if (theirLike) {
          await supabase.from('matches').insert({ user1_id: currentUser.id, user2_id: current.id });
          setMatchPopup(current);
          await sendMatchNotification(current.name?.split(' ')[0] || current.name);
        }
      }
    });
  }

  async function handleReport() {
    if (profiles.length === 0) return;
    const current = profiles[0];
    Alert.alert('Report or Block', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', onPress: async () => {
        await supabase.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: current.id });
        setProfiles(prev => prev.slice(1));
        Alert.alert('Blocked');
      }},
      { text: 'Report', style: 'destructive', onPress: () =>
        Alert.alert('Reason', '', [
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
    await supabase.from('reports').insert({ reporter_id: currentUser.id, reported_id: reportedId, reason });
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
    <View style={s.containerCentered}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
      <ActivityIndicator color="#ff4d82" size="large" />
    </View>
  );

  if (matchPopup) return (
    <View style={s.containerCentered}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
      <Text style={s.matchTitle}>It's a Match! ✨</Text>
      {matchPopup.profile_picture
        ? <Image source={{ uri: matchPopup.profile_picture }} style={s.matchPhoto} resizeMode="cover" />
        : <View style={s.matchAvatarEmpty}><Ionicons name="person" size={50} color="rgba(255,255,255,0.3)" /></View>
      }
      <Text style={s.matchName}>You and {matchPopup.name} liked each other!</Text>
      <TouchableOpacity style={s.matchBtn} onPress={() => setMatchPopup(null)}>
        <Text style={s.matchBtnTxt}>Keep Swiping 🔥</Text>
      </TouchableOpacity>
    </View>
  );

  if (profiles.length === 0) return (
    <View style={s.containerCentered}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
      <Ionicons name="heart-outline" size={60} color="rgba(255,77,130,0.2)" />
      <Text style={s.empty}>No one here yet!</Text>
      <Text style={s.emptySub}>Check back later ✨</Text>
      <TouchableOpacity style={s.refreshBtn} onPress={loadProfiles}>
        <Text style={s.refreshBtnTxt}>🔄 Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const current   = profiles[0];
  const tierColor = getTierColor(current.tier);
  const photos    = (current.photo_urls || []).filter(Boolean);
  const score     = Math.min(Math.max(current.score || 0, 0), 100);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />

      {/* Swipeable card */}
      <Animated.View style={[s.photoCard, {
        transform: [
          { translateX: swipeAnim.x },
          { translateY: swipeAnim.y },
          { rotate: rotateAnim },
        ],
      }]}>
        {/* LIKE / NOPE stamps */}
        <Animated.View style={[s.likeStamp, { opacity: likeOpacity }]}>
          <Text style={s.likeStampTxt}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[s.nopeStamp, { opacity: nopeOpacity }]}>
          <Text style={s.nopeStampTxt}>NOPE</Text>
        </Animated.View>

        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>

          {/* ── First photo: full screen ── */}
          <View style={s.mainPhotoWrap}>
            {photos[0] ? (
              <Image source={{ uri: photos[0] }} style={s.mainPhoto} resizeMode="cover" />
            ) : (
              <View style={s.mainPhotoEmpty}>
                <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
                <Ionicons name="person" size={90} color="rgba(255,255,255,0.08)" />
              </View>
            )}

            {/* Score bar */}
            <View style={s.scoreBarWrap}>
              <View style={s.scoreBarTrack}>
                <View style={[s.scoreBarFill, { width: `${score}%` as any }]} />
                <Text style={s.scoreBarTxt}>{score} / 100</Text>
              </View>
            </View>


            {/* Bottom gradient + info */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.88)']}
              style={s.infoOverlay}
            >
              <TouchableOpacity activeOpacity={0.95} onPress={() => setRevealModal(current)} style={s.infoTouchable}>
                <Text style={s.overlayName}>{current.name}, {current.age || '?'}</Text>
                <View style={[s.tierPill, { borderColor:`${tierColor}70`, backgroundColor:`${tierColor}20` }]}>
                  <Text style={[s.tierPillTxt, { color: tierColor }]}>
                    {getTierEmoji(current.tier)} {current.tier}
                  </Text>
                </View>
                {current.interests?.length > 0 && (
                  <View style={s.interestRow}>
                    {current.interests.slice(0, 3).map((int: any, i: number) => (
                      <View key={i} style={s.interestPill}>
                        <Text style={s.interestPillTxt}>{int.emoji} {int.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={s.tapHint}>
                  <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.55)" />
                  <Text style={s.tapHintTxt}>Tap for full profile</Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>

            {/* Scroll-down arrow */}
            {photos.length > 1 && (
              <View style={s.scrollHint} pointerEvents="none">
                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
              </View>
            )}
          </View>

          {/* ── Separator after main photo ── */}
          <View style={s.separator} />

          {/* ── Bio box (between photo 0 and photo 1) ── */}
          {current.bio ? (
            <>
              <LinearGradient colors={['rgba(26,8,24,0.95)', 'rgba(13,0,8,1)']} style={s.infoBox}>
                <Text style={s.infoBoxLabel}>BIO</Text>
                <Text style={s.infoBoxText}>{current.bio}</Text>
                <View style={s.infoBoxDivider} />
              </LinearGradient>
              <View style={s.separator} />
            </>
          ) : null}

          {/* ── Additional photos with interest boxes between them ── */}
          {photos.slice(1).map((url: string, i: number) => (
            <View key={i}>
              {i > 0 && <View style={s.separator} />}
              <Image source={{ uri: url }} style={s.extraPhoto} resizeMode="cover" />
              {current.interests?.[i] && (
                <>
                  <View style={s.separator} />
                  <LinearGradient colors={['rgba(26,8,24,0.95)', 'rgba(13,0,8,1)']} style={s.infoBox}>
                    <Text style={s.infoBoxLabel}>INTERESTS</Text>
                    <View style={s.infoBoxInterests}>
                      {current.interests.slice(i, i + 3).map((int: any, j: number) => (
                        <View key={j} style={s.infoBoxPill}>
                          <Text style={s.infoBoxPillTxt}>{int.emoji} {int.label}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={s.infoBoxDivider} />
                  </LinearGradient>
                </>
              )}
            </View>
          ))}

          {/* Spacer so last photo isn't hidden behind buttons */}
          <View style={{ height: 130 }} />
        </ScrollView>
      </Animated.View>

      {/* Action badge */}
      {lastAction && (
        <View style={s.actionBadge} pointerEvents="none">
          <Text style={s.actionBadgeTxt}>{lastAction}</Text>
        </View>
      )}

      {/* Floating buttons */}
      <View style={s.floatingButtons}>
        <TouchableOpacity style={s.passBtn} onPress={() => handleSwipe('left')}>
          <Ionicons name="close" size={22} color="#ff4d82" />
        </TouchableOpacity>
        <TouchableOpacity style={s.likeBtn} onPress={() => handleSwipe('right')}>
          <Ionicons name="heart" size={22} color="#ff4d82" />
        </TouchableOpacity>
      </View>

      {/* Full Profile Reveal Modal */}
      <Modal visible={!!revealModal} transparent animationType="slide">
        <View style={s.revealOverlay}>
          <View style={s.revealCard}>
            <View style={s.revealHeader}>
              <TouchableOpacity onPress={() => setRevealModal(null)}>
                <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {revealModal?.photo_urls?.filter(Boolean).length > 0 ? (
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={s.photoScroll}>
                  {revealModal.photo_urls.filter(Boolean).map((url: string, i: number) => (
                    <Image key={i} source={{ uri: url }} style={s.revealPhoto} resizeMode="cover" />
                  ))}
                </ScrollView>
              ) : (
                <View style={s.revealPhotoEmpty}>
                  <Ionicons name="person" size={60} color="rgba(255,255,255,0.1)" />
                </View>
              )}
              <View style={s.revealBody}>
                <View style={s.revealNameRow}>
                  <Text style={s.revealName}>{revealModal?.name}, {revealModal?.age}</Text>
                  <View style={[s.revealTierPill, { borderColor:`${getTierColor(revealModal?.tier)}60`, backgroundColor:`${getTierColor(revealModal?.tier)}15` }]}>
                    <Text style={[s.revealTierTxt, { color: getTierColor(revealModal?.tier) }]}>
                      {getTierEmoji(revealModal?.tier)} {revealModal?.tier}
                    </Text>
                  </View>
                </View>
                <Text style={[s.revealScore, { color: getTierColor(revealModal?.tier) }]}>
                  Score: {revealModal?.score || '?'}
                </Text>
                {revealModal?.bio ? (
                  <View style={s.revealSection}>
                    <Text style={s.revealSectionLabel}>About</Text>
                    <Text style={s.revealBio}>{revealModal.bio}</Text>
                  </View>
                ) : null}
                {revealModal?.interests?.length > 0 && (
                  <View style={s.revealSection}>
                    <Text style={s.revealSectionLabel}>Interests</Text>
                    <View style={s.interestRow}>
                      {revealModal.interests.map((int: any, i: number) => (
                        <View key={i} style={s.interestPill}>
                          <Text style={s.interestPillTxt}>{int.emoji} {int.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {revealModal?.get_to_know_me && Object.keys(revealModal.get_to_know_me).length > 0 && (
                  <View style={s.revealSection}>
                    <Text style={s.revealSectionLabel}>Get to Know Me</Text>
                    <View style={s.knowMeGrid}>
                      {Object.entries(revealModal.get_to_know_me).filter(([_, v]) => v).map(([k, v]) => (
                        <View key={k} style={s.knowMeTag}>
                          <Text style={s.knowMeTagTxt}>{String(v)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={s.revealActions}>
              <TouchableOpacity style={s.revealPassBtn} onPress={() => { setRevealModal(null); handleSwipe('left'); }}>
                <Ionicons name="close" size={28} color="#ff4d6d" />
              </TouchableOpacity>
              <TouchableOpacity style={s.revealLikeBtn} onPress={() => { setRevealModal(null); handleSwipe('right'); }}>
                <Ionicons name="heart" size={28} color="#fff" />
                <Text style={s.revealLikeTxt}>Like {revealModal?.name?.split(' ')[0]}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Containers ──
  container:          { flex:1, backgroundColor:'#0a0005' },
  containerCentered:  { flex:1, backgroundColor:'#0a0005', alignItems:'center', justifyContent:'center' },

  // ── Empty / Loading / Match states ──
  empty:              { fontSize:22, fontWeight:'700', color:'#fff', marginTop:16, textAlign:'center' },
  emptySub:           { fontSize:14, color:'rgba(255,255,255,0.35)', marginTop:8, textAlign:'center' },
  refreshBtn:         { marginTop:20, backgroundColor:'#ff4d82', paddingVertical:12, paddingHorizontal:32, borderRadius:50 },
  refreshBtnTxt:      { color:'#fff', fontSize:15, fontWeight:'700' },
  matchTitle:         { fontSize:36, fontWeight:'700', color:'#fff', marginBottom:20 },
  matchPhoto:         { width:200, height:200, borderRadius:100, marginBottom:16 },
  matchAvatarEmpty:   { width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,255,255,0.05)', alignItems:'center', justifyContent:'center', marginBottom:16 },
  matchName:          { fontSize:16, color:'rgba(255,255,255,0.6)', marginBottom:32, textAlign:'center' },
  matchBtn:           { backgroundColor:'#ff4d82', paddingVertical:14, paddingHorizontal:40, borderRadius:50 },
  matchBtnTxt:        { color:'#fff', fontSize:16, fontWeight:'700' },

  // ── Swipeable card ──
  photoCard:          { flex:1 },

  // ── Main photo (first, full screen) ──
  mainPhotoWrap:      { width, height, position:'relative' },
  mainPhoto:          { position:'absolute', top:0, left:0, right:0, bottom:0 },
  mainPhotoEmpty:     { position:'absolute', top:0, left:0, right:0, bottom:0, alignItems:'center', justifyContent:'center' },

  // ── Score bar ──
  scoreBarWrap:       { position:'absolute', top:54, left:16, right:16, zIndex:10 },
  scoreBarTrack:      { height:38, borderRadius:19, borderWidth:1.5, borderColor:'rgba(255,255,255,0.22)', backgroundColor:'rgba(0,0,0,0.52)', overflow:'hidden', alignItems:'center', justifyContent:'center' },
  scoreBarFill:       { position:'absolute', left:0, top:0, bottom:0, backgroundColor:'#ff4d82', borderRadius:19, opacity:0.82 },
  scoreBarTxt:        { fontSize:13, fontWeight:'700', color:'#fff', letterSpacing:0.8, zIndex:1 },


  // ── Bottom info overlay ──
  infoOverlay:        { position:'absolute', bottom:0, left:0, right:0, paddingTop:100, paddingBottom:108 },
  infoTouchable:      { paddingHorizontal:20, gap:9 },
  overlayName:        { fontSize:30, fontWeight:'700', color:'#fff', letterSpacing:0.2 },
  tierPill:           { alignSelf:'flex-start', paddingHorizontal:14, paddingVertical:5, borderRadius:50, borderWidth:1 },
  tierPillTxt:        { fontSize:12, fontWeight:'700', letterSpacing:0.5 },
  interestRow:        { flexDirection:'row', gap:6, flexWrap:'wrap' },
  interestPill:       { backgroundColor:'rgba(255,77,130,0.18)', borderRadius:20, paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'rgba(255,77,130,0.35)' },
  interestPillTxt:    { fontSize:11, color:'rgba(255,77,130,0.95)' },
  tapHint:            { flexDirection:'row', alignItems:'center', gap:4 },
  tapHintTxt:         { fontSize:11, color:'rgba(255,255,255,0.55)' },

  // ── Scroll-down hint ──
  scrollHint:         { position:'absolute', bottom:100, right:16, width:28, height:28, borderRadius:14, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center' },

  // ── LIKE / NOPE stamps ──
  likeStamp:          { position:'absolute', top:170, left:24, borderWidth:3, borderColor:'#4dff91', borderRadius:8, padding:8, zIndex:20, transform:[{ rotate:'-15deg' }] },
  likeStampTxt:       { fontSize:28, fontWeight:'900', color:'#4dff91', letterSpacing:2 },
  nopeStamp:          { position:'absolute', top:170, right:24, borderWidth:3, borderColor:'#ff4d6d', borderRadius:8, padding:8, zIndex:20, transform:[{ rotate:'15deg' }] },
  nopeStampTxt:       { fontSize:28, fontWeight:'900', color:'#ff4d6d', letterSpacing:2 },

  // ── Extra photos (scrolled) ──
  extraPhoto:         { width, height: width * 1.25, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)' },

  // ── Action badge ──
  actionBadge:        { position:'absolute', top:170, left:0, right:0, alignItems:'center', zIndex:30 },
  actionBadgeTxt:     { fontSize:16, fontWeight:'700', color:'#ff4d82', backgroundColor:'rgba(0,0,0,0.65)', paddingHorizontal:18, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:'rgba(255,77,130,0.3)', overflow:'hidden' },

  // ── Floating buttons ──
  floatingButtons:    { position:'absolute', bottom:0, left:0, right:0, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:32, zIndex:10, paddingBottom:120 },
  passBtn:            { width:58, height:58, borderRadius:29, backgroundColor:'rgba(0,0,0,0.3)', borderWidth:1.5, borderColor:'#ff4d82', alignItems:'center', justifyContent:'center' },
  likeBtn:            { width:58, height:58, borderRadius:29, backgroundColor:'rgba(0,0,0,0.3)', borderWidth:1.5, borderColor:'#ff4d82', alignItems:'center', justifyContent:'center' },

  // ── Section separator ──
  separator:          { height:2, width:'100%', backgroundColor:'#ff4d82', opacity:0.6 },

  // ── Info boxes (between photos) ──
  infoBox:            { paddingVertical:24, paddingHorizontal:22, gap:12 },
  infoBoxLabel:       { fontSize:10, fontWeight:'800', color:'#ff4d82', textTransform:'uppercase', letterSpacing:2 },
  infoBoxText:        { fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:22, fontStyle:'italic' },
  infoBoxDivider:     { height:1, backgroundColor:'rgba(255,77,130,0.3)', marginTop:4 },
  infoBoxInterests:   { flexDirection:'row', gap:8, flexWrap:'wrap' },
  infoBoxPill:        { backgroundColor:'rgba(255,77,130,0.1)', borderRadius:20, paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:'rgba(255,77,130,0.3)' },
  infoBoxPillTxt:     { fontSize:12, color:'rgba(255,255,255,0.75)' },

  // ── Reveal modal ──
  revealOverlay:      { flex:1, backgroundColor:'rgba(0,0,0,0.95)', justifyContent:'flex-end' },
  revealCard:         { backgroundColor:'#1e0012', borderRadius:24, maxHeight:'92%', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  revealHeader:       { flexDirection:'row', justifyContent:'flex-end', padding:16, paddingBottom:0 },
  photoScroll:        { height:320 },
  revealPhoto:        { width, height:320 },
  revealPhotoEmpty:   { height:200, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.03)' },
  revealBody:         { padding:20, gap:12 },
  revealNameRow:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 },
  revealName:         { fontSize:26, fontWeight:'700', color:'#fff' },
  revealTierPill:     { paddingHorizontal:12, paddingVertical:5, borderRadius:50, borderWidth:1 },
  revealTierTxt:      { fontSize:12, fontWeight:'700' },
  revealScore:        { fontSize:14, fontWeight:'600' },
  revealSection:      { gap:8 },
  revealSectionLabel: { fontSize:11, fontWeight:'700', color:'rgba(255,255,255,0.48)', textTransform:'uppercase', letterSpacing:1.5 },
  revealBio:          { fontSize:15, color:'rgba(255,255,255,0.82)', lineHeight:22 },
  knowMeGrid:         { flexDirection:'row', flexWrap:'wrap', gap:8 },
  knowMeTag:          { backgroundColor:'rgba(255,77,130,0.12)', borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:'rgba(255,77,130,0.25)' },
  knowMeTagTxt:       { fontSize:12, color:'rgba(255,255,255,0.75)' },
  revealActions:      { flexDirection:'row', gap:12, padding:16, paddingBottom:34 },
  revealPassBtn:      { width:56, height:56, borderRadius:28, borderWidth:2, borderColor:'rgba(255,77,109,0.4)', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,77,109,0.1)' },
  revealLikeBtn:      { flex:1, flexDirection:'row', gap:8, height:56, borderRadius:28, backgroundColor:'#ff4d82', alignItems:'center', justifyContent:'center' },
  revealLikeTxt:      { color:'#fff', fontSize:16, fontWeight:'700' },
});
