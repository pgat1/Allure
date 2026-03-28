import { supabase } from '@/app/lib/supabase';
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
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function ChatScreen() {
  const router = useRouter();
  const [matches, setMatches]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => { loadMatches(); }, []);

  async function loadMatches() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

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

  const filteredMatches = matches.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <View style={s.container}>
      <LinearGradient colors={['#1a0010','#0d0008','#000']} style={StyleSheet.absoluteFillObject} />
      <ActivityIndicator color="#ff4d82" size="large" />
    </View>
  );

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#1a0010', '#0d0008', '#000']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>Allure</Text>
        <View style={s.logoLine} />
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.2)" />
        <TextInput
          style={s.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Messages list */}
      {filteredMatches.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubble-outline" size={50} color="rgba(255,255,255,0.08)" />
          <Text style={s.emptyTxt}>No messages yet!</Text>
          <Text style={s.emptySub}>Match with someone to start chatting 🔥</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          renderItem={({ item }) => {
            const tierColor = getTierColor(item.tier);
            return (
              <TouchableOpacity style={s.row} activeOpacity={0.7}>
                <View style={s.avatarWrap}>
                  {item.photo_urls?.[0] ? (
                    <Image
                      source={{ uri: item.photo_urls[0] }}
                      style={s.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={s.avatarEmpty}>
                      <Ionicons name="person" size={20} color="rgba(255,255,255,0.2)" />
                    </View>
                  )}
                  <View style={[s.tierDot, { backgroundColor: tierColor }]} />
                </View>
                <View style={s.rowContent}>
                  <View style={s.rowTop}>
                    <Text style={s.rowName}>{item.name}</Text>
                    <Text style={s.rowTime}>now</Text>
                  </View>
                  <Text style={s.rowPreview} numberOfLines={1}>
                    Say hi to {item.name?.split(' ')[0]}! 👋
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex:1, backgroundColor:'#000' },
  header:       { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:20, paddingTop:54, paddingBottom:12 },
  logo:         { fontSize:18, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4 },
  logoLine:     { flex:1, height:0.5, backgroundColor:'rgba(255,77,130,0.3)', marginTop:3 },
  searchWrap:   { flexDirection:'row', alignItems:'center', gap:10, marginHorizontal:20, marginBottom:12, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  searchInput:  { flex:1, fontSize:14, color:'#fff' },
  empty:        { flex:1, alignItems:'center', justifyContent:'center', gap:10 },
  emptyTxt:     { fontSize:18, fontWeight:'700', color:'rgba(255,255,255,0.3)' },
  emptySub:     { fontSize:14, color:'rgba(255,255,255,0.15)', textAlign:'center' },
  list:         { paddingHorizontal:20, paddingBottom:100 },
  separator:    { height:1, backgroundColor:'rgba(255,255,255,0.04)', marginLeft:68 },
  row:          { flexDirection:'row', alignItems:'center', paddingVertical:12, gap:14 },
  avatarWrap:   { position:'relative' },
  avatar:       { width:52, height:52, borderRadius:26 },
  avatarEmpty:  { width:52, height:52, borderRadius:26, backgroundColor:'rgba(255,255,255,0.05)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  tierDot:      { position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:5, borderWidth:1.5, borderColor:'#000' },
  rowContent:   { flex:1 },
  rowTop:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  rowName:      { fontSize:15, fontWeight:'700', color:'#fff' },
  rowTime:      { fontSize:11, color:'rgba(255,255,255,0.2)' },
  rowPreview:   { fontSize:13, color:'rgba(255,255,255,0.35)' },
});
