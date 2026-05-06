import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { fetchLikesReceived, fetchMatches, unmatch, likeProfile } from '../services/dating';
import MatchCard from '../components/MatchCard';
import type { DatingLike, DatingMatch, ChatStackParamList } from '../types';

export default function MatchesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const [likes, setLikes] = useState<DatingLike[]>([]);
  const [matches, setMatches] = useState<DatingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLike, setExpandedLike] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [likesData, matchesData] = await Promise.all([
        fetchLikesReceived(user.id),
        fetchMatches(user.id),
      ]);
      const matchedUserIds = new Set(
        matchesData.map((m) => (m.user_a === user.id ? m.user_b : m.user_a)),
      );
      setLikes(likesData.filter((l) => !matchedUserIds.has(l.liker_id)));
      setMatches(matchesData);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleLikeBack(like: DatingLike) {
    if (!user) return;
    try {
      await likeProfile(user.id, like.liker_id, 'prompt', 0);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not like back.');
    }
  }

  function getLikedSectionLabel(like: DatingLike): string {
    const sectionNumber = like.liked_content_index + 1;
    return like.liked_content_type === 'photo'
      ? `Liked your photo #${sectionNumber}`
      : `Liked your prompt #${sectionNumber}`;
  }

  async function handleUnmatch(matchId: string) {
    Alert.alert('Unmatch', 'Are you sure? This will remove the match and chat access.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          try {
            await unmatch(matchId);
            setMatches((prev) => prev.filter((m) => m.id !== matchId));
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not unmatch.');
          }
        },
      },
    ]);
  }

  function handleOpenChat(match: DatingMatch) {
    const partnerId = match.user_a === user?.id ? match.user_b : match.user_a;
    const partnerName = match.partner_username ?? 'Match';

    navigation.getParent()?.navigate('Chat', {
      screen: 'ChatScreen',
      params: { userId: partnerId, username: partnerName },
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6C5CE7" />
      }
    >
      {/* Likes You */}
      <Text style={styles.sectionTitle}>Likes You ({likes.length})</Text>
      {likes.length === 0 ? (
        <Text style={styles.emptyText}>No likes yet. Keep browsing!</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.likesRow}>
          {likes.map((like) => {
            const isExpanded = expandedLike === like.id;
            return (
              <TouchableOpacity
                key={like.id}
                style={styles.likeCard}
                activeOpacity={0.8}
                onPress={() => setExpandedLike(isExpanded ? null : like.id)}
              >
                {like.liker_photos && like.liker_photos.length > 0 ? (
                  <Image
                    source={{ uri: like.liker_photos[0] }}
                    style={[styles.likePhoto, !isExpanded && styles.blurredPhoto]}
                    blurRadius={isExpanded ? 0 : 20}
                  />
                ) : (
                  <View style={[styles.likePhoto, styles.likePlaceholder]}>
                    <Ionicons name="person" size={28} color="#fff" />
                  </View>
                )}

                {isExpanded ? (
                  <View style={styles.likeExpanded}>
                    <Text style={styles.likeName}>@{like.liker_username}</Text>
                    <Text style={styles.likeMeta}>{getLikedSectionLabel(like)}</Text>
                    {like.comment && (
                      <Text style={styles.likeComment} numberOfLines={2}>
                        "{like.comment}"
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.likeBackBtn}
                      onPress={() => handleLikeBack(like)}
                    >
                      <Ionicons name="heart" size={14} color="#fff" />
                      <Text style={styles.likeBackText}>Like Back</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.likeOverlay}>
                    <Ionicons name="eye-off-outline" size={18} color="#fff" />
                    <Text style={styles.tapText}>Tap to reveal</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Matches */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Matches ({matches.length})
      </Text>
      {matches.length === 0 ? (
        <Text style={styles.emptyText}>No matches yet. Like someone to get started!</Text>
      ) : (
        matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onPress={() => handleOpenChat(match)}
            onUnmatch={() => handleUnmatch(match.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#999', marginBottom: 8 },
  likesRow: { marginBottom: 8 },
  likeCard: {
    width: 130,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  likePhoto: {
    width: '100%',
    height: 150,
  },
  blurredPhoto: {
    opacity: 0.8,
  },
  likePlaceholder: {
    backgroundColor: '#B8A9F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  tapText: { color: '#fff', fontSize: 11, marginTop: 2 },
  likeExpanded: {
    padding: 10,
  },
  likeName: { fontSize: 13, fontWeight: '600', color: '#222' },
  likeMeta: { fontSize: 11, color: '#7A7A7A', marginTop: 2 },
  likeComment: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  likeBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  likeBackText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
