import { supabase } from '../lib/supabase';
import type { GroupConversation, GroupMessage } from '../types';

export async function sendGroupMessage(
  communityId: string,
  senderId: string,
  text: string,
): Promise<GroupMessage> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');

  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      community_id: communityId,
      sender_id: senderId,
      text: trimmed,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as GroupMessage;
}

export async function fetchGroupMessages(communityId: string): Promise<GroupMessage[]> {
  const { data: messages, error } = await supabase
    .from('group_messages')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (messages ?? []) as GroupMessage[];
  if (rows.length === 0) return [];

  const senderIds = Array.from(new Set(rows.map((message) => message.sender_id)));
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', senderIds);
  if (usersError) throw usersError;

  const usernameById = new Map<string, string>();
  for (const user of users ?? []) {
    usernameById.set(user.id, user.username);
  }

  return rows.map((message) => ({
    ...message,
    sender_username: usernameById.get(message.sender_id) ?? 'Unknown',
  }));
}

export async function fetchGroupConversationList(userId: string): Promise<GroupConversation[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId);
  if (membershipsError) throw membershipsError;

  const communityIds = (memberships ?? []).map((row) => row.community_id as string);
  if (communityIds.length === 0) return [];

  const { data: communities, error: communitiesError } = await supabase
    .from('communities')
    .select('id, name')
    .in('id', communityIds);
  if (communitiesError) throw communitiesError;

  const nameByCommunityId = new Map<string, string>();
  for (const community of communities ?? []) {
    nameByCommunityId.set(community.id, community.name);
  }

  const { data: messages, error: messagesError } = await supabase
    .from('group_messages')
    .select('*')
    .in('community_id', communityIds)
    .order('created_at', { ascending: false });
  if (messagesError) throw messagesError;

  const latestByCommunity = new Map<string, GroupMessage>();
  for (const message of (messages ?? []) as GroupMessage[]) {
    if (!latestByCommunity.has(message.community_id)) {
      latestByCommunity.set(message.community_id, message);
    }
  }

  const senderIds = Array.from(
    new Set(Array.from(latestByCommunity.values()).map((message) => message.sender_id)),
  );

  let senderById = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .in('id', senderIds);
    if (usersError) throw usersError;

    senderById = new Map<string, string>(
      (users ?? []).map((user) => [user.id as string, user.username as string]),
    );
  }

  return communityIds
    .map((communityId) => {
      const message = latestByCommunity.get(communityId);
      if (!message) return null;

      return {
        community_id: communityId,
        community_name: nameByCommunityId.get(communityId) ?? 'Community',
        last_message: message.text,
        last_sender_username: senderById.get(message.sender_id) ?? 'Unknown',
        last_message_at: message.created_at,
      } satisfies GroupConversation;
    })
    .filter((item): item is GroupConversation => item !== null)
    .sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );
}

