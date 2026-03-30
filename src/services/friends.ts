import { supabase } from '../lib/supabase';
import type { Friendship, User } from '../types';

export async function searchUsers(query: string, currentUserId: string): Promise<User[]> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${trimmed}%`)
    .neq('id', currentUserId)
    .limit(20);

  if (error) throw error;
  return (data as User[]) ?? [];
}

export async function sendFriendRequest(
  userId: string,
  friendId: string,
): Promise<Friendship> {
  if (userId === friendId) {
    throw new Error('You cannot friend yourself.');
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
    .select('*')
    .single();

  if (error) throw error;
  return data as Friendship;
}

export async function acceptFriendRequest(
  userId: string,
  friendId: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('user_id', friendId)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (updateError) throw updateError;

  const { error: insertError } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'accepted' });

  if (insertError) throw insertError;
}

export async function declineFriendRequest(
  userId: string,
  friendId: string,
): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
}

export interface FriendWithProfile {
  friendshipId: string;
  userId: string;
  username: string;
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing' | 'mutual';
}

export async function getFriendsWithProfiles(
  currentUserId: string,
): Promise<FriendWithProfile[]> {
  const { data: outgoing, error: outErr } = await supabase
    .from('friendships')
    .select('id, friend_id, status')
    .eq('user_id', currentUserId);

  if (outErr) throw outErr;

  const { data: incoming, error: inErr } = await supabase
    .from('friendships')
    .select('id, user_id, status')
    .eq('friend_id', currentUserId);

  if (inErr) throw inErr;

  const friendIds = new Set<string>();
  const items: FriendWithProfile[] = [];

  for (const row of outgoing ?? []) {
    friendIds.add(row.friend_id);
    items.push({
      friendshipId: row.id,
      userId: row.friend_id,
      username: '',
      status: row.status as 'pending' | 'accepted',
      direction: row.status === 'accepted' ? 'mutual' : 'outgoing',
    });
  }

  for (const row of incoming ?? []) {
    if (friendIds.has(row.user_id)) continue;
    items.push({
      friendshipId: row.id,
      userId: row.user_id,
      username: '',
      status: row.status as 'pending' | 'accepted',
      direction: 'incoming',
    });
  }

  if (items.length === 0) return [];

  const allIds = items.map((i) => i.userId);
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .in('id', allIds);

  const usernameMap: Record<string, string> = {};
  for (const u of users ?? []) {
    usernameMap[u.id] = u.username;
  }

  for (const item of items) {
    item.username = usernameMap[item.userId] ?? 'Unknown';
  }

  return items;
}

export async function getAcceptedFriendIds(
  currentUserId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', currentUserId)
    .eq('status', 'accepted');

  if (error) throw error;
  return (data ?? []).map((row) => row.friend_id);
}
