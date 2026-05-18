import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { updatePostText } from '../services/posts';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPost'>;

const MAX_LENGTH = 500;

export default function EditPostScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState(route.params.initialText);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Post text cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await updatePostText(route.params.postId, user.id, trimmed);
      navigation.goBack();
    } catch (err) {
      console.error('Failed to update post:', err);
      Alert.alert('Error', 'Could not update post.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={MAX_LENGTH}
        placeholder="Update your post"
      />
      <Text style={styles.count}>{text.length}/{MAX_LENGTH}</Text>
      <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  count: { textAlign: 'right', color: '#888', marginTop: 10, marginBottom: 14 },
  button: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
