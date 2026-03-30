import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import VoteButtons from './VoteButtons';

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
  userId?: string;
  currentVote?: 1 | -1 | null;
}

export default function PostCard({ post, userId, currentVote = null }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={16} color="#fff" />
        </View>
        <Text style={styles.author}>
          {post.is_anonymous ? 'Anonymous' : (post.username ?? 'User')}
        </Text>
        <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
      </View>

      <Text style={styles.body}>{post.text}</Text>

      <View style={styles.footer}>
        {userId ? (
          <VoteButtons
            postId={post.id}
            userId={userId}
            score={post.score}
            currentVote={currentVote}
          />
        ) : (
          <View style={styles.scoreOnly}>
            <Ionicons name="arrow-up-outline" size={18} color="#666" />
            <Text style={styles.scoreText}>{post.score ?? 0}</Text>
          </View>
        )}
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
  },
  scoreOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
