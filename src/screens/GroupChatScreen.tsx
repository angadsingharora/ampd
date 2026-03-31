import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchGroupMessages, sendGroupMessage } from '../services/groupMessages';
import type { CommunitiesStackParamList, GroupMessage } from '../types';
import ChatBubble from '../components/ChatBubble';

type Props = NativeStackScreenProps<CommunitiesStackParamList, 'GroupChat'>;

export default function GroupChatScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { communityId, communityName } = route.params;
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: communityName });
  }, [communityName, navigation]);

  const load = useCallback(async () => {
    const rows = await fetchGroupMessages(communityId);
    setMessages(rows);
  }, [communityId]);

  useEffect(() => {
    load().catch((err) => console.error('Failed to load group messages:', err));
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`group-messages-${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `community_id=eq.${communityId}`,
        },
        async (payload) => {
          const inserted = payload.new as GroupMessage;
          const { data: sender } = await supabase
            .from('users')
            .select('username')
            .eq('id', inserted.sender_id)
            .single();
          const withSender: GroupMessage = {
            ...inserted,
            sender_username: sender?.username ?? 'Unknown',
          };
          setMessages((prev) => (prev.some((m) => m.id === withSender.id) ? prev : [...prev, withSender]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  const ordered = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [messages],
  );

  async function handleSend() {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: GroupMessage = {
      id: tempId,
      community_id: communityId,
      sender_id: user.id,
      text: trimmed,
      created_at: new Date().toISOString(),
      sender_username: user.username,
    };

    setMessages((prev) => [...prev, optimistic]);
    setText('');

    try {
      const inserted = await sendGroupMessage(communityId, user.id, trimmed);
      setMessages((prev) => prev.map((message) => (message.id === tempId ? { ...inserted, sender_username: user.username } : message)));
    } catch (err) {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      console.error('Failed to send group message:', err);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        data={ordered}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item }) => (
          <View>
            {item.sender_id !== user?.id ? (
              <Text style={styles.sender}>@{item.sender_username ?? 'Unknown'}</Text>
            ) : null}
            <ChatBubble text={item.text} isMine={item.sender_id === user?.id} timestamp={item.created_at} />
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message community..."
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  sender: { marginLeft: 16, marginTop: 10, marginBottom: -2, fontSize: 11, color: '#777' },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#222',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

