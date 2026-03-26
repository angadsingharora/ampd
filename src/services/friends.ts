import { supabase } from '../lib/supabase';
import type { Friendship } from '../types';

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

export async function getFriends(
  currentUserId: string,
): Promise<{ friendshipId: string; userId: string }[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, friend_id')
    .eq('user_id', currentUserId)
    .eq('status', 'accepted');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    friendshipId: row.id,
    userId: row.friend_id,
  }));
}

export async function getAcceptedFriendIds(
  currentUserId: string,
): Promise<string[]> {
  const friends = await getFriends(currentUserId);
  return friends.map((f) => f.userId);
}
