import { supabase } from '../lib/supabase';
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
  _currentUserId: string,
): Promise<UserLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('sharing', true);

  if (error) throw error;
  return (data as UserLocation[]) ?? [];
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
