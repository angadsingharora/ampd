import { View, Text, StyleSheet } from 'react-native';
import { formatClockTime } from '../lib/time';

interface ChatBubbleProps {
  text: string;
  isMine: boolean;
  timestamp: string;
}

export default function ChatBubble({ text, isMine, timestamp }: ChatBubbleProps) {
  return (
    <View style={[styles.row, isMine ? styles.mineRow : styles.theirRow]}>
      <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirBubble]}>
        <Text style={[styles.text, isMine ? styles.mineText : styles.theirText]}>{text}</Text>
        <Text style={[styles.time, isMine ? styles.mineTime : styles.theirTime]}>
          {formatClockTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, paddingHorizontal: 12 },
  mineRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mineBubble: { backgroundColor: '#6C5CE7', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#EAEAEA', borderBottomLeftRadius: 4 },
  text: { fontSize: 15 },
  mineText: { color: '#fff' },
  theirText: { color: '#222' },
  time: { marginTop: 4, fontSize: 11 },
  mineTime: { color: 'rgba(255,255,255,0.85)' },
  theirTime: { color: '#777' },
});

