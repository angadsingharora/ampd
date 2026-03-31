import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
import {
  TabParamList,
  ChatStackParamList,
  CommunitiesStackParamList,
  DatingStackParamList,
} from '../types';

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
    </DatingStack.Navigator>
  );
}

export default function TabNavigator() {
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
        tabBarInactiveTintColor: '#999',
        headerTitleStyle: { fontWeight: '700' },
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
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
