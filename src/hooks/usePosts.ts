import { useState, useEffect, useCallback } from 'react';
import { fetchPosts } from '../services/posts';
import { getUserVotes } from '../services/votes';
import type { Post, MapBounds, SortMode } from '../types';

interface UsePostsOptions {
  userId?: string;
  bounds?: MapBounds;
  sort?: SortMode;
  searchQuery?: string;
  campus?: string;
  blockedUserIds?: string[];
  mutedUserIds?: string[];
  mutedKeywords?: string[];
  limit?: number;
}

export function usePosts({
  userId,
  bounds,
  sort = 'recent',
  searchQuery,
  campus,
  blockedUserIds = [],
  mutedUserIds = [],
  mutedKeywords = [],
  limit = 20,
}: UsePostsOptions = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [votes, setVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyLocalFilters = useCallback((data: Post[]) => {
    const blocked = new Set(blockedUserIds);
    const mutedUsers = new Set(mutedUserIds);
    const keywords = mutedKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
    return data.filter((post) => {
      if (blocked.has(post.user_id) || mutedUsers.has(post.user_id)) return false;
      const text = post.text.toLowerCase();
      return keywords.every((kw) => !text.includes(kw));
    });
  }, [blockedUserIds.join(','), mutedUserIds.join(','), mutedKeywords.join(',')]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPosts({ bounds, sort, searchQuery, campus, limit, offset: 0 });
      setPosts(applyLocalFilters(data));
      setHasMore(data.length === limit);

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
  }, [userId, bounds?.minLat, bounds?.maxLat, bounds?.minLng, bounds?.maxLng, sort, searchQuery, campus, limit, applyLocalFilters]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = posts.length;
      const data = await fetchPosts({ bounds, sort, searchQuery, campus, limit, offset });
      const filtered = applyLocalFilters(data);
      setPosts((prev) => [...prev, ...filtered]);
      setHasMore(data.length === limit);
      if (userId && filtered.length > 0) {
        const postIds = filtered.map((p) => p.id);
        const userVotes = await getUserVotes(userId, postIds);
        setVotes((prev) => ({ ...prev, ...userVotes }));
      }
    } catch (err) {
      console.error('Failed to load more posts:', err);
      setError('Could not load more posts.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, hasMore, posts.length, bounds?.minLat, bounds?.maxLat, bounds?.minLng, bounds?.maxLng, sort, searchQuery, campus, limit, userId, applyLocalFilters]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, votes, loading, loadingMore, hasMore, refreshing, error, refresh, reload: load, loadMore };
}
