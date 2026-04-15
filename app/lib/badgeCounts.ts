import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface BadgeCounts {
  likes: number;
  messages: number;
}

// --- Module-level store so clear functions update the hook in real time ---
let _counts: BadgeCounts = { likes: 0, messages: 0 };
const _listeners = new Set<(counts: BadgeCounts) => void>();

function _notify(next: BadgeCounts) {
  _counts = next;
  _listeners.forEach(fn => fn(next));
}

// --- Persist last-viewed timestamps to Supabase ---

export async function setLastViewedLikes(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const now = new Date().toISOString();
  await supabase.from('profiles').update({ last_viewed_likes: now }).eq('id', user.id);
}

export async function setLastViewedMessages(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const now = new Date().toISOString();
  await supabase.from('profiles').update({ last_viewed_messages: now }).eq('id', user.id);
}

// --- Clear badges: zero out immediately in-memory AND update the timestamp ---

export async function clearLikesBadge(): Promise<void> {
  _notify({ ..._counts, likes: 0 });
  await setLastViewedLikes();
}

export async function clearMessagesBadge(): Promise<void> {
  _notify({ ..._counts, messages: 0 });
  await setLastViewedMessages();
}

// --- Fetch counts only for activity newer than last-viewed timestamps ---

export async function fetchBadgeCounts(userId: string): Promise<BadgeCounts> {
  // Load timestamps from profile
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('last_viewed_likes, last_viewed_messages')
    .eq('id', userId)
    .single();

  const lastViewedLikes: string = profileRow?.last_viewed_likes ?? '1970-01-01T00:00:00.000Z';
  const lastViewedMessages: string = profileRow?.last_viewed_messages ?? '1970-01-01T00:00:00.000Z';

  // --- Likes badge: new likes received after lastViewedLikes, not yet matched ---
  const { data: incomingLikes } = await supabase
    .from('likes')
    .select('from_user')
    .eq('to_user', userId)
    .gt('created_at', lastViewedLikes);

  let unlikedCount = 0;
  if (incomingLikes && incomingLikes.length > 0) {
    const fromUserIds = incomingLikes.map(l => l.from_user);

    const { data: matchRows } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    const matchedUserIds = new Set(
      (matchRows ?? []).map(m => m.user1_id === userId ? m.user2_id : m.user1_id)
    );

    unlikedCount = fromUserIds.filter(id => !matchedUserIds.has(id)).length;
  }

  // --- Messages badge: unread messages from others after lastViewedMessages ---
  const { data: userMatches } = await supabase
    .from('matches')
    .select('id')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  let unreadCount = 0;
  if (userMatches && userMatches.length > 0) {
    const matchIds = userMatches.map(m => m.id);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('match_id', matchIds)
      .neq('sender_id', userId)
      .eq('read', false)
      .gt('created_at', lastViewedMessages);

    unreadCount = count ?? 0;
  }

  return { likes: unlikedCount, messages: unreadCount };
}

export function formatBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : String(count);
}

export function useBadgeCounts(): BadgeCounts {
  const [counts, setCounts] = useState<BadgeCounts>(_counts);

  useEffect(() => {
    let cancelled = false;

    _listeners.add(setCounts);

    async function refresh() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const result = await fetchBadgeCounts(user.id);
      if (!cancelled) _notify(result);
    }

    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      _listeners.delete(setCounts);
    };
  }, []);

  return counts;
}
