import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FeedScreen from '../screens/FeedScreen';
import MapScreen from '../screens/MapScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { TabParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Partial<
  Record<keyof TabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }>
> = {
  Map: { active: 'map', inactive: 'map-outline' },
  Feed: { active: 'newspaper', inactive: 'newspaper-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

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
      <Tab.Screen name="Chat" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
