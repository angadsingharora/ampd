import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';

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
  post: Post;
}

export default function PostCard({ post }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={16} color="#fff" />
        </View>
        <Text style={styles.author}>Anonymous</Text>
        <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
      </View>

      <Text style={styles.body}>{post.content}</Text>

      <View style={styles.footer}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{post.school_id}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="arrow-up-outline" size={18} color="#666" />
          <Text style={styles.statText}>{post.upvote_count ?? 0}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  author: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#222',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 4,
  },
});
