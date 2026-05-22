import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Post } from '../types';

type FeedScope = 'nearby' | 'global';

interface CampusPulseCardProps {
  posts: Post[];
  scope: FeedScope;
  onScopeChange: (scope: FeedScope) => void;
  radiusMiles: number;
  nearbyEnabled: boolean;
}

function topKeywords(posts: Post[]) {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    const words = post.text
      .toLowerCase()
      .match(/[a-z0-9']+/g)
      ?.filter((word) => word.length >= 4) ?? [];
    for (const word of words) {
      if (['this', 'that', 'with', 'have', 'from', 'your', 'about'].includes(word)) continue;
      counts[word] = (counts[word] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

export default function CampusPulseCard({
  posts,
  scope,
  onScopeChange,
  radiusMiles,
  nearbyEnabled,
}: CampusPulseCardProps) {
  const metrics = useMemo(() => {
    if (!posts.length) {
      return {
        total: 0,
        avgScore: 0,
        peakHourLabel: '--',
        trendWords: [] as string[],
      };
    }

    const hourCounts: Record<number, number> = {};
    let scoreSum = 0;
    for (const post of posts) {
      const hour = new Date(post.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
      scoreSum += post.score;
    }

    const [peakHour] = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakNum = Number(peakHour);
    const ampm = peakNum >= 12 ? 'PM' : 'AM';
    const twelveHour = peakNum % 12 || 12;

    return {
      total: posts.length,
      avgScore: Math.round((scoreSum / posts.length) * 10) / 10,
      peakHourLabel: `${twelveHour}${ampm}`,
      trendWords: topKeywords(posts),
    };
  }, [posts]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Campus Pulse</Text>
      <Text style={styles.subtitle}>
        {scope === 'nearby' ? `Inside ${radiusMiles}mi radius` : 'Across all campuses'}
      </Text>

      <View style={styles.switchRow}>
        <TouchableOpacity
          style={[
            styles.scopeButton,
            scope === 'nearby' && styles.scopeButtonActive,
            !nearbyEnabled && styles.scopeButtonDisabled,
          ]}
          onPress={() => onScopeChange('nearby')}
          disabled={!nearbyEnabled}
        >
          <Text style={[styles.scopeText, scope === 'nearby' && styles.scopeTextActive]}>Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeButton, scope === 'global' && styles.scopeButtonActive]}
          onPress={() => onScopeChange('global')}
        >
          <Text style={[styles.scopeText, scope === 'global' && styles.scopeTextActive]}>Global</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{metrics.total}</Text>
          <Text style={styles.metricLabel}>Posts</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{metrics.avgScore}</Text>
          <Text style={styles.metricLabel}>Avg score</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{metrics.peakHourLabel}</Text>
          <Text style={styles.metricLabel}>Peak hour</Text>
        </View>
      </View>

      <Text style={styles.trendLine}>
        {metrics.trendWords.length ? `Trending: ${metrics.trendWords.join(' · ')}` : 'Trending: add a post to spark it'}
      </Text>
      {!nearbyEnabled && <Text style={styles.helper}>Enable location access to unlock nearby mode.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: '#0F172A',
  },
  title: {
    color: '#E2E8F0',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: '#93C5FD',
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  scopeButton: {
    backgroundColor: '#1E293B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scopeButtonActive: {
    backgroundColor: '#38BDF8',
  },
  scopeButtonDisabled: {
    opacity: 0.4,
  },
  scopeText: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  scopeTextActive: {
    color: '#082F49',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    minWidth: 68,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  trendLine: {
    color: '#BFDBFE',
    marginTop: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  helper: {
    color: '#94A3B8',
    marginTop: 8,
    fontSize: 11,
  },
});
