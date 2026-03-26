import { supabase } from './supabase';

const FALLBACK_DEV_USER_ID =
  process.env.EXPO_PUBLIC_DEV_USER_ID ?? '00000000-0000-0000-0000-000000000001';

export async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  let authUserId: string | undefined = data.user?.id;

  if (!authUserId) {
    const { data: anonData, error } = await supabase.auth.signInAnonymously();
    if (!error) {
      authUserId = anonData.user?.id;
    }
  }

  if (authUserId) {
    return authUserId;
  }

  return FALLBACK_DEV_USER_ID;
}
