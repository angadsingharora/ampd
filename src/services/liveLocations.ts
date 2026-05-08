import { supabase } from '../lib/supabase';
import { getAcceptedFriendIds } from './friends';
import type { UserLocation } from '../types';

export async function updateMyLocation(
  userId: string,
  lat: number,
  lng: number,
): Promise<UserLocation> {
  const { data, error } = await supabase
    .from('locations')
    .upsert(
      { user_id: userId, lat, lng, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as UserLocation;
}

export async function setMyLocationSharingEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('locations')
    .upsert(
      { user_id: userId, sharing: enabled, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) throw error;
}

export async function getVisibleFriendLocations(
  currentUserId: string,
): Promise<UserLocation[]> {
  const friendIds = await getAcceptedFriendIds(currentUserId);
  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('sharing', true)
    .in('user_id', friendIds);

  if (error) throw error;

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', friendIds);

  if (usersError) throw usersError;

  const usernameMap: Record<string, string> = {};
  for (const user of users ?? []) {
    usernameMap[user.id] = user.username;
  }

  return ((data as UserLocation[]) ?? []).map((row) => ({
    ...row,
    username: usernameMap[row.user_id] ?? row.username,
  }));
}

export async function getMyLocationSharingEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('locations')
    .select('sharing')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.sharing);
}

export function subscribeToFriendLocations(
  currentUserId: string,
  onUpdate: (locations: UserLocation[]) => void,
): () => void {
  const channel = supabase
    .channel(`friend-locations-${currentUserId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'locations' },
      async () => {
        try {
          const locations = await getVisibleFriendLocations(currentUserId);
          onUpdate(locations);
        } catch (err) {
          console.error('Friend location subscription refresh failed:', err);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
