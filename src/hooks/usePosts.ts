import { useState, useEffect, useCallback } from 'react';
import { fetchPosts } from '../services/posts';
import { Post } from '../types';

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPosts();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Could not load the feed. Pull to refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, refreshing, error, refresh, reload: load };
}
