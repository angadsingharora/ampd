import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FriendWithProfile } from '../services/friends';

interface Props {
  friend: FriendWithProfile;
  onAccept?: (friendId: string) => void;
  onDecline?: (friendId: string) => void;
}

export default function FriendListItem({ friend, onAccept, onDecline }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={16} color="#fff" />
      </View>
      <View style={styles.info}>
        <Text style={styles.username}>@{friend.username}</Text>
        {friend.direction === 'outgoing' && (
          <Text style={styles.statusText}>Requested</Text>
        )}
        {friend.direction === 'mutual' && (
          <Text style={styles.acceptedText}>Friends</Text>
        )}
      </View>

      {friend.direction === 'incoming' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept?.(friend.userId)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => onDecline?.(friend.userId)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600', color: '#222' },
  statusText: { fontSize: 12, color: '#F39C12', marginTop: 2 },
  acceptedText: { fontSize: 12, color: '#27AE60', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  declineButton: {
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  declineButtonText: { color: '#666', fontSize: 13, fontWeight: '600' },
});
