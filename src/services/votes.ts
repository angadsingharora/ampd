import { supabase } from '../lib/supabase';
import type { Vote } from '../types';

export async function vote(
  userId: string,
  postId: string,
  value: 1 | -1,
): Promise<void> {
  const { data: existing } = await supabase
    .from('votes')
    .select('id, value')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();

  if (existing) {
    if (existing.value === value) {
      await supabase.from('votes').delete().eq('id', existing.id);
    } else {
      await supabase.from('votes').update({ value }).eq('id', existing.id);
    }
  } else {
    await supabase
      .from('votes')
      .insert({ user_id: userId, post_id: postId, value });
  }
}

export async function getUserVotes(
  userId: string,
  postIds: string[],
): Promise<Record<string, 1 | -1>> {
  if (postIds.length === 0) return {};

  const { data, error } = await supabase
    .from('votes')
    .select('post_id, value')
    .eq('user_id', userId)
    .in('post_id', postIds);

  if (error) throw error;

  const map: Record<string, 1 | -1> = {};
  for (const row of data ?? []) {
    map[row.post_id] = row.value as 1 | -1;
  }
  return map;
}
