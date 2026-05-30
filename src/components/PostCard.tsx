import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  onEdit?: (post: Post) => void;
  onBlock?: (post: Post) => void;
  onToggleSave?: (post: Post) => void;
  onMuteUser?: (post: Post) => void;
  saved?: boolean;
}

export default function PostCard({
  post,
  userId,
  currentVote = null,
  onEdit,
  onBlock,
  onToggleSave,
  onMuteUser,
  saved = false,
}: Props) {
  const isOwner = userId && post.user_id === userId;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={16} color="#fff" />
        </View>
        <Text style={styles.author}>
          {post.is_anonymous ? 'Anonymous' : (post.username ?? 'User')}
        </Text>
        {!post.is_anonymous && !isOwner && userId && onBlock ? (
          <TouchableOpacity onPress={() => onBlock(post)} style={styles.actionButton}>
            <Text style={styles.actionText}>Block</Text>
          </TouchableOpacity>
        ) : null}
        {!post.is_anonymous && !isOwner && userId && onMuteUser ? (
          <TouchableOpacity onPress={() => onMuteUser(post)} style={styles.actionButton}>
            <Text style={styles.actionText}>Mute</Text>
          </TouchableOpacity>
        ) : null}
        {isOwner && onEdit ? (
          <TouchableOpacity onPress={() => onEdit(post)} style={styles.actionButton}>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
      </View>

      <Text style={styles.body}>{post.text}</Text>

      <View style={styles.footer}>
        {onToggleSave ? (
          <TouchableOpacity onPress={() => onToggleSave(post)} style={styles.saveBtn}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color="#6C5CE7" />
            <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
        ) : null}
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
  actionButton: { marginRight: 10 },
  actionText: { color: '#6C5CE7', fontSize: 12, fontWeight: '700' },
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveBtnText: { color: '#6C5CE7', fontSize: 12, fontWeight: '700' },
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
