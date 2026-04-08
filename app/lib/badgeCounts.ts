import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface BadgeCounts {
  likes: number;
  messages: number;
}

export async function fetchBadgeCounts(userId: string): Promise<BadgeCounts> {
  // --- Likes badge ---
  // Count likes where to_user = userId and no match exists for that pair.
  // Fetch all likes directed at this user.
  const { data: incomingLikes } = await supabase
    .from('likes')
    .select('from_user')
    .eq('to_user', userId);

  let unlikedCount = 0;
  if (incomingLikes && incomingLikes.length > 0) {
    const fromUserIds = incomingLikes.map(l => l.from_user);

    // Fetch matches involving this user so we can exclude already-matched pairs.
    const { data: matchRows } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    const matchedUserIds = new Set(
      (matchRows ?? []).map(m => m.user1_id === userId ? m.user2_id : m.user1_id)
    );

    unlikedCount = fromUserIds.filter(id => !matchedUserIds.has(id)).length;
  }

  // --- Messages badge ---
  // Count unread messages (read = false) from other users across all matches
  // involving the current user.
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
      .eq('read', false);

    unreadCount = count ?? 0;
  }

  return { likes: unlikedCount, messages: unreadCount };
}

export function formatBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : String(count);
}

export function useBadgeCounts(): BadgeCounts {
  const [counts, setCounts] = useState<BadgeCounts>({ likes: 0, messages: 0 });

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const result = await fetchBadgeCounts(user.id);
      if (!cancelled) setCounts(result);
    }

    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return counts;
}
