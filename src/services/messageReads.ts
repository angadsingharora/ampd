import { supabase } from '../lib/supabase';

export async function setConversationRead(userId: string, partnerId: string): Promise<void> {
  const { error } = await supabase.from('message_reads').upsert({
    user_id: userId,
    partner_id: partnerId,
    last_read_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getUnreadConversationCount(userId: string, blockedPartnerIds: string[] = []): Promise<number> {
  const { data: incoming, error: incomingError } = await supabase
    .from('messages')
    .select('sender_id, created_at')
    .eq('receiver_id', userId);

  if (incomingError) throw incomingError;

  const { data: reads, error: readsError } = await supabase
    .from('message_reads')
    .select('partner_id, last_read_at')
    .eq('user_id', userId);

  if (readsError) throw readsError;

  const lastReadByPartner = new Map<string, string>();
  for (const row of reads ?? []) {
    lastReadByPartner.set(row.partner_id as string, row.last_read_at as string);
  }

  const blocked = new Set(blockedPartnerIds);
  const unreadPartners = new Set<string>();

  for (const row of incoming ?? []) {
    const senderId = row.sender_id as string;
    if (blocked.has(senderId)) continue;
    const createdAt = new Date(row.created_at as string).getTime();
    const readAt = lastReadByPartner.get(senderId);
    const readTime = readAt ? new Date(readAt).getTime() : 0;
    if (createdAt > readTime) unreadPartners.add(senderId);
  }

  return unreadPartners.size;
}
