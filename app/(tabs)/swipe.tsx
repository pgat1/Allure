import { supabase } from '@/app/lib/supabase';
import { sendMatchNotification, sendPushToUser } from '@/app/lib/notifications';
import { getUserTier, CRUSH_LIMIT, UserTier } from '@/app/lib/subscription';
import { useToast } from '@/app/lib/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const CRUSH_KEY = 'crush_daily'; // AsyncStorage key prefix

const { width, height } = Dimensions.get('window');

export default function SwipeScreen() {
  const router                            = useRouter();
  const { showToast, toastJSX }           = useToast();
  const [profiles, setProfiles]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [currentUser, setCurrentUser]     = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [lastAction, setLastAction]       = useState<string | null>(null);
  const [matchPopup, setMatchPopup]       = useState<any>(null);
  const [revealModal, setRevealModal]     = useState<any>(null);
  const [tier, setTier]                   = useState<UserTier>('free');
  const [crushModal, setCrushModal]       = useState(false);
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

  // Mutable ref so panResponder always calls the latest closure
  const swipeAction = useRef<(dir: 'left' | 'right') => Promise<void>>(async () => {});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) + 4 && Math.abs(dx) > 8,
      onPanResponderMove: Animated.event(
        [null, { dx: swipeAnim.x, dy: swipeAnim.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, { dx, dy }) => {
        if (dx > 100) {
          Animated.timing(swipeAnim, {
            toValue: { x: width + 100, y: dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            swipeAnim.setValue({ x: 0, y: 0 });
            swipeAction.current('right');
          });
        } else if (dx < -100) {
          Animated.timing(swipeAnim, {
            toValue: { x: -width - 100, y: dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            swipeAnim.setValue({ x: 0, y: 0 });
            swipeAction.current('left');
          });
        } else {
          Animated.spring(swipeAnim, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
            tension: 40,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setCurrentUser(userData.user);

      const userTier = await getUserTier(userData.user.id);
      setTier(userTier);

      // Update last_active so other users can see we're online
      await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userData.user.id);

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('name, subscription_tier, boost_expires_at')
        .eq('id', userData.user.id)
        .single();

      setCurrentUserName(myProfile?.name?.split(' ')[0] || '');

      // Boost activation: plusplus users get a 24h boost on every app open
      if (myProfile?.subscription_tier === 'plusplus') {
        const expiry = myProfile.boost_expires_at;
        const isExpired = !expiry || new Date(expiry).getTime() <= Date.now();
        if (isExpired) {
          await supabase
            .from('profiles')
            .update({
              boosted: true,
              boost_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', userData.user.id);
        }
      }

      const { data: likedUsers }   = await supabase.from('likes').select('to_user').eq('from_user', userData.user.id);
      const { data: blockedUsers } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userData.user.id);

      const excludeIds = [
        ...(likedUsers?.map(l => l.to_user) || []),
        ...(blockedUsers?.map(b => b.blocked_id) || []),
        userData.user.id,
      ];

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .order('boosted', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40);

      const filtered = (profileData || []).filter(p => !excludeIds.includes(p.id));
      setProfiles(filtered);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Updated every render so panResponder always gets a fresh closure
  swipeAction.current = async (direction: 'left' | 'right') => {
    if (profiles.length === 0 || !currentUser) return;
    const current = profiles[0];
    setLastAction(direction === 'right' ? '❤️ Liked!' : '✕ Passed');
    setProfiles(prev => prev.slice(1));
    setTimeout(() => setLastAction(null), 1000);

    if (direction === 'right') {
      await supabase.from('likes').insert({ from_user: currentUser.id, to_user: current.id });
      const { data: theirLike } = await supabase
        .from('likes').select('*')
        .eq('from_user', current.id)
        .eq('to_user', currentUser.id)
        .single();
      if (theirLike) {
        await supabase.from('matches').insert({ user1_id: currentUser.id, user2_id: current.id });
        setMatchPopup(current);
        // Notify the current user (local confirmation)
        await sendMatchNotification(current.name?.split(' ')[0] || current.name);
        // Notify the other user only if they haven't been active in the last 5 minutes
        const { data: otherProfile } = await supabase
          .from('profiles').select('last_active').eq('id', current.id).single();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const otherLastActive = otherProfile?.last_active ? new Date(otherProfile.last_active) : null;
        const isOffline = !otherLastActive || otherLastActive < fiveMinutesAgo;
        if (isOffline) {
          const myFirstName = currentUserName || 'Someone';
          await sendPushToUser(current.id, `💞 It's a Match! You and ${myFirstName} matched on Allure!`, '');
        }
      }
    }
  };

  async function handleSwipe(direction: 'left' | 'right') {
    if (profiles.length === 0) return;
    const x = direction === 'right' ? width + 100 : -width - 100;
    Animated.timing(swipeAnim, {
      toValue: { x, y: 0 },
      duration: 350,
      useNativeDriver: false,
    }).start(() => {
      swipeAnim.setValue({ x: 0, y: 0 });
      swipeAction.current(direction);
    });
  }

  async function handleCrush() {
    if (profiles.length === 0 || !currentUser) return;

    const limit = CRUSH_LIMIT[tier];

    // Free users — no crushes
    if (limit === 0) {
      setCrushModal(true);
      return;
    }

    // Plus users — 3/day via AsyncStorage with daily reset
    if (limit !== Infinity) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const stored = await AsyncStorage.getItem(CRUSH_KEY);
      const parsed = stored ? JSON.parse(stored) : { date: today, count: 0 };
      const count  = parsed.date === today ? parsed.count : 0;

      if (count >= limit) {
        showToast(`You've used all ${limit} crushes today — resets tomorrow`);
        return;
      }

      await AsyncStorage.setItem(CRUSH_KEY, JSON.stringify({ date: today, count: count + 1 }));
    }

    // Send crush
    const current = profiles[0];
    await supabase.from('likes').insert({ from_user: currentUser.id, to_user: current.id, comment: 'crush' });
    const senderName = currentUserName || 'Someone';
    await sendPushToUser(current.id, `${senderName} has a crush on you 💗`, '');
    setProfiles(prev => prev.slice(1));
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
      <Text style={s.matchName}>You and {matchPopup.name?.split(' ')[0]} liked each other!</Text>
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
      <Animated.View
        style={[s.photoCard, {
          transform: [
            { translateX: swipeAnim.x },
            { translateY: swipeAnim.y },
            { rotate: rotateAnim },
          ],
        }]}
        {...panResponder.panHandlers}
      >
        {/* LIKE / NOPE stamps */}
        <Animated.View style={[s.likeStamp, { opacity: likeOpacity }]}>
          <Text style={s.likeStampTxt}>❤</Text>
        </Animated.View>
        <Animated.View style={[s.nopeStamp, { opacity: nopeOpacity }]}>
          <Text style={s.nopeStampTxt}>✕</Text>
        </Animated.View>

        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>

          {/* ── All photos stacked, each full-screen height ── */}
          {photos.length > 0 ? photos.map((url: string, i: number) => (
            <Image key={i} source={{ uri: url }} style={s.stackedPhoto} resizeMode="cover" />
          )) : (
            <View style={s.mainPhotoEmpty}>
              <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="person" size={90} color="rgba(255,255,255,0.08)" />
            </View>
          )}

          {/* ── Bio ── */}
          {current.bio ? (
            <>
              <View style={s.separator} />
              <LinearGradient colors={['rgba(26,8,24,0.95)', 'rgba(13,0,8,1)']} style={s.infoBox}>
                <Text style={s.infoBoxLabel}>BIO</Text>
                <Text style={s.infoBoxText}>{current.bio}</Text>
                <View style={s.infoBoxDivider} />
              </LinearGradient>
            </>
          ) : null}

          {/* ── Interests ── */}
          {current.interests?.length > 0 ? (
            <>
              <View style={s.separator} />
              <LinearGradient colors={['rgba(26,8,24,0.95)', 'rgba(13,0,8,1)']} style={s.infoBox}>
                <Text style={s.infoBoxLabel}>INTERESTS</Text>
                <View style={s.infoBoxInterests}>
                  {current.interests.map((int: any, j: number) => (
                    <View key={j} style={s.infoBoxPill}>
                      <Text style={s.infoBoxPillTxt}>{int.emoji} {int.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.infoBoxDivider} />
              </LinearGradient>
            </>
          ) : null}

          {/* Spacer so last section isn't hidden behind buttons */}
          <View style={{ height: 200 }} />
        </ScrollView>
      </Animated.View>

      {/* Report flag — top-left of card */}
      <TouchableOpacity style={s.reportFlagBtn} onPress={handleReport}>
        <Ionicons name="flag" size={14} color="#FFD700" />
      </TouchableOpacity>

      {/* Top info — name, age, tier icon, bio/location */}
      <View style={s.topInfoWrap} pointerEvents="none">
        <View style={s.topInfoBackdrop}>
          <View style={s.topInfoRow}>
            <View style={s.topInfoTextCol}>
              <Text style={s.topInfoName} numberOfLines={1}>{current.name?.split(' ')[0]}, {current.age || '?'}</Text>
            </View>
            <View style={[s.topInfoTierCircle, { borderColor: tierColor }]}>
              <Text style={{ color: tierColor, fontSize: 14 }}>{getTierEmoji(current.tier)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* New score bar */}
      <View style={s.newScoreWrap} pointerEvents="none">
        <Text style={s.newScoreTxt}>{score}</Text>
        <View style={s.newScoreTrack}>
          <LinearGradient
            colors={['rgba(255,77,130,0.3)', '#ff4d82']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[s.newScoreFill, { width: `${score}%` as any }]}
          >
            <View style={s.newScoreDot} />
          </LinearGradient>
        </View>
      </View>

      {/* Action badge */}
      {lastAction && (
        <View style={s.actionBadge} pointerEvents="none">
          <Text style={s.actionBadgeTxt}>{lastAction}</Text>
        </View>
      )}

      {/* Floating action buttons */}
      <View style={s.floatingButtons}>
        <TouchableOpacity style={s.passBtn} onPress={() => handleSwipe('left')}>
          <Ionicons name="close" size={17} color="#ff4d6d" />
        </TouchableOpacity>

        <TouchableOpacity style={s.likeBtn} onPress={() => handleSwipe('right')}>
          <Ionicons name="heart" size={21} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={s.crushBtn} onPress={handleCrush}>
          <View style={s.crushIconWrap}>
            <View style={s.crushHeartLeft}>
              <Ionicons name="heart" size={10} color="#ff4d82" />
            </View>
            <Ionicons name="heart" size={14} color="#ff4d82" />
            <View style={s.crushHeartRight}>
              <Ionicons name="heart" size={10} color="#ff4d82" />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {toastJSX}

      {/* Crush upgrade modal */}
      <Modal visible={crushModal} transparent animationType="fade">
        <View style={s.crushModalOverlay}>
          <View style={s.crushModalBox}>
            <Text style={s.crushModalEmoji}>💗</Text>
            <Text style={s.crushModalTitle}>Send a Crush</Text>
            <Text style={s.crushModalBody}>
              Crushes let someone know you're really interested.{'\n'}Upgrade to Allure+ to send up to 3 per day.
            </Text>
            <TouchableOpacity
              style={s.crushModalBtn}
              onPress={() => { setCrushModal(false); router.push('/subscription'); }}
            >
              <Text style={s.crushModalBtnTxt}>Upgrade to Allure+</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCrushModal(false)} style={s.crushModalCancel}>
              <Text style={s.crushModalCancelTxt}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                  <Text style={s.revealName}>{revealModal?.name?.split(' ')[0]}, {revealModal?.age}</Text>
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

  // ── Top info overlay ──
  topInfoWrap:        { position:'absolute', top:70, left:54, right:14, zIndex:20 },
  topInfoBackdrop:    { backgroundColor:'rgba(0,0,0,0.35)', borderRadius:12, paddingVertical:8, paddingHorizontal:10 },
  topInfoRow:         { flexDirection:'row', alignItems:'center', gap:8 },
  topInfoTextCol:     { flex:1 },
  topInfoName:        { fontSize:18, fontWeight:'800', color:'#fff', letterSpacing:0.1, textShadowColor:'rgba(0,0,0,0.8)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:4 },
  topInfoSub:         { fontSize:10, color:'rgba(255,255,255,0.75)', marginTop:2 },
  topInfoTierCircle:  { width:30, height:30, borderRadius:15, borderWidth:1.5, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.3)' },

  // ── New score bar ──
  newScoreWrap:       { position:'absolute', top:114, left:14, right:14, zIndex:20 },
  newScoreTxt:        { fontSize:13, fontWeight:'800', color:'#ff4d82', textAlign:'right', marginBottom:4 },
  newScoreTrack:      { height:3, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:2 },
  newScoreFill:       { height:3, borderRadius:2 },
  newScoreDot:        { position:'absolute', right:-3.5, top:-2, width:7, height:7, borderRadius:3.5, backgroundColor:'#ff4d82', borderWidth:1.5, borderColor:'#fff', shadowColor:'#ff4d82', shadowRadius:4, shadowOpacity:1, shadowOffset:{ width:0, height:0 } },


  // ── Tap hint (bottom of main photo) ──
  tapHintOverlay:     { position:'absolute', bottom:16, left:0, right:0, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4 },
  tapHintTxt:         { fontSize:11, color:'rgba(255,255,255,0.55)' },

  // ── Scroll-down hint ──
  scrollHint:         { position:'absolute', bottom:100, right:16, width:28, height:28, borderRadius:14, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center' },

  // ── LIKE / NOPE stamps ──
  likeStamp:          { position:'absolute', top:170, left:24, borderWidth:3, borderColor:'#4dff91', borderRadius:8, padding:8, zIndex:20, transform:[{ rotate:'-15deg' }] },
  likeStampTxt:       { fontSize:28, fontWeight:'900', color:'#4dff91', letterSpacing:2 },
  nopeStamp:          { position:'absolute', top:170, right:24, borderWidth:3, borderColor:'#ff4d6d', borderRadius:8, padding:8, zIndex:20, transform:[{ rotate:'15deg' }] },
  nopeStampTxt:       { fontSize:28, fontWeight:'900', color:'#ff4d6d', letterSpacing:2 },

  // ── Extra photos (scrolled) ──
  stackedPhoto:       { width, height },
  extraPhoto:         { width, height: width * 1.25, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)' },

  // ── Action badge ──
  actionBadge:        { position:'absolute', top:170, left:0, right:0, alignItems:'center', zIndex:30 },
  actionBadgeTxt:     { fontSize:16, fontWeight:'700', color:'#ff4d82', backgroundColor:'rgba(0,0,0,0.65)', paddingHorizontal:18, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:'rgba(255,77,130,0.3)', overflow:'hidden' },

  // ── Report flag button ──
  reportFlagBtn:      { position:'absolute', top:54, left:16, zIndex:20, width:28, height:28, borderRadius:14, backgroundColor:'rgba(0,0,0,0.4)', alignItems:'center', justifyContent:'center' },

  // ── Floating buttons ──
  floatingButtons:    { position:'absolute', bottom:110, left:0, right:0, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:20, zIndex:10 },
  passBtn:            { width:36, height:36, borderRadius:18, backgroundColor:'transparent', borderWidth:1, borderColor:'rgba(255,77,109,0.4)', alignItems:'center', justifyContent:'center' },
  likeBtn:            { width:48, height:48, borderRadius:24, backgroundColor:'#ff4d82', alignItems:'center', justifyContent:'center' },
  crushBtn:           { width:36, height:36, borderRadius:18, backgroundColor:'transparent', borderWidth:1, borderColor:'rgba(255,77,130,0.4)', alignItems:'center', justifyContent:'center' },
  crushIconWrap:      { width:36, height:36, alignItems:'center', justifyContent:'center' },
  crushHeartLeft:     { position:'absolute', left:4, top:13, transform:[{ rotate:'-28deg' }] },
  crushHeartRight:    { position:'absolute', right:4, top:13, transform:[{ rotate:'28deg' }] },

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

  // Crush upgrade modal
  crushModalOverlay:  { flex:1, backgroundColor:'rgba(0,0,0,0.7)', alignItems:'center', justifyContent:'center', padding:32 },
  crushModalBox:      { width:'100%', backgroundColor:'#130008', borderRadius:20, padding:24, alignItems:'center', borderWidth:1, borderColor:'rgba(255,77,130,0.25)' },
  crushModalEmoji:    { fontSize:36, marginBottom:12 },
  crushModalTitle:    { fontSize:20, fontWeight:'700', color:'#fff', marginBottom:8 },
  crushModalBody:     { fontSize:14, color:'rgba(255,255,255,0.55)', textAlign:'center', lineHeight:20, marginBottom:24 },
  crushModalBtn:      { width:'100%', backgroundColor:'#ff4d82', borderRadius:14, paddingVertical:14, alignItems:'center', marginBottom:10 },
  crushModalBtnTxt:   { color:'#fff', fontSize:15, fontWeight:'700' },
  crushModalCancel:   { paddingVertical:8 },
  crushModalCancelTxt:{ color:'rgba(255,255,255,0.3)', fontSize:13 },
});
