import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vote as submitVote } from '../services/votes';

interface Props {
  postId: string;
  userId: string;
  score: number;
  currentVote: 1 | -1 | null;
}

export default function VoteButtons({ postId, userId, score, currentVote }: Props) {
  const [optimisticVote, setOptimisticVote] = useState<1 | -1 | null>(currentVote);
  const [optimisticScore, setOptimisticScore] = useState(score);
  const [busy, setBusy] = useState(false);

  async function handleVote(value: 1 | -1) {
    if (busy) return;
    setBusy(true);

    const prevVote = optimisticVote;
    const prevScore = optimisticScore;

    if (prevVote === value) {
      setOptimisticVote(null);
      setOptimisticScore(prevScore - value);
    } else {
      setOptimisticVote(value);
      const delta = prevVote ? value - prevVote : value;
      setOptimisticScore(prevScore + delta);
    }

    try {
      await submitVote(userId, postId, value);
    } catch (err) {
      console.error('Vote failed:', err);
      setOptimisticVote(prevVote);
      setOptimisticScore(prevScore);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => handleVote(1)} hitSlop={8}>
        <Ionicons
          name={optimisticVote === 1 ? 'arrow-up' : 'arrow-up-outline'}
          size={20}
          color={optimisticVote === 1 ? '#6C5CE7' : '#888'}
        />
      </TouchableOpacity>

      <Text style={[styles.score, optimisticScore > 0 && styles.positive, optimisticScore < 0 && styles.negative]}>
        {optimisticScore}
      </Text>

      <TouchableOpacity onPress={() => handleVote(-1)} hitSlop={8}>
        <Ionicons
          name={optimisticVote === -1 ? 'arrow-down' : 'arrow-down-outline'}
          size={20}
          color={optimisticVote === -1 ? '#E74C3C' : '#888'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    minWidth: 20,
    textAlign: 'center',
  },
  positive: { color: '#6C5CE7' },
  negative: { color: '#E74C3C' },
});
