import { supabase } from '../lib/supabase';
import { Post } from '../types';

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Post[]) ?? [];
}

export async function createPost(
  text: string,
  userId: string,
  location: { lat: number; lng: number },
  options: { isAnonymous?: boolean } = {},
): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      text,
      lat: location.lat,
      lng: location.lng,
      is_anonymous: options.isAnonymous ?? true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Post;
}
