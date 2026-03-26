import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { CAMPUS_DEFAULT_REGION } from '../lib/campus';
import { isLocationFresh } from '../lib/geo';
import { useAuth } from '../context/AuthContext';
import {
  getVisibleFriendLocations,
  setMyLocationSharingEnabled,
  subscribeToFriendLocations,
  updateMyLocation,
} from '../services/liveLocations';
import type { UserLocation } from '../types';

export default function MapScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const mapRef = useRef<MapView | null>(null);
  const regionRef = useRef<Region>(CAMPUS_DEFAULT_REGION);
  const [friendLocations, setFriendLocations] = useState<UserLocation[]>([]);
  const [showFriends, setShowFriends] = useState(true);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staleFriendCount = useMemo(
    () =>
      friendLocations.filter(
        (location) => !isLocationFresh(location.updated_at),
      ).length,
    [friendLocations],
  );

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
        const locations = await getVisibleFriendLocations(currentUserId);
        setFriendLocations(locations);
      } catch (err) {
        console.error('Map data load failed:', err);
        setError('Could not load map data. Pull to refresh and try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId],
  );

  const publishCurrentLocation = useCallback(async () => {
    if (!currentUserId) {
      throw new Error('Missing current user.');
    }

    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await updateMyLocation(
      currentUserId,
      currentPosition.coords.latitude,
      currentPosition.coords.longitude,
    );
  }, [currentUserId]);

  const refresh = useCallback(async () => {
    try {
      if (sharingEnabled) {
        await publishCurrentLocation();
      }
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
        setError('Location permission denied. Enable permission to share location.');
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

  useEffect(() => {
    if (!currentUserId) return;
    void loadMapData();
  }, [currentUserId, loadMapData]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToFriendLocations(currentUserId, setFriendLocations);
    return unsubscribe;
  }, [currentUserId]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={CAMPUS_DEFAULT_REGION}
        onRegionChangeComplete={(nextRegion) => {
          regionRef.current = nextRegion;
        }}
      >
        {showFriends &&
          friendLocations.map((location) => {
            const fresh = isLocationFresh(location.updated_at);
            return (
              <Marker
                key={location.user_id}
                coordinate={{
                  latitude: location.lat,
                  longitude: location.lng,
                }}
                title={location.username ?? (fresh ? 'Friend' : 'Friend (stale)')}
                description={new Date(location.updated_at).toLocaleTimeString()}
                pinColor={fresh ? '#1D9BF0' : '#9AA0A6'}
                opacity={fresh ? 1 : 0.55}
              />
            );
          })}
      </MapView>

      <View style={styles.controlsCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Friends</Text>
          <Switch value={showFriends} onValueChange={setShowFriends} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Share My Location</Text>
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
            <Text style={styles.actionButtonText}>Center Campus</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legend}>
          Blue pins = live friends. Gray pins = stale ({staleFriendCount}).
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      ) : null}

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
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
    marginBottom: 8,
  },
  label: { fontSize: 14, color: '#222', fontWeight: '600' },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  legend: { fontSize: 12, color: '#555' },
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
    bottom: 12,
    backgroundColor: '#FDECEC',
    color: '#A61B1B',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    textAlign: 'center',
  },
});
