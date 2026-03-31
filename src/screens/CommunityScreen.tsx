import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { deleteCommunity, fetchMembers, leaveCommunity, removeMember } from '../services/communities';
import type { CommunitiesStackParamList, Community, CommunityMember } from '../types';

type Props = NativeStackScreenProps<CommunitiesStackParamList, 'Community'>;

export default function CommunityScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { communityId } = route.params;
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('communities').select('*').eq('id', communityId).single();
    if (error) throw error;
    setCommunity(data as Community);
    const memberData = await fetchMembers(communityId);
    setMembers(memberData);
  }, [communityId]);

  useEffect(() => {
    load().catch((err) => console.error('Failed to load community:', err));
  }, [load]);

  const myMembership = useMemo(
    () => members.find((m) => m.user_id === user?.id),
    [members, user],
  );
  const isAdmin = myMembership?.role === 'admin' || community?.created_by === user?.id;

  async function handleLeave() {
    if (!user) return;
    await leaveCommunity(communityId, user.id);
    navigation.goBack();
  }

  async function handleDelete() {
    await deleteCommunity(communityId);
    navigation.goBack();
  }

  async function handleRemoveMember(memberUserId: string) {
    await removeMember(communityId, memberUserId);
    await load();
  }

  if (!community) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.name}>{community.name}</Text>
        {community.description ? <Text style={styles.description}>{community.description}</Text> : null}
        <Text style={styles.meta}>{members.length} members</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.navigate('GroupChat', {
              communityId,
              communityName: community.name,
            })
          }
        >
          <Text style={styles.primaryText}>Enter Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleLeave().catch(console.error)}>
          <Text style={styles.secondaryText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {isAdmin ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('Delete community?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => handleDelete().catch(console.error) },
            ])
          }
        >
          <Text style={styles.deleteText}>Delete Community</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.membersTitle}>Members</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.memberText}>
              @{item.username ?? 'Unknown'} {item.role === 'admin' ? '(admin)' : ''}
            </Text>
            {isAdmin && item.user_id !== user?.id ? (
              <TouchableOpacity onPress={() => handleRemoveMember(item.user_id).catch(console.error)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#888' },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  name: { fontSize: 22, fontWeight: '800', color: '#222' },
  description: { color: '#555', marginTop: 6, fontSize: 14 },
  meta: { color: '#888', marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryText: { color: '#333', fontWeight: '700' },
  deleteBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FCEBEC',
  },
  deleteText: { color: '#C0392B', fontWeight: '700' },
  membersTitle: { marginTop: 14, marginBottom: 8, fontSize: 17, fontWeight: '700', color: '#222' },
  memberRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberText: { color: '#222' },
  removeText: { color: '#C0392B', fontWeight: '700' },
});

