import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PromptAnswerProps {
  prompt: string;
  answer: string;
  onLike: () => void;
}

export default function PromptAnswer({ prompt, answer, onLike }: PromptAnswerProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.prompt}>{prompt}</Text>
        <TouchableOpacity onPress={onLike}>
          <Ionicons name="heart-outline" size={20} color="#E74C3C" />
        </TouchableOpacity>
      </View>
      <Text style={styles.answer}>{answer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 12,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  prompt: { fontSize: 13, fontWeight: '700', color: '#666', flex: 1 },
  answer: { marginTop: 8, fontSize: 16, color: '#222', lineHeight: 22 },
});

