import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DatingCard from '../components/DatingCard';
import { fetchFeed, likeProfile, skipProfile } from '../services/dating';
import type { DatingProfile, DatingStackParamList } from '../types';

type Props = NativeStackScreenProps<DatingStackParamList, 'DatingFeed'>;

export default function DatingFeedScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [feed, setFeed] = useState<DatingProfile[]>([]);
  const [commentsByUser, setCommentsByUser] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) return;

    const { data: myProfile } = await supabase
      .from('dating_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const has = Boolean(myProfile?.id);
    setHasProfile(has);
    if (!has) {
      setFeed([]);
      return;
    }

    const rows = await fetchFeed(user.campus, user.id);
    setFeed(rows);
  }, [user]);

  useEffect(() => {
    load().catch((err) => console.error('Failed to load dating feed:', err));
  }, [load]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Matches')} style={{ marginRight: 8 }}>
          <Ionicons name="heart" size={24} color="#6C5CE7" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const current = useMemo(() => feed[0], [feed]);

  function popCurrent() {
    setFeed((prev) => prev.slice(1));
  }

  async function handleLike(contentType: 'photo' | 'prompt', contentIndex: number) {
    if (!user || !current) return;
    try {
      await likeProfile(
        user.id,
        current.user_id,
        contentType,
        contentIndex,
        commentsByUser[current.user_id],
      );
      popCurrent();
    } catch (err: any) {
      Alert.alert('Like failed', err?.message ?? 'Could not send like.');
    }
  }

  function handleSkip() {
    skipProfile();
    popCurrent();
  }

  if (hasProfile === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.ctaTitle}>Create your dating profile first</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('DatingProfileSetup')}>
          <Text style={styles.ctaText}>Set Up Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No new profiles right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[current]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DatingCard
            profile={item}
            comment={commentsByUser[item.user_id] ?? ''}
            onChangeComment={(value) =>
              setCommentsByUser((prev) => ({ ...prev, [item.user_id]: value }))
            }
            onLikeSection={handleLike}
          />
        )}
        contentContainerStyle={styles.content}
      />
      <View style={styles.actions}>
        <Text style={styles.hintText}>Tap the heart on a photo or prompt to like that specific section.</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() =>
            handleLike(
              current.photos.length > 0 ? 'photo' : 'prompt',
              0,
            ).catch(console.error)
          }
        >
          <Text style={styles.likeText}>Quick Like</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 12, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 14 },
  ctaBtn: { backgroundColor: '#6C5CE7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  ctaText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: '#888' },
  actions: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hintText: { width: '100%', color: '#666', fontSize: 12, marginBottom: 2 },
  skipBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: { color: '#444', fontWeight: '700' },
  likeBtn: {
    flex: 1,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  likeText: { color: '#fff', fontWeight: '700' },
});
