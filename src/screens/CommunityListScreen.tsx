import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import CommunityCard from '../components/CommunityCard';
import { fetchCommunities, joinCommunity } from '../services/communities';
import { fetchGroupConversationList } from '../services/groupMessages';
import {
  clearCommunitySearchDraft,
  getCommunitySearchDraft,
  saveCommunitySearchDraft,
} from '../services/postDrafts';
import type { CommunitiesStackParamList, Community } from '../types';

type Nav = NativeStackNavigationProp<CommunitiesStackParamList, 'CommunityList'>;

export default function CommunityListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [discover, setDiscover] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [communityData, recentGroups] = await Promise.all([
        fetchCommunities(user.id),
        fetchGroupConversationList(user.id),
      ]);

      const rank = new Map<string, number>();
      recentGroups.forEach((g, i) => rank.set(g.community_id, i));
      const sortedMy = [...communityData.my].sort((a, b) => {
        const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });

      setMyCommunities(sortedMy);
      setDiscover(communityData.discover);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load().catch((err) => console.error('Failed to load communities:', err));
  }, [load]);

  useEffect(() => {
    let mounted = true;
    async function loadDraft() {
      const draft = await getCommunitySearchDraft();
      if (!mounted || !draft.trim()) return;
      setQuery(draft);
      setDraftRestored(true);
    }
    loadDraft().catch((err) => console.error('Failed to restore search draft:', err));
    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveCommunitySearchDraft(query).catch((err) => console.error('Failed to save search draft:', err));
    }, 250);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [query]);

  const filteredMy = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myCommunities;
    return myCommunities.filter((c) => c.name.toLowerCase().includes(q));
  }, [myCommunities, query]);

  const filteredDiscover = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return discover;
    return discover.filter((c) => c.name.toLowerCase().includes(q));
  }, [discover, query]);

  async function handleJoin(communityId: string) {
    if (!user) return;
    await joinCommunity(communityId, user.id);
    await load();
  }

  async function handleDiscardDraft() {
    await clearCommunitySearchDraft();
    setQuery('');
    setDraftRestored(false);
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search communities..."
        placeholderTextColor="#999"
      />
      {draftRestored ? (
        <TouchableOpacity style={styles.discardRow} onPress={() => handleDiscardDraft().catch(console.error)}>
          <Text style={styles.discardText}>Discard restored search</Text>
        </TouchableOpacity>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#6C5CE7" />
      ) : (
        <FlatList
          data={filteredDiscover}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle}>My Communities</Text>
              {filteredMy.length === 0 ? (
                <Text style={styles.emptyText}>You have not joined any communities yet.</Text>
              ) : (
                filteredMy.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onPress={() => navigation.navigate('Community', { communityId: community.id })}
                  />
                ))
              )}
              <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Discover</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CommunityCard
              community={item}
              showJoinButton
              onJoin={() => handleJoin(item.id).catch((err) => console.error('Join failed:', err))}
              onPress={() => navigation.navigate('Community', { communityId: item.id })}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No communities found.</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCommunity')}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#222',
  },
  discardRow: {
    marginHorizontal: 12,
    marginTop: -6,
    marginBottom: 8,
  },
  discardText: { fontSize: 12, fontWeight: '700', color: '#C0392B' },
  listContent: { paddingHorizontal: 12, paddingBottom: 96 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginVertical: 10 },
  emptyText: { color: '#888', marginBottom: 10 },
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
  },
});
