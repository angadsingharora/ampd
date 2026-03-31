import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { createProfile, updateProfile } from '../services/dating';
import { supabase } from '../lib/supabase';
import type { DatingStackParamList, PromptAnswer } from '../types';

type Props = NativeStackScreenProps<DatingStackParamList, 'DatingProfileSetup'>;

const PRESET_PROMPTS = [
  'A shower thought I recently had...',
  'My most irrational fear is...',
  'I go crazy for...',
  'Together, we could...',
  'Unusual skill:',
  'The way to win me over is...',
];

export default function DatingProfileSetup({ navigation }: Props) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<string[]>(['', '']);
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [active, setActive] = useState(true);
  const [prompts, setPrompts] = useState<PromptAnswer[]>([
    { prompt: PRESET_PROMPTS[0], answer: '' },
    { prompt: PRESET_PROMPTS[1], answer: '' },
    { prompt: PRESET_PROMPTS[2], answer: '' },
  ]);

  const isValid = useMemo(() => {
    const validPhotos = photos.map((p) => p.trim()).filter(Boolean);
    const numericAge = Number(age);
    const hasPromptAnswers = prompts.every((p) => p.answer.trim().length > 0);
    return validPhotos.length >= 2 && validPhotos.length <= 6 && numericAge >= 18 && hasPromptAnswers;
  }, [age, photos, prompts]);

  function setPromptAt(index: number, value: PromptAnswer) {
    setPrompts((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  async function handleSave() {
    if (!user) return;
    if (!isValid) {
      Alert.alert('Invalid profile', 'Add 2-6 photos, 3 prompt answers, and age 18+.');
      return;
    }

    const payload = {
      photos: photos.map((p) => p.trim()).filter(Boolean),
      prompts: prompts.map((p) => ({ prompt: p.prompt, answer: p.answer.trim() })),
      age: Number(age),
      bio,
      active,
    };

    try {
      const { data: existing } = await supabase
        .from('dating_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await updateProfile(user.id, payload);
      } else {
        await createProfile(user.id, payload);
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save dating profile.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Photos (2-6)</Text>
      {photos.map((photo, index) => (
        <TextInput
          key={`photo-${index}`}
          style={styles.input}
          value={photo}
          onChangeText={(value) => setPhotos((prev) => prev.map((p, i) => (i === index ? value : p)))}
          placeholder={`Photo URL ${index + 1} (placeholder for image picker)`}
          placeholderTextColor="#999"
        />
      ))}
      {photos.length < 6 ? (
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => setPhotos((prev) => [...prev, ''])}
        >
          <Text style={styles.ghostText}>+ Add photo slot</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionTitle}>Prompts</Text>
      {prompts.map((item, index) => (
        <View key={`prompt-${index}`} style={styles.promptCard}>
          <Text style={styles.promptLabel}>Prompt {index + 1}</Text>
          <View style={styles.promptOptions}>
            {PRESET_PROMPTS.map((preset) => (
              <TouchableOpacity
                key={`${index}-${preset}`}
                style={[styles.promptChip, item.prompt === preset && styles.promptChipActive]}
                onPress={() => setPromptAt(index, { ...item, prompt: preset })}
              >
                <Text style={[styles.promptChipText, item.prompt === preset && styles.promptChipTextActive]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.answerInput]}
            value={item.answer}
            onChangeText={(value) => setPromptAt(index, { ...item, answer: value })}
            placeholder="Your answer..."
            placeholderTextColor="#999"
            multiline
          />
        </View>
      ))}

      <Text style={styles.sectionTitle}>Age</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        placeholder="18+"
        placeholderTextColor="#999"
      />

      <Text style={styles.sectionTitle}>Bio (optional)</Text>
      <TextInput
        style={[styles.input, styles.answerInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="A short bio..."
        placeholderTextColor="#999"
        maxLength={300}
        multiline
      />

      <View style={styles.activeRow}>
        <Text style={styles.activeText}>Profile active in feed</Text>
        <Switch value={active} onValueChange={setActive} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]} onPress={() => handleSave().catch(console.error)}>
        <Text style={styles.saveText}>Save Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 14, paddingBottom: 28 },
  sectionTitle: { marginTop: 12, marginBottom: 8, fontSize: 16, fontWeight: '700', color: '#222' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#222',
    marginBottom: 8,
  },
  ghostBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F0FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 2,
  },
  ghostText: { color: '#6C5CE7', fontWeight: '700', fontSize: 13 },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 10,
    marginBottom: 10,
  },
  promptLabel: { fontWeight: '700', color: '#333', marginBottom: 8 },
  promptOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  promptChip: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  promptChipActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  promptChipText: { fontSize: 12, color: '#555' },
  promptChipTextActive: { color: '#fff' },
  answerInput: { minHeight: 70, textAlignVertical: 'top', marginTop: 8 },
  activeRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeText: { color: '#333', fontSize: 14 },
  saveBtn: {
    marginTop: 16,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '700' },
});

