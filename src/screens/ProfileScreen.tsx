import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useThemeSettings } from '../context/ThemeContext';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsWithProfiles,
  type FriendWithProfile,
} from '../services/friends';
import { setMyLocationSharingEnabled } from '../services/liveLocations';
import { getMyBlockedUserIds, unblockUser } from '../services/blocks';
import FriendListItem from '../components/FriendListItem';
import {
  clearAllDrafts,
  clearFriendSearchDraft,
  getFriendSearchDraft,
  saveFriendSearchDraft,
} from '../services/postDrafts';
import {
  CAMPUS_ANTHEM_OPTIONS,
  CAMPUS_SPOT_OPTIONS,
  CAMPUS_VIBE_OPTIONS,
  clearProfileStatusDraft,
  getProfileStatusDraft,
  saveProfileStatusDraft,
} from '../services/profileStatus';
import type { User } from '../types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { darkMode, setDarkMode } = useThemeSettings();
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [clearingDrafts, setClearingDrafts] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [campusVibe, setCampusVibe] = useState('');
  const [campusMission, setCampusMission] = useState('');
  const [campusAnthem, setCampusAnthem] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileStatusSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    try {
      const data = await getFriendsWithProfiles(user.id);
      setFriends(data);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    if (!user) return;
    getMyBlockedUserIds(user.id)
      .then((ids) => setBlockedUserIds(ids))
      .catch((err) => console.error('Failed to load blocked users:', err));
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function loadSearchDraft() {
      const draft = await getFriendSearchDraft();
      if (!mounted || !draft.trim()) return;
      setSearchQuery(draft);
      setDraftRestored(true);
    }
    loadSearchDraft().catch((err) => console.error('Failed to load friend search draft:', err));
    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveFriendSearchDraft(searchQuery).catch((err) => console.error('Failed to save friend search draft:', err));
    }, 250);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    let mounted = true;

    async function loadProfileStatus() {
      const draft = await getProfileStatusDraft();
      if (!mounted) return;
      setCampusVibe(draft.vibe);
      setCampusMission(draft.mission);
      setCampusAnthem(draft.anthem);
    }

    loadProfileStatus().catch((err) => console.error('Failed to load campus vibe:', err));

    return () => {
      mounted = false;
      if (profileStatusSaveTimer.current) clearTimeout(profileStatusSaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (profileStatusSaveTimer.current) clearTimeout(profileStatusSaveTimer.current);

    profileStatusSaveTimer.current = setTimeout(() => {
      saveProfileStatusDraft({
        vibe: campusVibe,
        mission: campusMission,
        anthem: campusAnthem,
      }).catch((err) => console.error('Failed to save campus vibe:', err));
    }, 250);

    return () => {
      if (profileStatusSaveTimer.current) clearTimeout(profileStatusSaveTimer.current);
    };
  }, [campusAnthem, campusMission, campusVibe]);

  async function handleSearch() {
    if (!user || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery, user.id);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }

  async function handleDiscardSearchDraft() {
    await clearFriendSearchDraft();
    setSearchQuery('');
    setSearchResults([]);
    setDraftRestored(false);
  }

  async function handleAddFriend(friendId: string) {
    if (!user) return;
    try {
      await sendFriendRequest(user.id, friendId);
      setSearchResults((prev) => prev.filter((u) => u.id !== friendId));
      await loadFriends();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not send request.');
    }
  }

  async function handleAccept(friendId: string) {
    if (!user) return;
    try {
      await acceptFriendRequest(user.id, friendId);
      await loadFriends();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not accept request.');
    }
  }

  async function handleDecline(friendId: string) {
    if (!user) return;
    try {
      await declineFriendRequest(user.id, friendId);
      await loadFriends();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not decline request.');
    }
  }

  async function handleToggleSharing(enabled: boolean) {
    if (!user) return;
    try {
      await setMyLocationSharingEnabled(user.id, enabled);
      setSharingEnabled(enabled);
    } catch (err) {
      console.error('Failed to toggle sharing:', err);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            console.error('Sign out failed:', err);
          }
        },
      },
    ]);
  }

  async function handleShareProfile() {
    if (!user) return;
    try {
      const profileUrl = `https://ampd.app/u/${encodeURIComponent(user.username)}`;
      const message = [
        `Add me on Ampd: @${user.username}`,
        `Campus: ${user.campus}`,
        `Friends: ${acceptedFriends.length}`,
        profileUrl,
      ].join('\n');

      await Share.share({
        title: `@${user.username} on Ampd`,
        message,
        url: profileUrl,
      });
    } catch (err) {
      console.error('Failed to share profile:', err);
      Alert.alert('Error', 'Could not open share sheet.');
    }
  }

  function handleRandomizeCampusVibe() {
    setCampusVibe(CAMPUS_VIBE_OPTIONS[Math.floor(Math.random() * CAMPUS_VIBE_OPTIONS.length)]);
    setCampusMission(CAMPUS_SPOT_OPTIONS[Math.floor(Math.random() * CAMPUS_SPOT_OPTIONS.length)]);
    setCampusAnthem(CAMPUS_ANTHEM_OPTIONS[Math.floor(Math.random() * CAMPUS_ANTHEM_OPTIONS.length)]);
  }

  async function handleShareCampusVibe() {
    if (!user) return;

    const message = [
      `Campus vibe check from @${user.username}`,
      `Mood: ${campusVibe || 'Undefined but committed.'}`,
      `Current mission: ${campusMission || 'Waiting for the plot to arrive.'}`,
      `Anthem: ${campusAnthem || 'Classified information.'}`,
      `Campus: ${user.campus}`,
    ].join('\n');

    try {
      await Share.share({
        title: `${user.username}'s Campus Vibe`,
        message,
      });
    } catch (err) {
      console.error('Failed to share campus vibe:', err);
      Alert.alert('Error', 'Could not open share sheet.');
    }
  }

  async function handleResetCampusVibe() {
    try {
      await clearProfileStatusDraft();
      setCampusVibe('');
      setCampusMission('');
      setCampusAnthem('');
    } catch (err) {
      console.error('Failed to reset campus vibe:', err);
      Alert.alert('Error', 'Could not reset campus vibe.');
    }
  }

  async function handleClearAllDrafts() {
    setClearingDrafts(true);
    try {
      await clearAllDrafts();
      setSearchQuery('');
      setSearchResults([]);
      setDraftRestored(false);
      Alert.alert('Done', 'All saved drafts were cleared.');
    } catch (err) {
      console.error('Failed to clear drafts:', err);
      Alert.alert('Error', 'Could not clear drafts.');
    } finally {
      setClearingDrafts(false);
    }
  }

  if (!user) return null;

  const incomingRequests = friends.filter((f) => f.direction === 'incoming');
  const outgoingRequests = friends.filter((f) => f.direction === 'outgoing');
  const acceptedFriends = friends.filter((f) => f.direction === 'mutual');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info */}
      <View style={styles.section}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.username}>@{user.username}</Text>
            <View style={styles.campusBadge}>
              <Text style={styles.campusText}>{user.campus}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.shareProfileBtn} onPress={handleShareProfile}>
          <Ionicons name="share-social-outline" size={16} color="#fff" />
          <Text style={styles.shareProfileText}>Share Profile (P2U)</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, styles.vibeSection]}>
        <View style={styles.vibeHeader}>
          <View>
            <Text style={styles.sectionTitle}>Campus Vibe</Text>
            <Text style={styles.vibeSubtitle}>A tiny status card for your current era.</Text>
          </View>
          <TouchableOpacity style={styles.randomizeBtn} onPress={handleRandomizeCampusVibe}>
            <Ionicons name="shuffle" size={16} color="#6C5CE7" />
            <Text style={styles.randomizeText}>Randomize</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vibeChipWrap}>
          {CAMPUS_VIBE_OPTIONS.map((option) => {
            const selected = option === campusVibe;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.vibeChip, selected && styles.vibeChipSelected]}
                onPress={() => setCampusVibe(option)}
              >
                <Text style={[styles.vibeChipText, selected && styles.vibeChipTextSelected]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.vibeCard}>
          <Text style={styles.vibeCardEyebrow}>CURRENT READOUT</Text>
          <Text style={styles.vibeCardMood}>{campusVibe || 'Pick a vibe'}</Text>

          <Text style={styles.vibeLabel}>Current mission</Text>
          <TextInput
            style={styles.vibeInput}
            placeholder="Library cave, coffee sprint, mysterious errand..."
            placeholderTextColor="#94A3B8"
            value={campusMission}
            onChangeText={setCampusMission}
          />

          <Text style={styles.vibeLabel}>Anthem</Text>
          <TextInput
            style={styles.vibeInput}
            placeholder="What is the soundtrack right now?"
            placeholderTextColor="#94A3B8"
            value={campusAnthem}
            onChangeText={setCampusAnthem}
          />

          <View style={styles.vibeFooter}>
            <Text style={styles.vibeCampus}>{user.campus}</Text>
            <Text style={styles.vibeHandle}>@{user.username}</Text>
          </View>
        </View>

        <View style={styles.vibeActionRow}>
          <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => handleResetCampusVibe().catch(console.error)}>
            <Text style={styles.secondaryActionText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => handleShareCampusVibe().catch(console.error)}>
            <Ionicons name="paper-plane-outline" size={16} color="#fff" />
            <Text style={styles.primaryActionText}>Share Vibe</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Drafts</Text>
        <TouchableOpacity
          style={[styles.clearDraftsBtn, clearingDrafts && styles.clearDraftsBtnDisabled]}
          disabled={clearingDrafts}
          onPress={() =>
            Alert.alert('Clear saved drafts?', 'This will remove all locally saved drafts.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: clearingDrafts ? 'Clearing...' : 'Clear',
                style: 'destructive',
                onPress: () => handleClearAllDrafts().catch(console.error),
              },
            ])
          }
        >
          <Text style={styles.clearDraftsText}>
            {clearingDrafts ? 'Clearing...' : 'Clear All Saved Drafts'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Sharing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Sharing</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Share with friends</Text>
          <Switch value={sharingEnabled} onValueChange={handleToggleSharing} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark mode</Text>
          <Switch
            value={darkMode}
            onValueChange={(enabled) => {
              setDarkMode(enabled).catch((err) => {
                console.error('Failed to update dark mode:', err);
                Alert.alert('Error', 'Could not update dark mode.');
              });
            }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blocked Users</Text>
        {blockedUserIds.length === 0 ? (
          <Text style={styles.emptyText}>No blocked users.</Text>
        ) : (
          blockedUserIds.map((blockedId) => (
            <View key={blockedId} style={styles.searchResultRow}>
              <Text style={styles.searchResultName}>{blockedId}</Text>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={async () => {
                  if (!user) return;
                  try {
                    await unblockUser(user.id, blockedId);
                    setBlockedUserIds((prev) => prev.filter((id) => id !== blockedId));
                  } catch (err) {
                    console.error('Failed to unblock user:', err);
                    Alert.alert('Error', 'Could not unblock user.');
                  }
                }}
              >
                <Text style={styles.unblockButtonText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Add Friends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Find Friends</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        {draftRestored ? (
          <TouchableOpacity style={styles.discardDraftBtn} onPress={() => handleDiscardSearchDraft().catch(console.error)}>
            <Text style={styles.discardDraftText}>Discard restored search</Text>
          </TouchableOpacity>
        ) : null}

        {searchResults.map((result) => {
          const alreadyFriend = friends.some((f) => f.userId === result.id);
          return (
            <View key={result.id} style={styles.searchResultRow}>
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName}>@{result.username}</Text>
                <Text style={styles.searchResultCampus}>{result.campus}</Text>
              </View>
              {alreadyFriend ? (
                <Text style={styles.alreadyText}>Added</Text>
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddFriend(result.id)}
                >
                  <Ionicons name="person-add" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Friend Requests ({incomingRequests.length})
          </Text>
          {incomingRequests.map((f) => (
            <FriendListItem
              key={f.friendshipId}
              friend={f}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))}
        </View>
      )}

      {/* Friends List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Friends ({acceptedFriends.length})
        </Text>
        {loadingFriends ? (
          <ActivityIndicator size="small" color="#6C5CE7" style={{ marginTop: 12 }} />
        ) : acceptedFriends.length === 0 ? (
          <Text style={styles.emptyText}>No friends yet. Search above to add some!</Text>
        ) : (
          acceptedFriends.map((f) => (
            <FriendListItem key={f.friendshipId} friend={f} />
          ))
        )}

        {outgoingRequests.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Pending Requests</Text>
            {outgoingRequests.map((f) => (
              <FriendListItem key={f.friendshipId} friend={f} />
            ))}
          </>
        )}
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: { flex: 1 },
  username: { fontSize: 20, fontWeight: '700', color: '#222' },
  campusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  campusText: { fontSize: 12, fontWeight: '600', color: '#6C5CE7' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 12 },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: { fontSize: 15, color: '#333' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    width: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardDraftBtn: { marginBottom: 8 },
  discardDraftText: { fontSize: 12, fontWeight: '700', color: '#C0392B' },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 14, fontWeight: '600', color: '#222' },
  searchResultCampus: { fontSize: 12, color: '#999', marginTop: 1 },
  addButton: {
    backgroundColor: '#6C5CE7',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alreadyText: { fontSize: 12, color: '#27AE60', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#999', marginTop: 4 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#E74C3C' },
  clearDraftsBtn: {
    borderRadius: 10,
    backgroundColor: '#FCEBEC',
    paddingVertical: 11,
    alignItems: 'center',
  },
  clearDraftsBtnDisabled: { opacity: 0.7 },
  clearDraftsText: { color: '#C0392B', fontWeight: '700' },
  unblockButton: {
    backgroundColor: '#EEE8FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unblockButtonText: { color: '#6C5CE7', fontWeight: '700', fontSize: 12 },
  shareProfileBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F8BFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareProfileText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  vibeSection: {
    backgroundColor: '#FFF8ED',
    borderWidth: 1,
    borderColor: '#F3DFC0',
  },
  vibeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  vibeSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#7C6A53',
  },
  randomizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9C09C',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFDF8',
  },
  randomizeText: {
    color: '#6C5CE7',
    fontSize: 12,
    fontWeight: '700',
  },
  vibeChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  vibeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E6D6BC',
  },
  vibeChipSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  vibeChipText: {
    color: '#6B5B45',
    fontSize: 12,
    fontWeight: '700',
  },
  vibeChipTextSelected: {
    color: '#fff',
  },
  vibeCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#1C1630',
  },
  vibeCardEyebrow: {
    color: '#C8BCFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  vibeCardMood: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 14,
  },
  vibeLabel: {
    color: '#C9C2E1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  vibeInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#2B2347',
    color: '#fff',
    marginBottom: 12,
  },
  vibeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  vibeCampus: {
    color: '#F7C873',
    fontSize: 12,
    fontWeight: '700',
  },
  vibeHandle: {
    color: '#C9C2E1',
    fontSize: 12,
    fontWeight: '600',
  },
  vibeActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5B98B',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
  },
  secondaryActionText: {
    color: '#7B5E34',
    fontWeight: '700',
  },
  primaryActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#6C5CE7',
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '700',
  },
});
