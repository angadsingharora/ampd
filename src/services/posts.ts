import { supabase } from '../lib/supabase';
import type { Post, MapBounds, SortMode } from '../types';

interface FetchPostsOptions {
  bounds?: MapBounds;
  sort?: SortMode;
  limit?: number;
  offset?: number;
  searchQuery?: string;
  campus?: string;
}

export async function fetchPosts(options: FetchPostsOptions = {}): Promise<Post[]> {
  const { bounds, sort = 'recent', limit = 20, offset = 0, searchQuery, campus } = options;

  let query = supabase.from('posts').select('*, users(username, campus)');

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

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  const mapped = (data ?? []).map((row: any) => ({
    ...row,
    username: row.users?.username ?? undefined,
    campus: row.users?.campus ?? undefined,
  })) as Post[];

  return mapped.filter((post) => {
    const matchesText =
      !searchQuery || post.text.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesCampus = !campus || (post.campus ?? '').toLowerCase() === campus.toLowerCase();
    return matchesText && matchesCampus;
  });
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

export async function updatePostText(postId: string, userId: string, text: string): Promise<Post> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Post text cannot be empty.');

  const { data, error } = await supabase
    .from('posts')
    .update({ text: trimmed })
    .eq('id', postId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Post;
}
