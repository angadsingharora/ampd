import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { createCommunity } from '../services/communities';
import {
  clearCreateCommunityDraft,
  getCreateCommunityDraft,
  saveCreateCommunityDraft,
} from '../services/postDrafts';
import type { CommunitiesStackParamList } from '../types';

type Props = NativeStackScreenProps<CommunitiesStackParamList, 'CreateCommunity'>;

export default function CreateCommunityScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pinLocation, setPinLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadDraft() {
      try {
        const draft = await getCreateCommunityDraft();
        if (!mounted || !draft) return;
        setName(draft.name);
        setDescription(draft.description);
        setPinLocation(draft.pinLocation);
        if (draft.name.trim() || draft.description.trim() || draft.pinLocation) {
          setDraftRestored(true);
        }
      } catch (err) {
        console.error('Failed to load community draft:', err);
      } finally {
        if (mounted) setLoadingDraft(false);
      }
    }

    loadDraft().catch(console.error);
    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (loadingDraft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveCreateCommunityDraft({ name, description, pinLocation }).catch((err) =>
        console.error('Failed to save community draft:', err),
      );
    }, 350);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [description, loadingDraft, name, pinLocation]);

  async function handleSubmit() {
    if (!user) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      Alert.alert('Invalid name', 'Name must be 3-50 characters.');
      return;
    }

    setSubmitting(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      if (pinLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }

      await createCommunity({
        name: trimmedName,
        description,
        createdBy: user.id,
        lat,
        lng,
      });

      await clearCreateCommunityDraft();
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not create community.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDiscardDraft() {
    await clearCreateCommunityDraft();
    setName('');
    setDescription('');
    setPinLocation(false);
    setDraftRestored(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      {draftRestored ? (
        <View style={styles.draftRow}>
          <Text style={styles.draftInfo}>Draft restored</Text>
          <TouchableOpacity onPress={() => handleDiscardDraft().catch(console.error)}>
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="3-50 characters"
        placeholderTextColor="#999"
        maxLength={50}
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="What is this community about?"
        placeholderTextColor="#999"
        multiline
        maxLength={500}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Pin to current location</Text>
        <Switch value={pinLocation} onValueChange={setPinLocation} />
      </View>

      <TouchableOpacity
        style={[styles.submit, (submitting || loadingDraft) && styles.submitDisabled]}
        disabled={submitting || loadingDraft}
        onPress={() => handleSubmit().catch(console.error)}
      >
        <Text style={styles.submitText}>
          {loadingDraft ? 'Loading...' : submitting ? 'Creating...' : 'Create Community'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 10 },
  draftRow: {
    marginTop: 2,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftInfo: { color: '#6C5CE7', fontSize: 12, fontWeight: '600' },
  discardText: { color: '#C0392B', fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#222',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  switchRow: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 15, color: '#333' },
  submit: {
    marginTop: 20,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
