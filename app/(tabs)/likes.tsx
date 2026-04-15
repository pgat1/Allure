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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AlluredScreen() {
  const [matches, setMatches] = useState<any[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMatches(); }, []);

  async function loadMatches() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const userId = userData.user.id;

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (matchesData && matchesData.length > 0) {
        const matchedIds = matchesData.map(m =>
          m.user1_id === userId ? m.user2_id : m.user1_id
        );
        const { data: profiles } = await supabase
          .from('profiles').select('*').in('id', matchedIds);
        setMatches(profiles || []);
      } else {
        setMatches([]);
      }
    } catch (err) {
      console.log('Error loading matches:', err);
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

  const filtered = matches.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={14} color="rgba(255,255,255,0.3)" />
        <TextInput
          style={s.searchInput}
          placeholder="Search matches..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="heart-circle-outline" size={54} color="rgba(255,255,255,0.08)" />
          <Text style={s.emptyTxt}>
            {search.length > 0 ? 'No matches found' : 'No matches yet!\nKeep swiping 🔥'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const tierColor = getTierColor(item.tier);
            return (
              <View style={s.card}>
                <View style={s.cardImg}>
                  {item.profile_picture ? (
                    <Image source={{ uri: item.profile_picture }} style={s.cardPhoto} resizeMode="cover" />
                  ) : (
                    <View style={s.cardPhotoEmpty}>
                      <Ionicons name="person" size={32} color="rgba(255,255,255,0.2)" />
                    </View>
                  )}
                  <View style={[s.tierDot, { backgroundColor: tierColor }]} />
                </View>
                <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.cardTier, { color: tierColor }]}>
                  {getTierEmoji(item.tier)} {item.tier}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex:1, backgroundColor:'#000' },
  header:        { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:20, paddingTop:54, paddingBottom:4 },
  logo:          { fontSize:18, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4 },
  logoLine:      { flex:1, height:0.5, backgroundColor:'rgba(255,77,130,0.3)', marginTop:3 },
  title:         { fontSize:22, fontWeight:'700', color:'#fff', paddingHorizontal:20, marginTop:10 },
  subtitle:      { fontSize:13, color:'rgba(255,255,255,0.35)', paddingHorizontal:20, marginBottom:14 },
  searchWrap:    { flexDirection:'row', alignItems:'center', gap:8, marginHorizontal:20, marginBottom:12, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:12, paddingHorizontal:12, paddingVertical:10, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  searchInput:   { flex:1, fontSize:14, color:'#fff', padding:0 },
  empty:         { flex:1, alignItems:'center', justifyContent:'center', gap:16, paddingHorizontal:40 },
  emptyTxt:      { fontSize:15, color:'rgba(255,255,255,0.42)', textAlign:'center', lineHeight:22 },
  grid:          { padding:12, paddingBottom:120 },
  card:          { flex:1, margin:4, alignItems:'center', gap:5 },
  cardImg:       { width:'100%', aspectRatio:3/4, borderRadius:12, overflow:'hidden', position:'relative', backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.11)' },
  cardPhoto:     { width:'100%', height:'100%' },
  cardPhotoEmpty:{ width:'100%', height:'100%', alignItems:'center', justifyContent:'center' },
  tierDot:       { position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4 },
  cardName:      { fontSize:11, color:'rgba(255,255,255,0.78)', textAlign:'center', width:'100%' },
  cardTier:      { fontSize:10, textAlign:'center' },
});
