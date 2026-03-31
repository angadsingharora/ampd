import { supabase } from '../lib/supabase';
import type { Community, CommunityMember } from '../types';

export async function createCommunity(params: {
  name: string;
  description?: string;
  createdBy: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<Community> {
  const { data, error } = await supabase
    .from('communities')
    .insert({
      name: params.name.trim(),
      description: params.description?.trim() || null,
      created_by: params.createdBy,
      lat: params.lat ?? null,
      lng: params.lng ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Community;
}

export async function fetchCommunities(
  userId: string,
): Promise<{ my: Community[]; discover: Community[] }> {
  const { data: memberRows, error: membersError } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId);
  if (membersError) throw membersError;

  const myIds = (memberRows ?? []).map((row) => row.community_id as string);

  const { data: allCommunities, error: communitiesError } = await supabase
    .from('communities')
    .select('*')
    .order('created_at', { ascending: false });
  if (communitiesError) throw communitiesError;

  const communities = (allCommunities ?? []) as Community[];
  if (communities.length === 0) return { my: [], discover: [] };

  const communityIds = communities.map((c) => c.id);
  const { data: countsData, error: countsError } = await supabase
    .from('community_members')
    .select('community_id')
    .in('community_id', communityIds);
  if (countsError) throw countsError;

  const countMap = new Map<string, number>();
  for (const row of countsData ?? []) {
    const id = row.community_id as string;
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  const withCounts = communities.map((community) => ({
    ...community,
    member_count: countMap.get(community.id) ?? 0,
  }));

  const mySet = new Set(myIds);
  const my = withCounts.filter((community) => mySet.has(community.id));
  const discover = withCounts
    .filter((community) => !mySet.has(community.id))
    .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));

  return { my, discover };
}

export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: userId, role: 'member' });

  if (error) throw error;
}

export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function fetchMembers(communityId: string): Promise<CommunityMember[]> {
  const { data: members, error } = await supabase
    .from('community_members')
    .select('*')
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true });
  if (error) throw error;

  const memberRows = (members ?? []) as CommunityMember[];
  if (memberRows.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', memberRows.map((m) => m.user_id));
  if (usersError) throw usersError;

  const usernameById = new Map<string, string>();
  for (const user of users ?? []) {
    usernameById.set(user.id, user.username);
  }

  return memberRows.map((member) => ({
    ...member,
    username: usernameById.get(member.user_id) ?? 'Unknown',
  }));
}

export async function removeMember(communityId: string, memberUserId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', memberUserId);

  if (error) throw error;
}

export async function deleteCommunity(communityId: string): Promise<void> {
  const { error } = await supabase.from('communities').delete().eq('id', communityId);
  if (error) throw error;
}

