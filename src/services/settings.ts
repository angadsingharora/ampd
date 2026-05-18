import { supabase } from '../lib/supabase';

export async function getDarkModeSetting(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('dark_mode')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.dark_mode);
}

export async function setDarkModeSetting(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    dark_mode: enabled,
  });
  if (error) throw error;
}
