import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Community } from '../types';

interface CommunityCardProps {
  community: Community;
  onPress?: () => void;
  onJoin?: () => void;
  showJoinButton?: boolean;
  distanceLabel?: string;
}

export default function CommunityCard({
  community,
  onPress,
  onJoin,
  showJoinButton = false,
  distanceLabel,
}: CommunityCardProps) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.name}>{community.name}</Text>
        {community.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {community.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{community.member_count ?? 0} members</Text>
          {distanceLabel ? <Text style={styles.meta}>{distanceLabel}</Text> : null}
        </View>
      </View>
      {showJoinButton && onJoin ? (
        <TouchableOpacity style={styles.joinBtn} onPress={onJoin}>
          <Text style={styles.joinText}>Join</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDEDED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#222' },
  description: { fontSize: 13, color: '#666', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  meta: { fontSize: 12, color: '#888' },
  joinBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  joinText: { color: '#fff', fontWeight: '600' },
});

