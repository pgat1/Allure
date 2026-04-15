import { supabase } from '@/app/lib/supabase';
import { getUserTier, RESCAN_LIMIT } from '@/app/lib/subscription';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';

const FACEPP_KEY    = 'Uhz0ifHjqLaD3c9_synQAaoydTDlPZYS';
const FACEPP_SECRET = 'khqEgZZEFnH8bjXtFhBW7PlGN0NnUuuz';
const FACEPP_URL    = 'https://api-us.faceplusplus.com/facepp/v3/detect';

function getTier(score: number) {
  if (score >= 90) return {
    name: 'Celestial', emoji: '♛', color: '#e8d5ff',
    bg: 'rgba(232,213,255,0.12)', border: 'rgba(232,213,255,0.3)',
    desc: "Top 10% — elite visibility and an exclusive match pool.",
    matches: '~380', visibility: 'Elite',
  };
  if (score >= 70) return {
    name: 'Luxe', emoji: '◈', color: '#ffe066',
    bg: 'rgba(255,224,102,0.12)', border: 'rgba(255,224,102,0.3)',
    desc: "Top 25% — refined, desirable, highly visible.",
    matches: '~240', visibility: 'High',
  };
  if (score >= 50) return {
    name: 'Radiant', emoji: '❋', color: '#aaddff',
    bg: 'rgba(170,221,255,0.12)', border: 'rgba(170,221,255,0.3)',
    desc: "Top 60% — glowing energy and a solid match pool.",
    matches: '~120', visibility: 'Good',
  };
  return {
    name: 'Bloom', emoji: '✦', color: '#ffaad0',
    bg: 'rgba(255,170,208,0.12)', border: 'rgba(255,170,208,0.3)',
    desc: "Everyone starts here. Great photos will boost your score!",
    matches: '~60', visibility: 'Standard',
  };
}

function validateFace(faceData: any): { valid: boolean; reason: string } {
  try {
    const attrs = faceData.attributes;

    // Check face quality
    const quality = attrs.facequality?.value || 0;
    if (quality < 40) {
      return { valid: false, reason: 'Photo quality too low. Try better lighting!' };
    }

    // Check head pose
    const headPose = attrs.headpose;
    if (headPose) {
      if (Math.abs(headPose.yaw_angle) > 25) {
        return { valid: false, reason: 'Look straight at the camera!' };
      }
      if (Math.abs(headPose.pitch_angle) > 20) {
        return { valid: false, reason: 'Keep your head level!' };
      }
      if (Math.abs(headPose.roll_angle) > 20) {
        return { valid: false, reason: 'Keep your head straight!' };
      }
    }

    // Check blur
    const blur = attrs.blur?.blurness?.value || 0;
    if (blur > 60) {
      return { valid: false, reason: 'Photo is too blurry. Hold still and try again!' };
    }

    return { valid: true, reason: '' };
  } catch {
    return { valid: true, reason: '' };
  }
}

function calculateScore(faceData: any): number {
  try {
    const attrs = faceData.attributes;
    const beautyMale = attrs.beauty?.male_score || 50;
    const beautyFem  = attrs.beauty?.female_score || 50;
    const beautyAvg  = (beautyMale + beautyFem) / 2;
    const quality    = attrs.facequality?.value || 50;
    const skin       = attrs.skinstatus;
    const skinScore  = skin
      ? Math.max(0, (skin.health || 50) - (skin.dark_circle || 0) * 0.3 - (skin.acne || 0) * 0.3)
      : 50;
    const raw = (beautyAvg * 0.7) + (skinScore * 0.2) + (quality * 0.1);
    return Math.round(Math.max(0, Math.min(100, raw)));
  } catch {
    return 50;
  }
}

