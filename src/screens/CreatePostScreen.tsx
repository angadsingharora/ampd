import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DEFAULT_SCHOOL_ID } from '../lib/campus';
import { createPost } from '../services/posts';

const MAX_LENGTH = 500;

export default function CreatePostScreen() {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigation = useNavigation();

  const canSubmit = text.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createPost(text.trim(), DEFAULT_SCHOOL_ID);
      setText('');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to create post. Check your Supabase connection.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Posting anonymously</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="What's happening on campus?"
          placeholderTextColor="#aaa"
          multiline
          maxLength={MAX_LENGTH}
          value={text}
          onChangeText={setText}
          autoFocus
        />

        <Text style={styles.charCount}>
          {text.length}/{MAX_LENGTH}
        </Text>

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 20 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  badgeText: { color: '#6C5CE7', fontSize: 13, fontWeight: '600' },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#222',
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 13,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
