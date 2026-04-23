import { supabase } from '@/app/lib/supabase';
import { clearMessagesBadge } from '@/app/lib/badgeCounts';
import { sendMessageNotification } from '@/app/lib/notifications';
import { getUserTier, UserTier } from '@/app/lib/subscription';
import { useToast } from '@/app/lib/Toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const TAB_STYLE = {
  backgroundColor: 'transparent',
  borderTopWidth: 0,
  height: 62,
  paddingBottom: 14,
  paddingTop: 6,
  marginHorizontal: 16,
  marginBottom: 20,
  borderRadius: 30,
  position: 'absolute' as const,
  elevation: 0,
  shadowColor: '#ff4d82',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
};

const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';

export default function ChatScreen() {
  const navigation = useNavigation();
  const { showToast, toastJSX } = useToast();
  const [screen, setScreen]             = useState<'list' | 'convo'>('list');
  const [matches, setMatches]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [currentUser, setCurrentUser]   = useState<any>(null);
  const [activeMatch, setActiveMatch]   = useState<any>(null);
  const [messages, setMessages]         = useState<any[]>([]);
  const [message, setMessage]           = useState('');
  const [wingmanModal, setWingmanModal] = useState(false);
  const [wingmanLines, setWingmanLines] = useState<string[]>([]);
  const [wingmanLoading, setWingmanLoading] = useState(false);
  const [activeSub, setActiveSub]       = useState<any>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [tier, setTier]                 = useState<UserTier>('free');
  const [matchRowIds, setMatchRowIds]   = useState<Record<string, string>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  const flatListRef = useRef<FlatList>(null);
  const screenRef   = useRef<'list' | 'convo'>('list');
  const matchesRef  = useRef<any[]>([]);

  useEffect(() => {
    navigation.setOptions({ tabBarStyle: screen === 'convo' ? { display: 'none' } : TAB_STYLE });
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => { clearMessagesBadge(); }, []);
  useEffect(() => { init(); }, []);

  // Global subscription: notify for new messages when convo is NOT open
  useEffect(() => {
    if (!currentUser || Object.keys(matchRowIds).length === 0) return;
    const subs = Object.entries(matchRowIds).map(([profileId, matchRowId]) =>
      supabase
        .channel(`global:${matchRowId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchRowId}`,
        }, (payload) => {
          if (payload.new.sender_id !== currentUser.id && screenRef.current === 'list') {
            const profile = matchesRef.current.find(m => m.id === profileId);
            sendMessageNotification(
              profile?.name?.split(' ')[0] || 'Someone',
              payload.new.content
            );
          }
        })
        .subscribe()
    );
    return () => { subs.forEach(s => s.unsubscribe()); };
  }, [currentUser?.id, matchRowIds]);

  function formatMatchTime(isoStr: string): string {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setCurrentUser(userData.user);
    // Mark user as active
    supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', userData.user.id);
    const userTier = await getUserTier(userData.user.id);
    setTier(userTier);
    await loadMatches(userData.user.id);
  }

  async function loadMatches(userId: string) {
    setLoading(true);
    const { data: matchesData } = await supabase
      .from('matches').select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    if (matchesData && matchesData.length > 0) {
      const rowIds: Record<string, string> = {};
      const matchProfileIds = matchesData.map(m => {
        const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;
        rowIds[otherId] = m.id;
        return otherId;
      });
      setMatchRowIds(rowIds);
      const { data: matchProfiles } = await supabase
        .from('profiles').select('*').in('id', matchProfileIds);
      const profiles = matchProfiles || [];
      setMatches(profiles);
      matchesRef.current = profiles;

      // Fetch last message for each match
      const matchRowIdValues = Object.values(rowIds);
      const { data: lastMsgsData } = await supabase
        .from('messages')
        .select('match_id, content, created_at, sender_id, read')
        .in('match_id', matchRowIdValues)
        .order('created_at', { ascending: false });
      const lastMsgMap: Record<string, any> = {};
      for (const msg of lastMsgsData || []) {
        if (!lastMsgMap[msg.match_id]) lastMsgMap[msg.match_id] = msg;
      }
      setLastMessages(lastMsgMap);
    }
    setLoading(false);
  }

  async function openConvo(match: any) {
    setActiveMatch(match);
    setScreen('convo');
    const { data: matchRow } = await supabase
      .from('matches').select('id')
      .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${match.id}),and(user1_id.eq.${match.id},user2_id.eq.${currentUser.id})`)
      .single();
    if (!matchRow) return;
    const { data } = await supabase
      .from('messages').select('*')
      .eq('match_id', matchRow.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    const matchRowId = matchRow.id;
    setActiveMatch({ ...match, matchRowId });

    // Mark existing unread messages as read
    supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchRowId)
      .neq('sender_id', currentUser.id);

    const sub = supabase
      .channel(`messages:${matchRowId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchRowId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.sender_id !== currentUser?.id) {
          // Convo is open — mark as read, no notification
          supabase
            .from('messages')
            .update({ read: true })
            .eq('id', payload.new.id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchRowId}`,
      }, (payload) => {
        // Update read flag on our sent messages so "Seen" renders
        setMessages(prev =>
          prev.map(m => m.id === payload.new.id ? { ...m, read: payload.new.read } : m)
        );
      })
      .subscribe();
    setActiveSub(sub);
  }

  function closeConvo() {
    activeSub?.unsubscribe();
    setActiveSub(null);
    setScreen('list');
  }

  async function sendMessage() {
    if (!message.trim() || !currentUser || !activeMatch?.matchRowId) return;
    const content = message.trim();
    setMessage('');

    try {
      const modRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: `Is this message hate speech, a slur, sexually explicit, or harassment? Reply only YES or NO. Message: "${content}"`,
          }],
        }),
      });
      const modData = await modRes.json();
      const verdict = modData.content[0].text.trim().toUpperCase();
      if (verdict === 'YES') {
        showToast("Message blocked — community guidelines violation");
        return;
      }
    } catch {
      // moderation failed, allow through
    }

    const msg = {
      sender_id: currentUser.id,
      match_id: activeMatch.matchRowId,
      content,
      created_at: new Date().toISOString(),
    };
    // Optimistic insert first, then replace with DB row (which has id + read=false)
    setMessages(prev => [...prev, msg]);
    const { data: inserted } = await supabase.from('messages').insert(msg).select().single();
    if (inserted) {
      setMessages(prev => [...prev.slice(0, -1), inserted]);
    }
  }

  async function getWingmanSuggestions() {
    if (!ANTHROPIC_KEY) {
      showToast('Wingman unavailable');
      return;
    }
    setWingmanLoading(true);
    setWingmanModal(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are Wingman, an AI assistant for the dating app Allure. Based on the conversation with ${activeMatch?.name}, generate 3 short message suggestions. Make them sound natural and confident — like something a cool, self-assured person would actually say. No cheesy pickup lines, no over-the-top compliments. Keep them short (under 15 words each), casual, and genuine. Vary the tone — one playful, one curious, one bold. Return ONLY a JSON array of 3 strings, no other text.`,
          }],
        }),
      });
      console.log('Wingman status:', response.status);
      const data = await response.json();
      console.log('Wingman response:', JSON.stringify(data).slice(0, 200));
      let parsed;
      try {
        parsed = JSON.parse(data.content[0].text);
      } catch {
        console.log('Parse error, raw text:', data.content?.[0]?.text);
        showToast('Wingman failed — try again');
        setWingmanModal(false);
        return;
      }
      setWingmanLines(parsed);
    } catch (err: any) {
      console.log('Wingman error:', err);
      console.log('ANTHROPIC_KEY present:', !!ANTHROPIC_KEY);
      showToast('Wingman failed — try again');
      setWingmanModal(false);
    } finally {
      setWingmanLoading(false);
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

  const filteredMatches = matches.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── CONVERSATION ──
  if (screen === 'convo' && activeMatch) {
    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
        <View style={s.convoHeader}>
          <TouchableOpacity onPress={closeConvo} style={s.convoBack}>
            <Ionicons name="chevron-back" size={24} color="#ff4d82" />
          </TouchableOpacity>
          <TouchableOpacity style={s.convoHeaderCenter} onPress={() => setProfileModal(true)} activeOpacity={0.7}>
            {activeMatch.profile_picture ? (
              <Image source={{ uri: activeMatch.profile_picture }} style={s.convoAvatar} resizeMode="cover" />
            ) : (
              <View style={s.convoAvatarEmpty}>
                <Ionicons name="person" size={18} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <Text style={s.convoName}>{activeMatch.name?.split(' ')[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={getWingmanSuggestions} style={s.convoWingman}>
            <Text style={s.wingmanBtnTxt}>🪽</Text>
          </TouchableOpacity>
        </View>
        {(() => {
          // Index of the last message I sent — show Sent!/Seen below it
          let lastSentIdx = -1;
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].sender_id === currentUser?.id) { lastSentIdx = i; break; }
          }
          return (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={s.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={s.convoEmpty}>
                  <Text style={s.convoEmptyTxt}>No messages yet</Text>
                  <Text style={s.convoEmptySub}>Type something or use 🪽 Wingman!</Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const isMe = item.sender_id === currentUser?.id;
                const prevMsg = messages[index - 1];
                const nextMsg = messages[index + 1];
                const isFirstInGroup = !prevMsg || prevMsg.sender_id !== item.sender_id;
                const isLastInGroup = !nextMsg || nextMsg.sender_id !== item.sender_id;
                const statusLabel = (isMe && index === lastSentIdx)
                  ? (tier === 'plusplus' && item.read ? 'Seen' : 'Sent!')
                  : null;

                if (isMe) {
                  return (
                    <View style={[s.bubbleWrapMe, !isFirstInGroup && s.bubbleWrapCondensed]}>
                      <View style={[s.bubble, s.bubbleMe]}>
                        <Text style={[s.bubbleTxt, s.bubbleTxtMe]}>{item.content}</Text>
                      </View>
                      {statusLabel ? <Text style={s.sentLabel}>{statusLabel}</Text> : null}
                      {isLastInGroup && item.created_at ? (
                        <Text style={s.groupTimestamp}>{formatMatchTime(item.created_at)}</Text>
                      ) : null}
                    </View>
                  );
                }

                return (
                  <View style={[s.bubbleRowThem, !isFirstInGroup && s.bubbleWrapCondensed]}>
                    {isLastInGroup ? (
                      activeMatch.profile_picture ? (
                        <Image source={{ uri: activeMatch.profile_picture }} style={s.msgAvatar} resizeMode="cover" />
                      ) : (
                        <View style={[s.msgAvatar, s.msgAvatarEmpty]}>
                          <Ionicons name="person" size={12} color="rgba(255,255,255,0.3)" />
                        </View>
                      )
                    ) : (
                      <View style={s.msgAvatarSpacer} />
                    )}
                    <View style={s.bubbleWrapThem}>
                      <View style={[s.bubble, s.bubbleThem]}>
                        <Text style={[s.bubbleTxt, s.bubbleTxtThem]}>{item.content}</Text>
                      </View>
                      {isLastInGroup && item.created_at ? (
                        <Text style={s.groupTimestamp}>{formatMatchTime(item.created_at)}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              }}
            />
          );
        })()}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={`Message ${activeMatch.name?.split(' ')[0]}...`}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <Modal visible={wingmanModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>🪽 Wingman AI</Text>
                <TouchableOpacity onPress={() => setWingmanModal(false)}>
                  <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
              <Text style={s.modalSub}>Tap a line to use it — or type your own</Text>
              {wingmanLoading ? (
                <ActivityIndicator color="#ff4d82" size="large" style={{ marginVertical:30 }} />
              ) : (
                wingmanLines.map((line, i) => (
                  <TouchableOpacity key={i} style={s.linePill} onPress={() => { setMessage(line); setWingmanModal(false); }}>
                    <Text style={s.lineTxt}>{line}</Text>
                    <Ionicons name="arrow-up-circle" size={20} color="#ff4d82" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </Modal>

        {/* Profile View Modal */}
        <Modal visible={profileModal} transparent animationType="slide">
          <View style={s.profileOverlay}>
            <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
            <TouchableOpacity style={s.profileClose} onPress={() => setProfileModal(false)}>
              <Ionicons name="close-circle" size={30} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.profileScroll}>
              {/* Main hero photo */}
              <View style={s.profileHero}>
                {activeMatch.photo_urls?.[0] ? (
                  <Image source={{ uri: activeMatch.photo_urls[0] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <View style={s.profileHeroEmpty}>
                    <Ionicons name="person" size={60} color="rgba(255,255,255,0.1)" />
                  </View>
                )}
                <LinearGradient colors={['transparent','#0a0005']} style={StyleSheet.absoluteFillObject} />
              </View>

              {/* Name / age / tier row */}
              <View style={s.profileNameRow}>
                <View>
                  <Text style={s.profileName}>{activeMatch.name?.split(' ')[0]}{activeMatch.age ? `, ${activeMatch.age}` : ''}</Text>
                </View>
                {activeMatch.tier && (
                  <View style={[s.profileTierPill, { backgroundColor: getTierColor(activeMatch.tier) + '22', borderColor: getTierColor(activeMatch.tier) + '66' }]}>
                    <Text style={[s.profileTierTxt, { color: getTierColor(activeMatch.tier) }]}>
                      {getTierEmoji(activeMatch.tier)} {activeMatch.tier} · {activeMatch.score ?? 0}
                    </Text>
                  </View>
                )}
              </View>

              {/* Bio */}
              {activeMatch.bio ? (
                <Text style={s.profileBio}>{activeMatch.bio}</Text>
              ) : null}

              {/* All photos horizontal scroll */}
              {activeMatch.photo_urls?.length > 1 && (
                <>
                  <Text style={s.profileSectionLabel}>Photos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photoRowContent}>
                    {(activeMatch.photo_urls as string[]).filter(Boolean).map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={s.profilePhotoThumb} resizeMode="cover" />
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Interests */}
              {activeMatch.interests?.length > 0 && (
                <>
                  <Text style={s.profileSectionLabel}>Interests</Text>
                  <View style={s.profilePillsRow}>
                    {(activeMatch.interests as any[]).map((int, i) => (
                      <View key={i} style={s.profileInterestPill}>
                        <Text style={s.profileInterestTxt}>{int.emoji} {int.label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Get to Know Me tags */}
              {activeMatch.get_to_know_me && Object.keys(activeMatch.get_to_know_me).filter(k => activeMatch.get_to_know_me[k]).length > 0 && (
                <>
                  <Text style={s.profileSectionLabel}>Get to Know Me</Text>
                  <View style={s.profileTagsGrid}>
                    {Object.entries(activeMatch.get_to_know_me as Record<string,string>)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <View key={k} style={s.profileTag}>
                          <Text style={s.profileTagTxt}>{v}</Text>
                        </View>
                      ))}
                  </View>
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // ── MATCHES LIST ──
  return (
    <View style={s.container}>
      <LinearGradient colors={['#2a0018','#150010','#0a0005']} style={StyleSheet.absoluteFillObject} />
      <View style={s.header}>
        <Text style={s.logo}>Allure</Text>
        <View style={s.logoLine} />
      </View>
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
      {loading ? (
        <ActivityIndicator color="#ff4d82" size="large" style={{ marginTop:40 }} />
      ) : filteredMatches.length === 0 ? (
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
            const lastMsg = lastMessages[matchRowIds[item.id]];
            const isUnread = lastMsg && lastMsg.sender_id !== currentUser?.id && !lastMsg.read;
            return (
              <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => openConvo(item)}>
                <View style={s.avatarWrap}>
                  {item.profile_picture ? (
                    <Image source={{ uri: item.profile_picture }} style={s.avatar} resizeMode="cover" />
                  ) : (
                    <View style={s.avatarEmpty}>
                      <Ionicons name="person" size={20} color="rgba(255,255,255,0.2)" />
                    </View>
                  )}
                  <View style={[s.tierDot, { backgroundColor: tierColor }]} />
                </View>
                <View style={s.rowContent}>
                  <View style={s.rowTop}>
                    <Text style={[s.rowName, isUnread && s.rowNameUnread]}>{item.name?.split(' ')[0]}</Text>
                    <Text style={s.rowTime}>{lastMsg ? formatMatchTime(lastMsg.created_at) : ''}</Text>
                  </View>
                  <Text style={[s.rowPreview, isUnread && s.rowPreviewUnread]} numberOfLines={1}>
                    {lastMsg
                      ? (lastMsg.sender_id === currentUser?.id ? 'You: ' : '') + lastMsg.content
                      : `Start a conversation with ${item.name?.split(' ')[0]}!`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      {toastJSX}
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex:1, backgroundColor:'#000' },
  header:         { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:20, paddingTop:54, paddingBottom:12 },
  logo:           { fontSize:18, fontWeight:'200', fontStyle:'italic', color:'#ff4d82', letterSpacing:4 },
  logoLine:       { flex:1, height:0.5, backgroundColor:'rgba(255,77,130,0.3)', marginTop:3 },
  searchWrap:     { flexDirection:'row', alignItems:'center', gap:10, marginHorizontal:20, marginBottom:12, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:12, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:'rgba(255,255,255,0.11)' },
  searchInput:    { flex:1, fontSize:14, color:'#fff' },
  empty:          { flex:1, alignItems:'center', justifyContent:'center', gap:10 },
  emptyTxt:       { fontSize:18, fontWeight:'700', color:'rgba(255,255,255,0.48)' },
  emptySub:       { fontSize:14, color:'rgba(255,255,255,0.3)', textAlign:'center' },
  list:           { paddingHorizontal:20, paddingBottom:100 },
  separator:      { height:1, backgroundColor:'rgba(255,255,255,0.07)', marginLeft:68 },
  row:            { flexDirection:'row', alignItems:'center', paddingVertical:12, gap:14 },
  avatarWrap:     { position:'relative' },
  avatar:         { width:52, height:52, borderRadius:26 },
  avatarEmpty:    { width:52, height:52, borderRadius:26, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.13)' },
  tierDot:        { position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:5, borderWidth:1.5, borderColor:'#000' },
  rowContent:     { flex:1 },
  rowTop:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  rowName:        { fontSize:15, fontWeight:'400', color:'rgba(255,255,255,0.75)' },
  rowNameUnread:  { fontWeight:'700', color:'#fff' },
  rowTime:        { fontSize:11, color:'rgba(255,255,255,0.3)' },
  rowPreview:     { fontSize:13, color:'rgba(255,255,255,0.4)' },
  rowPreviewUnread: { color:'rgba(255,255,255,0.7)', fontWeight:'500' },
  wingmanTag:     { fontSize:11, color:'#ff4d82', fontWeight:'600' },
  convoHeader:       { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop:54, paddingBottom:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.08)' },
  convoBack:         { width:40 },
  convoHeaderCenter: { flex:1, alignItems:'center', gap:5 },
  convoAvatar:       { width:38, height:38, borderRadius:19, borderWidth:1.5, borderColor:'#ff4d82' },
  convoAvatarEmpty:  { width:38, height:38, borderRadius:19, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:'#ff4d82' },
  convoName:         { fontSize:13, fontWeight:'700', color:'#fff' },
  convoWingman:      { width:40, alignItems:'flex-end' },
  wingmanBtnTxt:     { fontSize:20 },
  messagesList:      { padding:16, paddingBottom:20, flexGrow:1 },
  convoEmpty:        { alignItems:'center', marginTop:100, gap:8 },
  convoEmptyTxt:     { fontSize:16, color:'rgba(255,255,255,0.48)', fontWeight:'600' },
  convoEmptySub:     { fontSize:13, color:'rgba(255,255,255,0.3)' },
  bubbleWrapMe:        { alignSelf:'flex-end', alignItems:'flex-end', marginBottom:8 },
  bubbleRowThem:       { flexDirection:'row', alignItems:'flex-end', gap:8, alignSelf:'flex-start', marginBottom:8 },
  bubbleWrapThem:      { alignItems:'flex-start' },
  bubbleWrapCondensed: { marginBottom:2 },
  groupTimestamp:      { fontSize:10, color:'rgba(255,255,255,0.3)', fontStyle:'italic', marginTop:4, marginHorizontal:4 },
  msgAvatar:           { width:26, height:26, borderRadius:13 },
  msgAvatarEmpty:      { backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  msgAvatarSpacer:     { width:26 },
  bubble:              { maxWidth:'75%', paddingHorizontal:14, paddingVertical:10 },
  bubbleMe:            { backgroundColor:'#ff4d82', borderTopLeftRadius:16, borderTopRightRadius:16, borderBottomLeftRadius:16, borderBottomRightRadius:4 },
  bubbleThem:          { backgroundColor:'rgba(255,255,255,0.09)', borderTopLeftRadius:16, borderTopRightRadius:16, borderBottomLeftRadius:4, borderBottomRightRadius:16 },
  bubbleTxt:           { fontSize:14, lineHeight:20 },
  bubbleTxtMe:         { color:'#fff' },
  bubbleTxtThem:       { color:'rgba(255,255,255,0.9)' },
  sentLabel:           { fontSize:11, color:'rgba(255,255,255,0.38)', fontStyle:'italic', marginTop:3, marginRight:4 },
  inputRow:       { flexDirection:'row', alignItems:'flex-end', gap:10, padding:12, paddingBottom:34, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.05)', backgroundColor:'rgba(255,255,255,0.02)' },
  input:          { flex:1, backgroundColor:'rgba(255,255,255,0.09)', borderRadius:20, paddingHorizontal:16, paddingVertical:10, fontSize:14, color:'#fff', borderWidth:1, borderColor:'rgba(255,255,255,0.13)', maxHeight:100 },
  sendBtn:        { width:46, height:46, borderRadius:23, backgroundColor:'#ff4d82', alignItems:'center', justifyContent:'center' },
  modalOverlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.9)', justifyContent:'flex-end' },
  modalCard:      { backgroundColor:'#1e0012', borderRadius:24, padding:22, borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  modalHeader:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  modalTitle:     { fontSize:18, fontWeight:'700', color:'#fff' },
  modalSub:       { fontSize:12, color:'rgba(255,255,255,0.42)', marginBottom:16 },
  linePill:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'rgba(255,77,130,0.08)', borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:'rgba(255,77,130,0.2)' },
  lineTxt:        { fontSize:14, color:'#fff', flex:1, marginRight:10, lineHeight:20 },

  // Profile modal
  profileOverlay:      { flex:1, backgroundColor:'#0a0005' },
  profileClose:        { position:'absolute', top:52, right:18, zIndex:20 },
  profileScroll:       { flexGrow:1 },
  profileHero:         { width:'100%', height:420, overflow:'hidden', backgroundColor:'#1a000d' },
  profileHeroEmpty:    { flex:1, alignItems:'center', justifyContent:'center' },
  profileNameRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', paddingHorizontal:20, marginTop:16, marginBottom:8 },
  profileName:         { fontSize:26, fontWeight:'700', color:'#fff', letterSpacing:0.3 },
  profileTierPill:     { borderRadius:50, borderWidth:1, paddingHorizontal:12, paddingVertical:6, alignSelf:'flex-start', marginTop:4 },
  profileTierTxt:      { fontSize:12, fontWeight:'700' },
  profileBio:          { fontSize:14, color:'rgba(255,255,255,0.5)', fontStyle:'italic', paddingHorizontal:20, marginBottom:16, lineHeight:22 },
  profileSectionLabel: { fontSize:11, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:1.2, paddingHorizontal:20, marginBottom:10, marginTop:6 },
  photoRowContent:     { paddingHorizontal:20, gap:10, paddingBottom:4 },
  profilePhotoThumb:   { width: SCREEN_W * 0.38, height: SCREEN_W * 0.5, borderRadius:14, backgroundColor:'rgba(255,255,255,0.06)', marginBottom:6 },
  profilePillsRow:     { flexDirection:'row', flexWrap:'wrap', gap:8, paddingHorizontal:20, marginBottom:16 },
  profileInterestPill: { paddingHorizontal:13, paddingVertical:7, borderRadius:50, borderWidth:1, borderColor:'rgba(255,77,130,0.45)', backgroundColor:'rgba(255,77,130,0.1)' },
  profileInterestTxt:  { fontSize:13, color:'#ff4d82', fontWeight:'600' },
  profileTagsGrid:     { flexDirection:'row', flexWrap:'wrap', gap:8, paddingHorizontal:20, marginBottom:16 },
  profileTag:          { paddingHorizontal:13, paddingVertical:7, borderRadius:10, backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  profileTagTxt:       { fontSize:13, color:'rgba(255,255,255,0.75)' },
});