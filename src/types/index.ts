// ============================================
// Navigation
// ============================================

export type RootStackParamList = {
  Main: undefined;
  CreatePost: undefined;
  Auth: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  VerifyEmail: { email: string };
};

export type TabParamList = {
  Map: undefined;
  Feed: undefined;
  Dating: undefined;
  Communities: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type MapStackParamList = {
  MapHome: undefined;
  CreatePost: undefined;
};

export type FeedStackParamList = {
  FeedHome: undefined;
};

export type DatingStackParamList = {
  DatingFeed: undefined;
  DatingProfileSetup: undefined;
  Matches: undefined;
};

export type CommunitiesStackParamList = {
  CommunityList: undefined;
  Community: { communityId: string };
  CreateCommunity: undefined;
  GroupChat: { communityId: string; communityName: string };
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatScreen: { userId: string; username: string };
  GroupChat: { communityId: string; communityName: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Moments: undefined;
  Admin: undefined;
};

// ============================================
// Domain Models
// ============================================

export interface User {
  id: string;
  username: string;
  campus: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  text: string;
  image_url: string | null;
  is_anonymous: boolean;
  score: number;
  created_at: string;
  username?: string;
}

export interface Vote {
  id: string;
  user_id: string;
  post_id: string;
  value: 1 | -1;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
}

export interface UserLocation {
  user_id: string;
  lat: number;
  lng: number;
  sharing: boolean;
  updated_at: string;
  username?: string;
}

export interface Moment {
  id: string;
  user_id: string;
  title: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  member_count?: number;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  username?: string;
}

export interface GroupMessage {
  id: string;
  community_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  sender_username?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'message' | 'user' | 'group_message';
  target_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewed_by: string | null;
  created_at: string;
  reporter_username?: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export type SortMode = 'recent' | 'top';

export interface Conversation {
  partner_id: string;
  partner_username: string;
  last_message: string;
  last_message_at: string;
}

export interface GroupConversation {
  community_id: string;
  community_name: string;
  last_message: string;
  last_sender_username: string;
  last_message_at: string;
}

// ============================================
// Dating
// ============================================

export interface PromptAnswer {
  prompt: string;
  answer: string;
}

export interface DatingProfile {
  id: string;
  user_id: string;
  photos: string[];
  prompts: PromptAnswer[];
  age: number;
  bio: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
  campus?: string;
}

export interface DatingLike {
  id: string;
  liker_id: string;
  liked_id: string;
  liked_content_type: 'photo' | 'prompt';
  liked_content_index: number;
  comment: string | null;
  created_at: string;
  liker_username?: string;
  liker_photos?: string[];
}

export interface DatingMatch {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  partner_username?: string;
  partner_photo?: string;
}

// ============================================
// Geo helpers
// ============================================

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
