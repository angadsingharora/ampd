import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PromptAnswer from './PromptAnswer';
import type { DatingProfile } from '../types';

interface DatingCardProps {
  profile: DatingProfile;
  comment: string;
  onChangeComment: (value: string) => void;
  onLikeSection: (contentType: 'photo' | 'prompt', contentIndex: number) => void;
}

export default function DatingCard({
  profile,
  comment,
  onChangeComment,
  onLikeSection,
}: DatingCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>
        {profile.username ?? 'Unknown'}, {profile.age}
      </Text>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {profile.photos.map((photo, index) => (
        <View key={`${profile.id}-photo-${index}`} style={styles.section}>
          <Image
            source={{ uri: photo || 'https://placehold.co/640x480/png' }}
            style={styles.photo}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.heart} onPress={() => onLikeSection('photo', index)}>
            <Ionicons name="heart-outline" size={22} color="#E74C3C" />
          </TouchableOpacity>
        </View>
      ))}

      {(profile.prompts ?? []).map((item, index) => (
        <PromptAnswer
          key={`${profile.id}-prompt-${index}`}
          prompt={item.prompt}
          answer={item.answer}
          onLike={() => onLikeSection('prompt', index)}
        />
      ))}

      <TextInput
        style={styles.comment}
        placeholder="Optional comment with your like..."
        placeholderTextColor="#999"
        value={comment}
        onChangeText={onChangeComment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8F8FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E7EE',
    padding: 12,
    marginBottom: 12,
  },
  header: { fontSize: 20, fontWeight: '800', color: '#222' },
  bio: { fontSize: 14, color: '#555', marginTop: 6, marginBottom: 10 },
  section: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ECECEC',
    position: 'relative',
  },
  photo: { width: '100%', height: 260, backgroundColor: '#EEE' },
  heart: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comment: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#222',
  },
});

