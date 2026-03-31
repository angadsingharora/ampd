import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '../types';

interface Props {
  post: Post;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function PostMarker({ post }: Props) {
  return (
    <Marker
      coordinate={{ latitude: post.lat, longitude: post.lng }}
      pinColor="#6C5CE7"
    >
      <Callout tooltip>
        <View style={styles.callout}>
          <View style={styles.header}>
            <Text style={styles.author}>
              {post.is_anonymous ? 'Anonymous' : (post.username ?? 'User')}
            </Text>
            <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
          </View>
          <Text style={styles.text} numberOfLines={4}>
            {post.text}
          </Text>
          <View style={styles.footer}>
            <Ionicons name="arrow-up" size={14} color="#6C5CE7" />
            <Text style={styles.score}>{post.score}</Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  callout: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  author: { fontSize: 13, fontWeight: '600', color: '#333' },
  time: { fontSize: 11, color: '#999' },
  text: { fontSize: 13, lineHeight: 18, color: '#222', marginBottom: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  score: { fontSize: 13, fontWeight: '700', color: '#6C5CE7' },
});
