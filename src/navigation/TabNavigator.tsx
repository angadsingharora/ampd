import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import FeedScreen from '../screens/FeedScreen';
import MapScreen from '../screens/MapScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommunityListScreen from '../screens/CommunityListScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CreateCommunityScreen from '../screens/CreateCommunityScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import DatingFeedScreen from '../screens/DatingFeedScreen';
import DatingProfileSetup from '../screens/DatingProfileSetup';
import MatchesScreen from '../screens/MatchesScreen';
import {
  TabParamList,
  ChatStackParamList,
  CommunitiesStackParamList,
  DatingStackParamList,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useThemeSettings } from '../context/ThemeContext';
import { getUnreadConversationCount } from '../services/messageReads';
import { getBlockRelations } from '../services/blocks';
import { supabase } from '../lib/supabase';

const Tab = createBottomTabNavigator<TabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const CommunitiesStack = createNativeStackNavigator<CommunitiesStackParamList>();
const DatingStack = createNativeStackNavigator<DatingStackParamList>();

const TAB_ICONS: Partial<
  Record<keyof TabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }>
> = {
  Map: { active: 'map', inactive: 'map-outline' },
  Feed: { active: 'newspaper', inactive: 'newspaper-outline' },
  Dating: { active: 'heart', inactive: 'heart-outline' },
  Communities: { active: 'people', inactive: 'people-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chats' }} />
      <ChatStack.Screen name="ChatScreen" component={ChatScreen} options={{ title: 'Chat' }} />
    </ChatStack.Navigator>
  );
}

function CommunitiesStackNavigator() {
  return (
    <CommunitiesStack.Navigator>
      <CommunitiesStack.Screen
        name="CommunityList"
        component={CommunityListScreen}
        options={{ title: 'Communities' }}
      />
      <CommunitiesStack.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
      <CommunitiesStack.Screen
        name="CreateCommunity"
        component={CreateCommunityScreen}
        options={{ title: 'Create Community' }}
      />
      <CommunitiesStack.Screen name="GroupChat" component={GroupChatScreen} options={{ title: 'Group Chat' }} />
    </CommunitiesStack.Navigator>
  );
}

function DatingStackNavigator() {
  return (
    <DatingStack.Navigator>
      <DatingStack.Screen name="DatingFeed" component={DatingFeedScreen} options={{ title: 'Dating' }} />
      <DatingStack.Screen
        name="DatingProfileSetup"
        component={DatingProfileSetup}
        options={{ title: 'Profile Setup' }}
      />
      <DatingStack.Screen name="Matches" component={MatchesScreen} options={{ title: 'Matches' }} />
    </DatingStack.Navigator>
  );
}

export default function TabNavigator() {
  const { user } = useAuth();
  const { darkMode } = useThemeSettings();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const refreshUnread = async () => {
      const blocked = await getBlockRelations(user.id);
      const count = await getUnreadConversationCount(user.id, [...blocked]);
      if (mounted) setUnreadCount(count);
    };

    refreshUnread().catch((err) => console.error('Failed to load unread count:', err));

    const channel = supabase
      .channel(`tab-unread-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => refreshUnread().catch(console.error),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: darkMode ? '#BBB' : '#999',
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: darkMode ? '#111' : '#fff' },
        headerStyle: { backgroundColor: darkMode ? '#111' : '#fff' },
        headerTintColor: darkMode ? '#fff' : '#111',
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen
        name="Dating"
        component={DatingStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Communities"
        component={CommunitiesStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNavigator}
        options={{ headerShown: false, tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