export default function FaceScanScreen() {
  const router                          = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase]               = useState('intro');
  const [photoUri, setPhotoUri]         = useState<string | null>(null);
  const [score, setScore]               = useState<number | null>(null);
  const [tier, setTier]                 = useState<any>(null);
  const [step, setStep]                 = useState(0);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [countdown, setCountdown]       = useState<number | null>(null);
  const cameraRef                       = useRef<any>(null);
  const scanAnim                        = useRef(new Animated.Value(0)).current;

  const steps = [
    'Detecting your face...',
    'Checking face position...',
    'Analyzing attractiveness...',
    'Calculating your score...',
    'Assigning your tier...',
  ];

  function startAnim() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue:1, duration:1400, useNativeDriver:true }),
        Animated.timing(scanAnim, { toValue:0, duration:1400, useNativeDriver:true }),
      ])
    ).start();
  }

  function wait(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function startCamera() {
    if (!permission?.granted) await requestPermission();
    setPhase('camera');
    setErrorMsg(null);
  }

  async function startCountdown() {
    setCountdown(3); await wait(1000);
    setCountdown(2); await wait(1000);
    setCountdown(1); await wait(1000);
    setCountdown(null);
    await takePhoto();
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      setPhotoUri(photo.uri);
      await runScan(photo.base64);
    } catch (err) {
      setErrorMsg('Could not take photo. Please try again.');
      setPhase('camera');
    }
  }

  async function runScan(base64: string) {
    setPhase('scanning');
    setErrorMsg(null);
    startAnim();

    try {
      for (let i = 0; i < steps.length - 1; i++) {
        setStep(i);
        await wait(800);
      }

      const params = new URLSearchParams();
      params.append('api_key', FACEPP_KEY);
      params.append('api_secret', FACEPP_SECRET);
      params.append('image_base64', base64);
      params.append('return_attributes', 'beauty,skinstatus,facequality,headpose,blur');

      const response = await fetch(FACEPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();
      console.log('Face++ response:', JSON.stringify(data));

      if (data.error_message) {
        setErrorMsg('Face scan failed. Please try again.');
        setPhase('camera');
        return;
      }

      if (!data.faces || data.faces.length === 0) {
        setErrorMsg('No face detected. Make sure your full face is visible and well lit.');
        setPhase('camera');
        return;
      }

      // Strict validation
      const validation = validateFace(data.faces[0]);
      if (!validation.valid) {
        setErrorMsg(validation.reason);
        setPhase('camera');
        return;
      }

      const finalScore = calculateScore(data.faces[0]);
      setStep(4);
      await wait(600);

      const t = getTier(finalScore);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const userId   = userData.user.id;
        const userTier = await getUserTier(userId);
        const limit    = RESCAN_LIMIT[userTier];

        const { data: existing } = await supabase
          .from('profiles')
          .select('score, last_rescan, rescan_count_week')
          .eq('id', userId)
          .single();

        const hasScore = existing?.score && existing.score > 0;

        if (!hasScore) {
          // First scan — always allowed
          await supabase.from('profiles')
            .update({ score: finalScore, tier: t.name, last_rescan: new Date().toISOString(), rescan_count_week: 1 })
            .eq('id', userId);
          setScore(finalScore);
          setTier(t);
        } else if (limit === 0) {
          // Free users: score is locked
          setErrorMsg('Upgrade to Allure+ to rescan your face.');
          setScore(existing.score);
          setTier(getTier(existing.score));
          setPhase('result');
          return;
        } else {
          // Paid users: check weekly rescan count
          const now       = new Date();
          const lastRescan = existing?.last_rescan ? new Date(existing.last_rescan) : null;
          const msInWeek  = 7 * 24 * 60 * 60 * 1000;
          const sameWeek  = lastRescan && (now.getTime() - lastRescan.getTime()) < msInWeek;
          const weekCount = sameWeek ? (existing?.rescan_count_week || 0) : 0;

          if (weekCount >= limit) {
            const resetDate = lastRescan ? new Date(lastRescan.getTime() + msInWeek) : now;
            const dd = String(resetDate.getDate()).padStart(2,'0');
            const mm = String(resetDate.getMonth()+1).padStart(2,'0');
            setErrorMsg(`Rescan limit reached (${limit}/week). Resets ${dd}/${mm}.`);
            setScore(existing.score);
            setTier(getTier(existing.score));
            setPhase('result');
            return;
          }

          await supabase.from('profiles')
            .update({
              score: finalScore,
              tier: t.name,
              last_rescan: now.toISOString(),
              rescan_count_week: weekCount + 1,
            })
            .eq('id', userId);
          setScore(finalScore);
          setTier(t);
        }
      }

      setPhase('result');

    } catch (err: any) {
      console.log('Scan error:', err);
      setErrorMsg('Something went wrong. Please try again.');
      setPhase('camera');
    }
  }

  if (phase === 'intro') return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={s.scroll}>
      <Text style={s.logo}>Allure</Text>
      <Text style={s.title}>AI Face Scan</Text>
      <Text style={s.sub}>
        Our AI analyzes your actual attractiveness.
        Your full face must be visible and well lit.
        Score locks after your first scan.
      </Text>

      {errorMsg && (
        <View style={s.errBox}>
          <Text style={s.errTxt}>{errorMsg}</Text>
        </View>
      )}

      <View style={s.oval} />

      <View style={s.tips}>
        <Text style={s.tipsTitle}>Requirements:</Text>
        <Text style={s.tipsTxt}>Full face visible — no half profiles</Text>
        <Text style={s.tipsTxt}>Look straight at the camera</Text>
        <Text style={s.tipsTxt}>Bright even lighting</Text>
        <Text style={s.tipsTxt}>No sunglasses or hats</Text>
        <Text style={s.tipsTxt}>Hold still — no blur</Text>
        <Text style={s.tipsTxt}>Free: score locks after first scan</Text>
        <Text style={s.tipsTxt}>Allure+: 1 rescan/week · Allure++: 3/week</Text>
      </View>

      <View style={s.tierRow}>
        {[
          { e:'♛', n:'Celestial', c:'#e8d5ff', r:'90-100' },
          { e:'◈', n:'Luxe',      c:'#ffe066', r:'70-89'  },
          { e:'❋', n:'Radiant',   c:'#aaddff', r:'50-69'  },
          { e:'✦', n:'Bloom',     c:'#ffaad0', r:'0-49'   },
        ].map(t => (
          <View key={t.n} style={s.tierCard}>
            <Text style={{ fontSize:16 }}>{t.e}</Text>
            <Text style={[s.tierName, { color: t.c }]}>{t.n}</Text>
            <Text style={s.tierRange}>{t.r}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.btn} onPress={startCamera}>
        <Text style={s.btnTxt}>Open Camera</Text>
      </TouchableOpacity>

      <Text style={s.privacy}>🔒 Live scan only — never stored or shared</Text>
    </ScrollView>
    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
      <Ionicons name="chevron-back" size={24} color="#ff4d82" />
    </TouchableOpacity>
    </View>
  );

  if (phase === 'camera') {
    if (!permission?.granted) return (
      <View style={s.scroll}>
        <Text style={s.logo}>Allure</Text>
        <Text style={s.title}>Camera Permission</Text>
        <Text style={s.sub}>We need camera access for the face scan.</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnTxt}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={{ flex:1, backgroundColor:'#000' }}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="front"
          mirror
        />
        <View style={s.camOverlay}>
          <Text style={s.camLogo}>Allure</Text>

          {errorMsg && (
            <View style={s.camErrBox}>
              <Text style={s.camErrTxt}>{errorMsg}</Text>
            </View>
          )}

          {countdown !== null ? (
            <View style={s.countBox}>
              <Text style={s.countTxt}>{countdown}</Text>
            </View>
          ) : (
            <View style={s.faceFrame}>
              <Text style={s.frameHint}>Center your full face here</Text>
            </View>
          )}

          <View style={s.camBottom}>
            <Text style={s.camTip}>Full face · Good lighting · Look straight ahead</Text>
            <TouchableOpacity
              style={[s.snapBtn, countdown !== null && { opacity:0.5 }]}
              onPress={startCountdown}
              disabled={countdown !== null}
            >
              <View style={s.snapInner} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setPhase('intro'); setErrorMsg(null); }}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (phase === 'scanning') {
    const lineY = scanAnim.interpolate({ inputRange:[0,1], outputRange:[0,220] });
    return (
      <View style={s.scroll}>
        <Text style={s.logo}>Allure</Text>
        <Text style={s.title}>Analyzing...</Text>
        <View style={s.scanBox}>
          {photoUri && <Image source={{ uri: photoUri }} style={s.scanPhoto} />}
          <Animated.View style={[s.scanLine, { transform:[{ translateY: lineY }] }]} />
        </View>
        <View style={s.stepsBox}>
          {steps.map((st, i) => (
            <Text key={i} style={[s.stepTxt, i < step && s.stepDone, i === step && s.stepActive]}>
              {i < step ? '✅' : i === step ? '⏳' : '⬜'} {st}
            </Text>
          ))}
        </View>
        <ActivityIndicator color="#ff4d82" size="large" style={{ marginTop:20 }} />
        <Text style={s.scanNote}>Please wait — about 10 seconds</Text>
      </View>
    );
  }

  if (phase === 'result' && score !== null && tier !== null) return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Text style={s.logo}>Allure</Text>
      <Text style={s.resultLabel}>Your Score</Text>

      <View style={[s.ring, { borderColor: tier.color }]}>
        <Text style={[s.ringNum, { color: tier.color }]}>{score}</Text>
        <Text style={s.ringOf}>/ 100</Text>
      </View>

      <View style={[s.badge, { backgroundColor: tier.bg, borderColor: tier.border }]}>
        <Text style={[s.badgeTxt, { color: tier.color }]}>{tier.emoji}  {tier.name}</Text>
      </View>

      <Text style={s.tierDesc}>{tier.desc}</Text>

      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={[s.statN, { color: tier.color }]}>{tier.matches}</Text>
          <Text style={s.statL}>Daily Matches</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statN, { color: tier.color }]}>{tier.visibility}</Text>
          <Text style={s.statL}>Visibility</Text>
        </View>
      </View>

      {errorMsg ? (
        <View style={s.upgradeBox}>
          <Text style={s.upgradeBoxTxt}>{errorMsg}</Text>
          <TouchableOpacity style={s.upgradeBoxBtn} onPress={() => router.push('/subscription')}>
            <Text style={s.upgradeBoxBtnTxt}>Upgrade to Allure+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.lockedBox}>
          <Text style={s.lockedTxt}>
            🔒 Your score is permanently locked at {score}.
            This ensures fairness for everyone on Allure.
          </Text>
        </View>
      )}

      <TouchableOpacity style={s.btn} onPress={() => router.replace('/swipe')}>
        <Text style={s.btnTxt}>Start Matching ✨</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return null;
}

