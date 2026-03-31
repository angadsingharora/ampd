import { supabase } from '../lib/supabase';
import type { DatingLike, DatingMatch, DatingProfile, PromptAnswer } from '../types';

type DatingProfileInput = {
  photos: string[];
  prompts: PromptAnswer[];
  age: number;
  bio?: string;
  active: boolean;
};

export async function createProfile(userId: string, input: DatingProfileInput): Promise<DatingProfile> {
  const { data, error } = await supabase
    .from('dating_profiles')
    .insert({
      user_id: userId,
      photos: input.photos,
      prompts: input.prompts,
      age: input.age,
      bio: input.bio?.trim() || null,
      active: input.active,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as DatingProfile;
}

export async function updateProfile(userId: string, input: DatingProfileInput): Promise<DatingProfile> {
  const { data, error } = await supabase
    .from('dating_profiles')
    .update({
      photos: input.photos,
      prompts: input.prompts,
      age: input.age,
      bio: input.bio?.trim() || null,
      active: input.active,
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as DatingProfile;
}

export async function fetchFeed(campus: string, userId: string): Promise<DatingProfile[]> {
  const { data: likedRows, error: likedError } = await supabase
    .from('dating_likes')
    .select('liked_id')
    .eq('liker_id', userId);
  if (likedError) throw likedError;

  const { data: matchRows, error: matchesError } = await supabase
    .from('dating_matches')
    .select('user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (matchesError) throw matchesError;

  const excluded = new Set<string>([userId]);
  for (const row of likedRows ?? []) excluded.add(row.liked_id as string);
  for (const row of matchRows ?? []) {
    excluded.add((row.user_a as string) === userId ? (row.user_b as string) : (row.user_a as string));
  }

  const { data: sameCampusUsers, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .eq('campus', campus)
    .neq('id', userId);
  if (usersError) throw usersError;

  const allowedUsers = (sameCampusUsers ?? []).filter((u) => !excluded.has(u.id as string));
  if (allowedUsers.length === 0) return [];

  const allowedIds = allowedUsers.map((user) => user.id as string);
  const usernameById = new Map<string, string>(
    allowedUsers.map((user) => [user.id as string, user.username as string]),
  );

  const { data: profiles, error: profilesError } = await supabase
    .from('dating_profiles')
    .select('*')
    .eq('active', true)
    .in('user_id', allowedIds)
    .order('updated_at', { ascending: false });
  if (profilesError) throw profilesError;

  return ((profiles ?? []) as DatingProfile[]).map((profile) => ({
    ...profile,
    username: usernameById.get(profile.user_id) ?? 'Unknown',
    campus,
  }));
}

export async function likeProfile(
  likerId: string,
  likedId: string,
  contentType: 'photo' | 'prompt',
  contentIndex: number,
  comment?: string,
): Promise<DatingLike> {
  const { data, error } = await supabase
    .from('dating_likes')
    .insert({
      liker_id: likerId,
      liked_id: likedId,
      liked_content_type: contentType,
      liked_content_index: contentIndex,
      comment: comment?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DatingLike;
}

export function skipProfile(): void {
  return;
}

export async function fetchLikesReceived(userId: string): Promise<DatingLike[]> {
  const { data: likes, error } = await supabase
    .from('dating_likes')
    .select('*')
    .eq('liked_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (likes ?? []) as DatingLike[];
  if (rows.length === 0) return [];

  const likerIds = Array.from(new Set(rows.map((row) => row.liker_id)));
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', likerIds);
  if (usersError) throw usersError;

  const { data: profiles, error: profilesError } = await supabase
    .from('dating_profiles')
    .select('user_id, photos')
    .in('user_id', likerIds);
  if (profilesError) throw profilesError;

  const usernameById = new Map<string, string>();
  for (const user of users ?? []) {
    usernameById.set(user.id, user.username);
  }

  const photosById = new Map<string, string[]>();
  for (const profile of profiles ?? []) {
    photosById.set(profile.user_id, (profile.photos as string[]) ?? []);
  }

  return rows.map((row) => ({
    ...row,
    liker_username: usernameById.get(row.liker_id) ?? 'Unknown',
    liker_photos: photosById.get(row.liker_id) ?? [],
  }));
}

export async function fetchMatches(userId: string): Promise<DatingMatch[]> {
  const { data: matches, error } = await supabase
    .from('dating_matches')
    .select('*')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (matches ?? []) as DatingMatch[];
  if (rows.length === 0) return [];

  const partnerIds = rows.map((match) => (match.user_a === userId ? match.user_b : match.user_a));
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', partnerIds);
  if (usersError) throw usersError;

  const { data: profiles, error: profilesError } = await supabase
    .from('dating_profiles')
    .select('user_id, photos')
    .in('user_id', partnerIds);
  if (profilesError) throw profilesError;

  const usernameById = new Map<string, string>((users ?? []).map((u) => [u.id, u.username]));
  const firstPhotoById = new Map<string, string>();
  for (const profile of profiles ?? []) {
    const photos = (profile.photos as string[]) ?? [];
    firstPhotoById.set(profile.user_id, photos[0] ?? '');
  }

  return rows.map((match) => {
    const partnerId = match.user_a === userId ? match.user_b : match.user_a;
    return {
      ...match,
      partner_username: usernameById.get(partnerId) ?? 'Unknown',
      partner_photo: firstPhotoById.get(partnerId) ?? undefined,
    };
  });
}

export async function unmatch(matchId: string): Promise<void> {
  const { error } = await supabase.from('dating_matches').delete().eq('id', matchId);
  if (error) throw error;
}

