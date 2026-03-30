import { useState, useEffect, useCallback } from 'react';
import { fetchPosts } from '../services/posts';
import { getUserVotes } from '../services/votes';
import type { Post, MapBounds, SortMode } from '../types';

interface UsePostsOptions {
  userId?: string;
  bounds?: MapBounds;
  sort?: SortMode;
}

export function usePosts({ userId, bounds, sort = 'recent' }: UsePostsOptions = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [votes, setVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPosts({ bounds, sort });
      setPosts(data);

      if (userId && data.length > 0) {
        const postIds = data.map((p) => p.id);
        const userVotes = await getUserVotes(userId, postIds);
        setVotes(userVotes);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Could not load the feed. Pull to refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, bounds?.minLat, bounds?.maxLat, bounds?.minLng, bounds?.maxLng, sort]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, votes, loading, refreshing, error, refresh, reload: load };
}
