import { View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../components/PostCard';
import { usePosts } from '../hooks/usePosts';
import type { RootStackParamList } from '../types';

export default function FeedScreen() {
  const { posts, loading, refreshing, error, refresh, reload } = usePosts();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          error ? <Text style={styles.listErrorText}>{error}</Text> : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6C5CE7" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
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
