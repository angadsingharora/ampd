import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsWithProfiles,
  type FriendWithProfile,
} from '../services/friends';
import { setMyLocationSharingEnabled } from '../services/liveLocations';
import FriendListItem from '../components/FriendListItem';
import type { User } from '../types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

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
      </View>

      {/* Location Sharing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Sharing</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Share with friends</Text>
          <Switch value={sharingEnabled} onValueChange={handleToggleSharing} />
        </View>
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
});
