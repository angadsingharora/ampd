import { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import PostCard from '../components/PostCard';
import CampusPulseCard from '../components/CampusPulseCard';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import { blockUser, getBlockRelations, unblockUser } from '../services/blocks';
import {
  clearFeedPreferencesDraft,
  FeedPreset,
  getFeedMuteDraft,
  getFeedPreferencesDraft,
  getFeedPresets,
  getSavedPostIds,
  saveFeedPreferencesDraft,
  saveFeedMuteDraft,
  saveFeedPresets,
  saveSavedPostIds,
} from '../services/postDrafts';
import type { RootStackParamList, SortMode, MapBounds, Post } from '../types';

const FEED_RADIUS_MILES = 2;
const milesToDegLat = (miles: number) => miles / 69.0;
const milesToDegLng = (miles: number, lat: number) =>
  miles / (69.0 * Math.cos(lat * (Math.PI / 180)));

function boundsFromLocation(lat: number, lng: number, radiusMiles: number): MapBounds {
  const dLat = milesToDegLat(radiusMiles);
  const dLng = milesToDegLng(radiusMiles, lat);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

export default function FeedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sort, setSort] = useState<SortMode>('recent');
  const [bounds, setBounds] = useState<MapBounds | undefined>(undefined);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [debouncedCampusFilter, setDebouncedCampusFilter] = useState('');
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [feedScope, setFeedScope] = useState<'nearby' | 'global'>('nearby');
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);
  const [mutedKeywords, setMutedKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [presets, setPresets] = useState<FeedPreset[]>([]);

  useEffect(() => {
    if (!user) return;
    getBlockRelations(user.id)
      .then((ids) => setBlockedUserIds([...ids]))
      .catch((err) => console.error('Failed to load block list:', err));
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const draft = await getFeedPreferencesDraft();
        if (!mounted || !draft) return;
        setSearchQuery(draft.searchQuery);
        setCampusFilter(draft.campusFilter);
        setSort(draft.sort);
        setFeedScope(draft.scope);
        const [saved, muteDraft, savedPresets] = await Promise.all([
          getSavedPostIds(),
          getFeedMuteDraft(),
          getFeedPresets(),
        ]);
        setSavedPostIds(saved);
        setMutedUserIds(muteDraft.userIds);
        setMutedKeywords(muteDraft.keywords);
        setPresets(savedPresets);
      } catch (err) {
        console.error('Failed to load feed preferences draft', err);
      } finally {
        if (mounted) setLoadingPreferences(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loadingPreferences) return;
    const timer = setTimeout(() => {
      saveFeedPreferencesDraft({
        searchQuery,
        campusFilter,
        sort,
        scope: feedScope,
      }).catch((err) => console.error('Failed to save feed preferences draft', err));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, campusFilter, sort, feedScope, loadingPreferences]);

  useEffect(() => {
    if (loadingPreferences) return;
    saveSavedPostIds(savedPostIds).catch((err) => console.error('Failed to save bookmarks', err));
  }, [savedPostIds, loadingPreferences]);

  useEffect(() => {
    if (loadingPreferences) return;
    saveFeedMuteDraft({ userIds: mutedUserIds, keywords: mutedKeywords }).catch((err) =>
      console.error('Failed to save mute settings', err),
    );
  }, [mutedUserIds, mutedKeywords, loadingPreferences]);

  useEffect(() => {
    if (loadingPreferences) return;
    saveFeedPresets(presets).catch((err) => console.error('Failed to save presets', err));
  }, [presets, loadingPreferences]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Showing all posts.');
        setFeedScope('global');
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setBounds(
          boundsFromLocation(pos.coords.latitude, pos.coords.longitude, FEED_RADIUS_MILES),
        );
      } catch {
        setLocationError('Could not get location. Showing all posts.');
        setFeedScope('global');
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCampusFilter(campusFilter), 350);
    return () => clearTimeout(timer);
  }, [campusFilter]);

  const { posts, votes, loading, loadingMore, hasMore, refreshing, error, refresh, reload, loadMore } = usePosts({
    userId: user?.id,
    bounds: feedScope === 'nearby' ? bounds : undefined,
    sort,
    searchQuery: debouncedSearchQuery,
    campus: debouncedCampusFilter.trim() || undefined,
    blockedUserIds,
    mutedUserIds,
    mutedKeywords,
  });
  const visiblePosts = savedOnly ? posts.filter((post) => savedPostIds.includes(post.id)) : posts;

  const hasActiveFilters = Boolean(
    debouncedSearchQuery.trim() || debouncedCampusFilter.trim() || sort !== 'recent',
  );

  const clearFilters = () => {
    setSearchQuery('');
    setCampusFilter('');
    setSort('recent');
    setFeedScope('nearby');
    setSavedOnly(false);
    clearFeedPreferencesDraft().catch((err) =>
      console.error('Failed to clear feed preferences draft', err),
    );
  };
  const isFilteredEmpty = posts.length === 0 && hasActiveFilters;
  const isSavedFilteredEmpty = visiblePosts.length === 0 && savedOnly;

  useEffect(() => {
    return navigation.addListener('focus', reload);
  }, [navigation, reload]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reload}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleSavePost = (post: Post) => {
    setSavedPostIds((prev) =>
      prev.includes(post.id) ? prev.filter((id) => id !== post.id) : [...prev, post.id],
    );
  };

  const applyPreset = (preset: FeedPreset) => {
    setSearchQuery(preset.searchQuery);
    setCampusFilter(preset.campusFilter);
    setSort(preset.sort);
    setFeedScope(preset.scope);
  };

  const handleSaveCurrentPreset = () => {
    const next: FeedPreset = {
      id: `${Date.now()}`,
      name: `Preset ${presets.length + 1}`,
      searchQuery,
      campusFilter,
      sort,
      scope: feedScope,
    };
    setPresets((prev) => [next, ...prev].slice(0, 6));
  };

  const addKeywordMute = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (!keyword) return;
    setMutedKeywords((prev) => [...new Set([...prev, keyword])]);
    setKeywordInput('');
  };

  const renderPost: ListRenderItem<Post> = ({ item }) => (
    <PostCard
      post={item}
      userId={user?.id}
      saved={savedPostIds.includes(item.id)}
      onToggleSave={toggleSavePost}
      onMuteUser={(post) => {
        if (!post.is_anonymous) setMutedUserIds((prev) => [...new Set([...prev, post.user_id])]);
      }}
      currentVote={votes[item.id] ?? null}
      onEdit={(post) => navigation.navigate('EditPost', { postId: post.id, initialText: post.text })}
      onBlock={(post) => {
        if (!user) return;
        Alert.alert('Block user?', 'You will no longer see this user in feed or chats.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                await blockUser(user.id, post.user_id);
                setBlockedUserIds((prev) => [...new Set([...prev, post.user_id])]);
                Alert.alert('User blocked', 'Tap Undo to unblock.', [
                  {
                    text: 'Undo',
                    onPress: async () => {
                      await unblockUser(user.id, post.user_id);
                      setBlockedUserIds((prev) => prev.filter((id) => id !== post.user_id));
                    },
                  },
                  { text: 'OK' },
                ]);
              } catch (err) {
                console.error('Failed to block user:', err);
              }
            },
          },
        ]);
      }}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        onEndReachedThreshold={0.35}
        onEndReached={loadMore}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {locationError && (
              <Text style={styles.locationWarning}>{locationError}</Text>
            )}
            {error && <Text style={styles.listErrorText}>{error}</Text>}
            <CampusPulseCard
              posts={posts}
              scope={feedScope}
              onScopeChange={setFeedScope}
              radiusMiles={FEED_RADIUS_MILES}
              nearbyEnabled={Boolean(bounds)}
            />

            <View style={styles.sortRow}>
              <View style={styles.feedMetaRow}>
                <Text style={styles.feedMetaText}>
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'} | {feedScope} | {sort}
                </Text>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Campus filter (e.g. ucla.edu)"
                value={campusFilter}
                onChangeText={setCampusFilter}
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.sortButton, sort === 'recent' && styles.sortButtonActive]}
                onPress={() => setSort('recent')}
              >
                <Text style={[styles.sortText, sort === 'recent' && styles.sortTextActive]}>
                  Recent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sort === 'top' && styles.sortButtonActive]}
                onPress={() => setSort('top')}
              >
                <Text style={[styles.sortText, sort === 'top' && styles.sortTextActive]}>
                  Top
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, savedOnly && styles.sortButtonActive]}
                onPress={() => setSavedOnly((prev) => !prev)}
              >
                <Text style={[styles.sortText, savedOnly && styles.sortTextActive]}>Saved</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} onPress={handleSaveCurrentPreset}>
                <Text style={styles.clearButtonText}>Save preset</Text>
              </TouchableOpacity>
              {presets.length > 0 && (
                <View style={styles.presetRow}>
                  {presets.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={styles.presetChip}
                      onPress={() => applyPreset(preset)}
                      onLongPress={() =>
                        setPresets((prev) => prev.filter((p) => p.id !== preset.id))
                      }
                    >
                      <Text style={styles.presetText}>{preset.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.searchInput}
                placeholder="Mute keyword (press enter)"
                value={keywordInput}
                onChangeText={setKeywordInput}
                onSubmitEditing={addKeywordMute}
                placeholderTextColor="#999"
              />
              {mutedKeywords.length > 0 && (
                <View style={styles.presetRow}>
                  {mutedKeywords.map((keyword) => (
                    <TouchableOpacity
                      key={keyword}
                      style={styles.muteChip}
                      onPress={() =>
                        setMutedKeywords((prev) => prev.filter((k) => k !== keyword))
                      }
                    >
                      <Text style={styles.muteChipText}>#{keyword} x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {mutedUserIds.length > 0 && (
                <View style={styles.presetRow}>
                  {mutedUserIds.map((userId) => (
                    <TouchableOpacity
                      key={userId}
                      style={styles.muteChip}
                      onPress={() =>
                        setMutedUserIds((prev) => prev.filter((id) => id !== userId))
                      }
                    >
                      <Text style={styles.muteChipText}>Muted user {userId.slice(0, 8)} x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}              {hasActiveFilters && (
                <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                  <Text style={styles.clearButtonText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6C5CE7" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {isSavedFilteredEmpty
                ? 'No saved posts yet.'
                : isFilteredEmpty
                ? 'No posts match your current filters.'
                : 'No posts nearby. Be the first!'}
            </Text>
            {isFilteredEmpty && (
              <TouchableOpacity style={styles.emptyClearButton} onPress={clearFilters}>
                <Text style={styles.emptyClearText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          hasMore && !savedOnly ? (
            <View style={styles.footerLoader}>
              {loadingMore ? <ActivityIndicator size="small" color="#6C5CE7" /> : null}
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 80 },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  listErrorText: {
    color: '#C0392B',
    fontSize: 13,
    marginBottom: 10,
  },
  locationWarning: {
    backgroundColor: '#FFF8E1',
    color: '#F57F17',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  sortRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  feedMetaRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFEAFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  feedMetaText: {
    color: '#5B4BC4',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
  },
  sortButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  sortText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  sortTextActive: {
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F1F1',
    borderWidth: 1,
    borderColor: '#DDD',
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    backgroundColor: '#EEE8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  presetText: { color: '#5B4BC4', fontWeight: '600', fontSize: 12 },
  muteChip: {
    backgroundColor: '#FFEDEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  muteChipText: { color: '#B03A2E', fontWeight: '600', fontSize: 12 },
  retryButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', marginTop: 12, fontSize: 16 },
  emptyClearButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
  },
  emptyClearText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  footerLoader: { paddingVertical: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});


