import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CAMPUS_DEFAULT_REGION } from '../lib/campus';
import { isLocationFresh } from '../lib/geo';
import { useAuth } from '../context/AuthContext';
import {
  getMyLocationSharingEnabled,
  getVisibleFriendLocations,
  setMyLocationSharingEnabled,
  subscribeToFriendLocations,
  updateMyLocation,
} from '../services/liveLocations';
import { fetchPostsInBounds } from '../services/posts';
import PostMarker from '../components/PostMarker';
import type { UserLocation, Post, MapBounds, RootStackParamList } from '../types';

const DEBOUNCE_MS = 500;

function getBoundsFromRegion(region: Region): MapBounds {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLng: region.longitude - region.longitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
  };
}

export default function MapScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<MapView | null>(null);
  const regionRef = useRef<Region>(CAMPUS_DEFAULT_REGION);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [friendLocations, setFriendLocations] = useState<UserLocation[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showFriends, setShowFriends] = useState(true);
  const [showPosts, setShowPosts] = useState(true);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [showFindFriends, setShowFindFriends] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staleFriendCount = useMemo(
    () =>
      friendLocations.filter((loc) => !isLocationFresh(loc.updated_at)).length,
    [friendLocations],
  );

  const loadPosts = useCallback(async (region?: Region) => {
    try {
      const bounds = getBoundsFromRegion(region ?? regionRef.current);
      const data = await fetchPostsInBounds(bounds);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load map posts:', err);
    }
  }, []);

  const loadMapData = useCallback(
    async (options: { asRefresh?: boolean } = {}) => {
      if (!currentUserId) return;

      if (options.asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [locations, isSharing] = await Promise.all([
          getVisibleFriendLocations(currentUserId),
          getMyLocationSharingEnabled(currentUserId),
          loadPosts(),
        ]);
        setFriendLocations(locations);
        setSharingEnabled(isSharing);
      } catch (err) {
        console.error('Map data load failed:', err);
        setError('Could not load map data.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId, loadPosts],
  );

  const publishCurrentLocation = useCallback(async () => {
    if (!currentUserId) throw new Error('Missing current user.');
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await updateMyLocation(currentUserId, pos.coords.latitude, pos.coords.longitude);
  }, [currentUserId]);

  const refresh = useCallback(async () => {
    try {
      if (sharingEnabled) await publishCurrentLocation();
      await loadMapData({ asRefresh: true });
    } catch (err) {
      console.error('Map refresh failed:', err);
      setError('Could not refresh map data.');
      setRefreshing(false);
    }
  }, [loadMapData, publishCurrentLocation, sharingEnabled]);

  const handleToggleSharing = useCallback(
    async (nextValue: boolean) => {
      if (!currentUserId) return;
      if (!nextValue) {
        try {
          await setMyLocationSharingEnabled(currentUserId, false);
          setSharingEnabled(false);
        } catch (err) {
          console.error('Failed to disable sharing:', err);
          setError('Could not disable location sharing.');
        }
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Location permission denied.');
        setSharingEnabled(false);
        return;
      }
      try {
        setSharingEnabled(true);
        await publishCurrentLocation();
        await loadMapData({ asRefresh: true });
      } catch (err) {
        console.error('Failed to enable sharing:', err);
        setSharingEnabled(false);
        setError('Could not share location right now.');
      }
    },
    [currentUserId, loadMapData, publishCurrentLocation],
  );

  const handleRegionChange = useCallback(
    (region: Region) => {
      regionRef.current = region;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        loadPosts(region);
      }, DEBOUNCE_MS);
    },
    [loadPosts],
  );

  const focusFriend = useCallback((friend: UserLocation) => {
    mapRef.current?.animateToRegion(
      {
        latitude: friend.lat,
        longitude: friend.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600,
    );
    setShowFindFriends(false);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    void loadMapData();
  }, [currentUserId, loadMapData]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToFriendLocations(currentUserId, setFriendLocations);
    return unsubscribe;
  }, [currentUserId]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={CAMPUS_DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChange}
      >
        {showPosts &&
          posts.map((post) => <PostMarker key={post.id} post={post} />)}

        {showFriends &&
          friendLocations.map((loc) => {
            const fresh = isLocationFresh(loc.updated_at);
            return (
              <Marker
                key={loc.user_id}
                coordinate={{ latitude: loc.lat, longitude: loc.lng }}
                title={loc.username ?? (fresh ? 'Friend' : 'Friend (stale)')}
                description={new Date(loc.updated_at).toLocaleTimeString()}
                pinColor={fresh ? '#1D9BF0' : '#9AA0A6'}
                opacity={fresh ? 1 : 0.55}
              />
            );
          })}
      </MapView>

      <View style={styles.controlsCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Posts</Text>
          <Switch value={showPosts} onValueChange={setShowPosts} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Friends</Text>
          <Switch value={showFriends} onValueChange={setShowFriends} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Share Location</Text>
          <Switch value={sharingEnabled} onValueChange={handleToggleSharing} />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={refresh}>
            <Text style={styles.actionButtonText}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => mapRef.current?.animateToRegion(CAMPUS_DEFAULT_REGION, 500)}
          >
            <Text style={styles.actionButtonText}>Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowFindFriends((prev) => !prev)}
          >
            <Text style={styles.actionButtonText}>
              {showFindFriends ? 'Hide Friends' : 'Find Friends'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legend}>
          Purple = posts. Blue = friends. Gray = stale ({staleFriendCount}).
        </Text>
      </View>

      {showFindFriends && (
        <View style={styles.findFriendsCard}>
          <Text style={styles.findFriendsTitle}>Find My Friends</Text>
          {friendLocations.length === 0 ? (
            <Text style={styles.emptyFriendsText}>
              No friend locations yet. Friends must be accepted and sharing location.
            </Text>
          ) : (
            <FlatList
              data={friendLocations}
              keyExtractor={(item) => item.user_id}
              style={styles.friendList}
              renderItem={({ item }) => {
                const fresh = isLocationFresh(item.updated_at);
                return (
                  <TouchableOpacity
                    style={styles.friendRow}
                    onPress={() => focusFriend(item)}
                  >
                    <View style={[styles.friendDot, !fresh && styles.friendDotStale]} />
                    <View style={styles.friendMeta}>
                      <Text style={styles.friendName}>
                        @{item.username ?? 'friend'}
                      </Text>
                      <Text style={styles.friendTimestamp}>
                        {fresh ? 'Live now' : 'Stale'} -{' '}
                        {new Date(item.updated_at).toLocaleTimeString()}
                      </Text>
                    </View>
                    <Ionicons name="locate" size={18} color="#6C5CE7" />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      )}

      {error && <Text style={styles.errorBanner}>{error}</Text>}

      {/* FAB - Create Post */}
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
  container: { flex: 1 },
  map: { flex: 1 },
  controlsCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 14, color: '#222', fontWeight: '600' },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  actionButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  legend: { fontSize: 11, color: '#555' },
  findFriendsCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 90,
    maxHeight: 250,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  findFriendsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyFriendsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  friendList: {
    maxHeight: 200,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomColor: '#EBEEF3',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D9BF0',
    marginRight: 10,
  },
  friendDotStale: {
    backgroundColor: '#9AA0A6',
  },
  friendMeta: {
    flex: 1,
  },
  friendName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  friendTimestamp: {
    fontSize: 11,
    color: '#6B7280',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  errorBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 80,
    backgroundColor: '#FDECEC',
    color: '#A61B1B',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    textAlign: 'center',
  },
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
