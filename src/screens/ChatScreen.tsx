import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { fetchConversation, sendMessage } from '../services/messages';
import { supabase } from '../lib/supabase';
import ChatBubble from '../components/ChatBubble';
import type { ChatStackParamList, Message } from '../types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatScreen'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { userId: otherUserId, username } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: `@${username}` });
  }, [navigation, username]);

  const loadConversation = useCallback(async () => {
    if (!user) return;
    const data = await fetchConversation(user.id, otherUserId);
    setMessages(data);
  }, [otherUserId, user]);

  useEffect(() => {
    loadConversation().catch((err) => console.error('Failed to fetch conversation:', err));
  }, [loadConversation]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const incoming = payload.new as Message;
          const belongsToThread =
            (incoming.sender_id === otherUserId && incoming.receiver_id === user.id) ||
            (incoming.sender_id === user.id && incoming.receiver_id === otherUserId);
          if (!belongsToThread) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId, user]);

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
    const optimistic: Message = {
      id: tempId,
      sender_id: user.id,
      receiver_id: otherUserId,
      text: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setText('');

    try {
      const inserted = await sendMessage(user.id, otherUserId, trimmed);
      setMessages((prev) =>
        prev.map((message) => (message.id === tempId ? inserted : message)),
      );
    } catch (err) {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      console.error('Failed to send message:', err);
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
          <ChatBubble text={item.text} isMine={item.sender_id === user?.id} timestamp={item.created_at} />
        )}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      {!user ? <Text style={styles.warning}>Sign in to chat.</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { paddingTop: 8, paddingBottom: 10 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#222',
    backgroundColor: '#fff',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warning: {
    textAlign: 'center',
    fontSize: 12,
    color: '#B94A48',
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
});

