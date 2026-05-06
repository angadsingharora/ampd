import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DatingMatch } from '../types';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  match: DatingMatch;
  onPress: () => void;
  onUnmatch: () => void;
}

export default function MatchCard({ match, onPress, onUnmatch }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {match.partner_photo ? (
        <Image source={{ uri: match.partner_photo }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.placeholderPhoto]}>
          <Ionicons name="person" size={24} color="#fff" />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name}>@{match.partner_username}</Text>
        <Text style={styles.time}>Matched {timeAgo(match.created_at)}</Text>
      </View>

      <TouchableOpacity style={styles.chatButton} onPress={onPress} hitSlop={8}>
        <Ionicons name="chatbubble-outline" size={20} color="#6C5CE7" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.unmatchButton} onPress={onUnmatch} hitSlop={8}>
        <Ionicons name="close-circle-outline" size={20} color="#ccc" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  placeholderPhoto: {
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#222' },
  time: { fontSize: 12, color: '#999', marginTop: 2 },
  chatButton: { padding: 8, marginRight: 4 },
  unmatchButton: { padding: 8 },
});
