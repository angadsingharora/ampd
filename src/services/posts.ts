import { supabase } from '../lib/supabase';
import type { Post, MapBounds, SortMode } from '../types';

interface FetchPostsOptions {
  bounds?: MapBounds;
  sort?: SortMode;
  limit?: number;
}

export async function fetchPosts(options: FetchPostsOptions = {}): Promise<Post[]> {
  const { bounds, sort = 'recent', limit = 50 } = options;

  let query = supabase.from('posts').select('*');

  if (bounds) {
    query = query
      .gte('lat', bounds.minLat)
      .lte('lat', bounds.maxLat)
      .gte('lng', bounds.minLng)
      .lte('lng', bounds.maxLng);
  }

  if (sort === 'top') {
    query = query.order('score', { ascending: false }).order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Post[]) ?? [];
}

export async function fetchPostsInBounds(
  bounds: MapBounds,
  limit = 50,
): Promise<Post[]> {
  return fetchPosts({ bounds, sort: 'recent', limit });
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
