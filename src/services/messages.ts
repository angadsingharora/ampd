import { supabase } from '../lib/supabase';
import type { Conversation, Message } from '../types';

export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string,
): Promise<Message> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');

  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, text: trimmed })
    .select('*')
    .single();

  if (error) throw error;
  return data as Message;
}

export async function fetchConversation(
  userId: string,
  otherUserId: string,
): Promise<Message[]> {
  const { data: outgoing, error: outgoingError } = await supabase
    .from('messages')
    .select('*')
    .eq('sender_id', userId)
    .eq('receiver_id', otherUserId);

  if (outgoingError) throw outgoingError;

  const { data: incoming, error: incomingError } = await supabase
    .from('messages')
    .select('*')
    .eq('sender_id', otherUserId)
    .eq('receiver_id', userId);

  if (incomingError) throw incomingError;

  return ([...(outgoing ?? []), ...(incoming ?? [])] as Message[]).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export async function fetchConversationList(userId: string): Promise<Conversation[]> {
  const { data: sent, error: sentError } = await supabase
    .from('messages')
    .select('*')
    .eq('sender_id', userId);
  if (sentError) throw sentError;

  const { data: received, error: receivedError } = await supabase
    .from('messages')
    .select('*')
    .eq('receiver_id', userId);
  if (receivedError) throw receivedError;

  const allMessages = ([...(sent ?? []), ...(received ?? [])] as Message[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const latestByPartner = new Map<string, Message>();
  for (const message of allMessages) {
    const partnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
    if (!latestByPartner.has(partnerId)) {
      latestByPartner.set(partnerId, message);
    }
  }

  const partnerIds = Array.from(latestByPartner.keys());
  if (partnerIds.length === 0) return [];

  const blockedPartnerIds = new Set<string>();

  const [{ data: blockedByMe, error: blockedByMeError }, { data: blockedMe, error: blockedMeError }] = await Promise.all([
    supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .in('blocked_id', partnerIds),
    supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', userId)
      .in('blocker_id', partnerIds),
  ]);
  if (blockedByMeError) throw blockedByMeError;
  if (blockedMeError) throw blockedMeError;

  for (const row of blockedByMe ?? []) {
    blockedPartnerIds.add(row.blocked_id as string);
  }
  for (const row of blockedMe ?? []) {
    blockedPartnerIds.add(row.blocker_id as string);
  }

  const filteredPartnerIds = partnerIds.filter((id) => !blockedPartnerIds.has(id));
  if (filteredPartnerIds.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', filteredPartnerIds);
  if (usersError) throw usersError;

  const { data: reads, error: readsError } = await supabase
    .from('message_reads')
    .select('partner_id, last_read_at')
    .eq('user_id', userId);
  if (readsError) throw readsError;

  const readAtByPartner = new Map<string, string>();
  for (const row of reads ?? []) {
    readAtByPartner.set(row.partner_id as string, row.last_read_at as string);
  }

  const usernameById = new Map<string, string>();
  for (const user of users ?? []) {
    usernameById.set(user.id, user.username);
  }

  const rows: Conversation[] = filteredPartnerIds.flatMap((partnerId) => {
      const latest = latestByPartner.get(partnerId);
      if (!latest) return [];
      const readAt = readAtByPartner.get(partnerId);
      const unread =
        latest.sender_id === partnerId &&
        (!readAt || new Date(latest.created_at).getTime() > new Date(readAt).getTime());
      return [{
        partner_id: partnerId,
        partner_username: usernameById.get(partnerId) ?? 'Unknown',
        last_message: latest.text,
        last_message_at: latest.created_at,
        unread_count: unread ? 1 : 0,
      }];
    });

  return rows.sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );
}
