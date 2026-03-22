import { supabase } from '../lib/supabase';
import { Post } from '../types';

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, created_at, school_id, upvote_count')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Post[]) ?? [];
}

export async function createPost(content: string, schoolId: string): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      content,
      school_id: schoolId,
      upvote_count: 0,
    })
    .select('id, content, created_at, school_id, upvote_count')
    .single();

  if (error) throw error;
  return data as Post;
}
