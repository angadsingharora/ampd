import { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import PostCard from '../components/PostCard';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList, SortMode, MapBounds } from '../types';

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

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Showing all posts.');
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
      }
    })();
  }, []);

  const { posts, votes, loading, refreshing, error, refresh, reload } = usePosts({
    userId: user?.id,
    bounds,
    sort,
  });

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

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            userId={user?.id}
            currentVote={votes[item.id] ?? null}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {locationError && (
              <Text style={styles.locationWarning}>{locationError}</Text>
            )}
            {error && <Text style={styles.listErrorText}>{error}</Text>}

            <View style={styles.sortRow}>
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
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6C5CE7" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No posts nearby. Be the first!</Text>
          </View>
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
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  retryButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', marginTop: 12, fontSize: 16 },
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
