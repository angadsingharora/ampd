import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { fetchConversationList } from '../services/messages';
import { formatRelativeTime } from '../lib/time';
import type { ChatStackParamList, Conversation } from '../types';

type ChatNav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

export default function ChatListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<ChatNav>();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await fetchConversationList(user.id);
    setRows(data);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load().catch((err) => console.error('Failed to load conversation list:', err));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.partner_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>No conversations yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate('ChatScreen', {
                userId: item.partner_id,
                username: item.partner_username,
              })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.partner_username[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <View style={styles.topRow}>
                <Text style={styles.username}>@{item.partner_username}</Text>
                <Text style={styles.time}>{formatRelativeTime(item.last_message_at)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.preview}>
                {item.last_message}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontWeight: '700', color: '#6C5CE7' },
  rowBody: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { fontSize: 15, fontWeight: '700', color: '#222' },
  time: { fontSize: 12, color: '#888' },
  preview: { marginTop: 4, fontSize: 13, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999' },
});

