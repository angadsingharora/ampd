import { supabase } from '../lib/supabase';

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function getMyBlockedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.blocked_id as string);
}

export async function getUsersWhoBlockedMeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocked_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.blocker_id as string);
}

export async function getBlockRelations(userId: string): Promise<Set<string>> {
  const [blockedByMe, blockedMe] = await Promise.all([
    getMyBlockedUserIds(userId),
    getUsersWhoBlockedMeIds(userId),
  ]);
  return new Set([...blockedByMe, ...blockedMe]);
}