const s = StyleSheet.create({
  scroll:       { flexGrow:1, backgroundColor:'#000', alignItems:'center', justifyContent:'center', padding:24 },
  logo:         { fontSize:22, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4, marginBottom:4 },
  title:        { fontSize:24, fontWeight:'700', color:'#fff', marginBottom:8, textAlign:'center' },
  sub:          { fontSize:13, color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:20, marginBottom:20, maxWidth:300 },
  errBox:       { backgroundColor:'rgba(255,77,109,0.1)', borderWidth:1, borderColor:'rgba(255,77,109,0.3)', borderRadius:10, padding:12, marginBottom:14, width:'100%' },
  errTxt:       { color:'#ff4d6d', fontSize:13, textAlign:'center' },
  oval:         { width:160, height:200, borderRadius:80, borderWidth:2, borderColor:'rgba(255,77,130,0.35)', marginBottom:16, backgroundColor:'rgba(255,77,130,0.04)' },
  tips:         { width:'100%', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:14, padding:14, marginBottom:20, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  tipsTitle:    { fontSize:13, fontWeight:'700', color:'rgba(255,255,255,0.6)', marginBottom:8 },
  tipsTxt:      { fontSize:12, color:'rgba(255,255,255,0.4)', paddingVertical:2, lineHeight:18 },
  tierRow:      { flexDirection:'row', gap:6, marginBottom:24, width:'100%' },
  tierCard:     { flex:1, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:10, padding:8, alignItems:'center', gap:2, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  tierName:     { fontSize:10, fontWeight:'700' },
  tierRange:    { fontSize:9, color:'rgba(255,255,255,0.25)' },
  btn:          { backgroundColor:'#ff4d82', paddingVertical:15, borderRadius:50, width:'100%', alignItems:'center', marginBottom:10 },
  btnTxt:       { color:'#fff', fontSize:15, fontWeight:'700' },
  privacy:      { fontSize:11, color:'rgba(255,255,255,0.18)', textAlign:'center' },
  camOverlay:   { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'space-between', paddingTop:60, paddingBottom:40, paddingHorizontal:20 },
  camLogo:      { fontSize:22, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4 },
  camErrBox:    { backgroundColor:'rgba(255,77,109,0.85)', borderRadius:10, padding:10, width:'100%' },
  camErrTxt:    { color:'#fff', fontSize:13, textAlign:'center' },
  countBox:     { width:120, height:120, borderRadius:60, backgroundColor:'rgba(255,77,130,0.85)', alignItems:'center', justifyContent:'center' },
  countTxt:     { fontSize:60, fontWeight:'700', color:'#fff' },
  faceFrame:    { width:250, height:310, borderRadius:125, borderWidth:2, borderColor:'rgba(255,77,130,0.6)', alignItems:'center', justifyContent:'flex-end', paddingBottom:20 },
  frameHint:    { fontSize:13, color:'rgba(255,255,255,0.7)', textAlign:'center' },
  camBottom:    { alignItems:'center', gap:12 },
  camTip:       { fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center' },
  snapBtn:      { width:76, height:76, borderRadius:38, borderWidth:3, borderColor:'#ff4d82', alignItems:'center', justifyContent:'center' },
  snapInner:    { width:60, height:60, borderRadius:30, backgroundColor:'#ff4d82' },
  cancelTxt:    { color:'rgba(255,255,255,0.4)', fontSize:14 },
  scanBox:      { width:180, height:230, borderRadius:90, overflow:'hidden', marginBottom:20, position:'relative', borderWidth:2, borderColor:'rgba(255,77,130,0.4)' },
  scanPhoto:    { width:'100%', height:'100%' },
  scanLine:     { position:'absolute', left:0, right:0, height:2, backgroundColor:'rgba(255,77,130,0.8)' },
  stepsBox:     { width:'100%', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:12 },
  stepTxt:      { fontSize:12, color:'rgba(255,255,255,0.3)', paddingVertical:3 },
  stepActive:   { color:'rgba(255,255,255,0.8)' },
  stepDone:     { color:'rgba(100,255,150,0.7)' },
  scanNote:     { fontSize:12, color:'rgba(255,255,255,0.25)', marginTop:12, textAlign:'center' },
  resultLabel:  { fontSize:11, textTransform:'uppercase', letterSpacing:2, color:'rgba(255,255,255,0.28)', marginBottom:16 },
  ring:         { width:140, height:140, borderRadius:70, borderWidth:3, alignItems:'center', justifyContent:'center', marginBottom:16 },
  ringNum:      { fontSize:48, fontWeight:'700' },
  ringOf:       { fontSize:12, color:'rgba(255,255,255,0.3)' },
  badge:        { paddingHorizontal:20, paddingVertical:7, borderRadius:50, borderWidth:1, marginBottom:10 },
  badgeTxt:     { fontSize:14, fontWeight:'700', letterSpacing:.5 },
  tierDesc:     { fontSize:13, color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:19, marginBottom:18, maxWidth:280 },
  stats:        { flexDirection:'row', gap:10, marginBottom:16 },
  stat:         { flex:1, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:10, padding:12, alignItems:'center' },
  statN:        { fontSize:20, fontWeight:'700' },
  statL:        { fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2, textTransform:'uppercase', letterSpacing:.5 },
  lockedBox:    { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:14, marginBottom:20, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', width:'100%' },
  lockedTxt:    { fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:18 },
  upgradeBox:   { backgroundColor:'rgba(255,77,130,0.08)', borderRadius:12, padding:16, marginBottom:20, borderWidth:1, borderColor:'rgba(255,77,130,0.25)', width:'100%', alignItems:'center', gap:12 },
  upgradeBoxTxt:{ fontSize:13, color:'rgba(255,255,255,0.6)', textAlign:'center', lineHeight:18 },
  upgradeBoxBtn:{ backgroundColor:'#ff4d82', borderRadius:12, paddingVertical:11, paddingHorizontal:24 },
  upgradeBoxBtnTxt:{ color:'#fff', fontSize:14, fontWeight:'700' },
  backBtn:      { position:'absolute', top:54, left:16, width:38, height:38, borderRadius:19, backgroundColor:'rgba(0,0,0,0.45)', alignItems:'center', justifyContent:'center' },
});
