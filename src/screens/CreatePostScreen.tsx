import { useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/posts';
import { clearPostDraft, getPostDraft, savePostDraft } from '../services/postDrafts';

const MAX_LENGTH = 500;

export default function CreatePostScreen() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigation = useNavigation();

  const canSubmit = text.trim().length > 0 && !submitting && !loadingDraft;

  useEffect(() => {
    let mounted = true;

    async function loadDraft() {
      try {
        const draft = await getPostDraft();
        if (!mounted) return;
        if (draft.trim()) {
          setText(draft);
          setDraftRestored(true);
        }
      } catch (err) {
        console.error('Failed to load post draft', err);
      } finally {
        if (mounted) setLoadingDraft(false);
      }
    }

    loadDraft();
    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (loadingDraft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePostDraft(text).catch((err) => {
        console.error('Failed to save post draft', err);
      });
    }, 350);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [text, loadingDraft]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (!user) return;
      await createPost(text.trim(), user.id, { lat: 0, lng: 0 }, { isAnonymous: true });
      await clearPostDraft();
      setText('');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to create post. Check your Supabase connection.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDiscardDraft() {
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await clearPostDraft();
      setText('');
      setDraftRestored(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to discard draft.');
      console.error(err);
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

        {draftRestored && !submitting && (
          <View style={styles.draftRow}>
            <Text style={styles.draftInfo}>Draft restored</Text>
            <TouchableOpacity onPress={handleDiscardDraft}>
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        )}

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
            {loadingDraft ? 'Loading...' : submitting ? 'Posting...' : 'Post'}
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
  draftRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftInfo: { color: '#6C5CE7', fontSize: 12, fontWeight: '600' },
  discardText: { color: '#C0392B', fontSize: 12, fontWeight: '700' },
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
