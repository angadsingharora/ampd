# Ampd — Design Document

**Version:** 2.0
**Date:** March 21, 2026
**Status:** MVP

---

## 1. Product Overview

Ampd is a mobile-first campus social app built around a live map of campus activity. Users open the app to instantly see where people are, what's happening nearby, and interact in real time. Everything revolves around **location + real-time interaction**.

### 1.1 Core User Flow

```
Open App → See live map with friends & posts → Tap post or drop one →
Browse nearby feed → Chat with a friend → Pin a private moment
```

### 1.2 What Ampd Is NOT (MVP Constraints)

- No stories, reels, or ephemeral content
- No third-party OAuth (email/password only for MVP)
- No video uploads (images only)

---

## 2. Tech Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Mobile Runtime  | React Native (Expo SDK 52+)         |
| Language        | TypeScript (strict mode)            |
| Navigation      | React Navigation v7 (bottom tabs)   |
| Maps            | react-native-maps (Google/Apple)    |
| Backend         | Supabase (hosted)                   |
| Database        | PostgreSQL (via Supabase)           |
| Auth            | Supabase Auth (email/password)      |
| Realtime        | Supabase Realtime (WebSocket)       |
| File Storage    | Supabase Storage (image uploads)    |
| Push Notifs     | expo-notifications + Edge Functions |
| State           | React Context + useReducer          |
| Location        | expo-location                       |
| Image Picker    | expo-image-picker                   |

### 2.1 Key Dependencies

```json
{
  "expo": "~52.0.0",
  "react-native": "0.76.x",
  "react-native-maps": "1.x",
  "@react-navigation/native": "^7.x",
  "@react-navigation/bottom-tabs": "^7.x",
  "@supabase/supabase-js": "^2.x",
  "expo-location": "~18.x",
  "expo-secure-store": "~14.x",
  "expo-image-picker": "~16.x",
  "expo-notifications": "~0.29.x",
  "expo-device": "~7.x",
  "react-native-safe-area-context": "^5.x",
  "react-native-screens": "^4.x"
}
```

---

## 3. Architecture

### 3.1 High-Level Diagram

```
┌───────────────────────────────────────────────────────────┐
│                      React Native App                     │
│                                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────┐ ┌─────────┐    │
│  │ Map  │ │ Feed │ │ Chat │ │Communities│ │ Profile │    │
│  │Screen│ │Screen│ │Screen│ │  Screen   │ │ Screen  │    │
│  └──┬───┘ └──┬───┘ └──┬───┘ └─────┬─────┘ └────┬────┘    │
│     │        │        │           │             │         │
│  ┌──┴────────┴────────┴───────────┴─────────────┴──┐      │
│  │              Service Layer                      │      │
│  │  (posts, friends, messages, communities,        │      │
│  │   media, notifications, admin)                  │      │
│  └──────────────────┬──────────────────────────────┘      │
│                     │                                     │
│  ┌──────────────────┴──────────────────────────────┐      │
│  │            Supabase Client                      │      │
│  │  (Auth, DB, Realtime, Storage)                  │      │
│  └──────────────────┬──────────────────────────────┘      │
└─────────────────────┼─────────────────────────────────────┘
                      │ HTTPS + WSS
┌─────────────────────┼─────────────────────────────────────┐
│              Supabase Platform                            │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │  Auth  │ │Postgres │ │ Realtime │ │    Storage       │ │
│  │        │ │         │ │(WebSocket│ │ (image uploads)  │ │
│  └────────┘ └─────────┘ └──────────┘ └─────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Edge Functions                          │ │
│  │  (push notification dispatch, admin actions)         │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### 3.2 Project Structure

```
Ampd/
├── app.json                    # Expo config
├── App.tsx                     # Entry point
├── tsconfig.json
├── package.json
├── .env                        # SUPABASE_URL, SUPABASE_ANON_KEY
│
├── src/
│   ├── navigation/
│   │   └── TabNavigator.tsx    # Bottom tab navigator
│   │
│   ├── screens/
│   │   ├── MapScreen.tsx           # Live map (default tab)
│   │   ├── FeedScreen.tsx          # Location-based feed
│   │   ├── ChatListScreen.tsx      # Conversation list (DMs + groups)
│   │   ├── ChatScreen.tsx          # 1:1 message thread
│   │   ├── GroupChatScreen.tsx     # Group/community chat thread
│   │   ├── CommunityListScreen.tsx # Browse/search communities
│   │   ├── CommunityScreen.tsx     # Single community detail + feed
│   │   ├── CreateCommunityScreen.tsx # Create new community
│   │   ├── ProfileScreen.tsx       # User profile + settings
│   │   ├── CreatePostScreen.tsx    # Drop a post (text + optional image)
│   │   ├── MomentsScreen.tsx       # Private pins
│   │   ├── AdminScreen.tsx         # Admin dashboard (admin-only)
│   │   ├── LoginScreen.tsx         # Auth: login
│   │   └── SignUpScreen.tsx        # Auth: register
│   │
│   ├── components/
│   │   ├── PostCard.tsx            # Post display in feed (text + image)
│   │   ├── PostMarker.tsx          # Post pin on map
│   │   ├── FriendMarker.tsx        # Friend dot on map
│   │   ├── VoteButtons.tsx         # Upvote/downvote controls
│   │   ├── ChatBubble.tsx          # Single message bubble
│   │   ├── FriendListItem.tsx      # Friend row component
│   │   ├── CommunityCard.tsx       # Community list item
│   │   ├── ImagePreview.tsx        # Thumbnail for post images
│   │   └── ReportButton.tsx        # Flag content for review
│   │
│   ├── services/
│   │   ├── supabase.ts             # Supabase client init
│   │   ├── auth.ts                 # Sign up, sign in, sign out
│   │   ├── posts.ts                # CRUD + geo-query for posts
│   │   ├── votes.ts                # Upvote/downvote logic
│   │   ├── friends.ts              # Friend requests + status
│   │   ├── messages.ts             # Send/fetch DMs
│   │   ├── groupMessages.ts        # Send/fetch group messages
│   │   ├── communities.ts          # Community CRUD + membership
│   │   ├── locations.ts            # Update/fetch locations
│   │   ├── moments.ts              # Private pin CRUD
│   │   ├── media.ts                # Image upload to Supabase Storage
│   │   ├── notifications.ts        # Push token registration + sending
│   │   └── admin.ts                # Moderation actions (ban, remove, reports)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth state hook
│   │   ├── useLocation.ts          # Device location tracking
│   │   ├── useRealtime.ts          # Generic realtime subscription
│   │   ├── usePosts.ts             # Posts with geo-filter
│   │   └── useNotifications.ts     # Push notification setup + handlers
│   │
│   ├── context/
│   │   ├── AuthContext.tsx          # Auth provider
│   │   └── NotificationContext.tsx  # Push notification state
│   │
│   ├── types/
│   │   └── index.ts                # Shared TypeScript types
│   │
│   └── utils/
│       ├── geo.ts                  # Haversine, bounding box math
│       ├── time.ts                 # Relative timestamps
│       └── image.ts                # Image resize/compress before upload
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql  # Full DDL + RLS
    └── functions/
        └── push-notification/      # Edge Function for push dispatch
            └── index.ts
```

---

## 4. Database Schema

All tables live in the `public` schema on Supabase Postgres. The `locations` table uses a composite primary key on `user_id` (one row per user, upserted).

### 4.1 Entity-Relationship Diagram

```
┌──────────┐       ┌─────────────┐       ┌──────────┐
│  users   │───1:N─│ friendships │─N:1───│  users   │
│          │       └─────────────┘       │          │
│          │───1:N─│   posts     │       │          │
│          │       └──────┬──────┘       │          │
│          │              │1:N           │          │
│          │       ┌──────┴──────┐       │          │
│          │───1:N─│   votes     │       │          │
│          │       └─────────────┘       │          │
│          │───1:N─│  messages   │─N:1───│          │
│          │       └─────────────┘       │          │
│          │───1:1─│  locations  │       │          │
│          │       └─────────────┘       │          │
│          │───1:N─│  moments    │       │          │
│          │       └─────────────┘       │          │
│          │───1:N─│ push_tokens │       │          │
│          │       └─────────────┘       │          │
│          │───1:N─│  reports    │       │          │
│          │       └─────────────┘       │          │
│          │                             │          │
│          │       ┌─────────────┐       │          │
│          │───1:N─│ community   │       │          │
│          │       │  _members   │       │          │
│          │       └──────┬──────┘       │          │
│          │              │N:1           │          │
│          │       ┌──────┴──────┐       │          │
│          │       │ communities │       │          │
│          │       └──────┬──────┘       │          │
│          │              │1:N           │          │
│          │       ┌──────┴──────┐       │          │
│          │───1:N─│   group     │       │          │
│          │       │  _messages  │       │          │
└──────────┘       └─────────────┘       └──────────┘
```

### 4.2 Table Definitions

#### `users`

| Column       | Type          | Constraints                          |
| ------------ | ------------- | ------------------------------------ |
| `id`         | `uuid`        | PK, default `auth.uid()`            |
| `username`   | `text`        | UNIQUE, NOT NULL, 3–20 chars         |
| `role`       | `text`        | `'user'` / `'admin'`, default `'user'` |
| `created_at` | `timestamptz` | default `now()`                      |

Maps 1:1 with `auth.users`. Created via a trigger on sign-up. The `role` field controls admin access (see Section 17).

#### `friendships`

| Column      | Type   | Constraints                      |
| ----------- | ------ | -------------------------------- |
| `id`        | `uuid` | PK, default `gen_random_uuid()`  |
| `user_id`   | `uuid` | FK → users.id, NOT NULL          |
| `friend_id` | `uuid` | FK → users.id, NOT NULL          |
| `status`    | `text` | `'pending'` / `'accepted'`, NOT NULL |
| `created_at`| `timestamptz` | default `now()`             |

**Unique constraint:** `(user_id, friend_id)` — prevents duplicate requests.

Friendship is **directional** for the request phase. Two rows exist once accepted:
- Row 1: `(A → B, 'accepted')`
- Row 2: `(B → A, 'accepted')`

This simplifies querying "my friends" to a single WHERE on `user_id`.

#### `posts`

| Column         | Type          | Constraints                     |
| -------------- | ------------- | ------------------------------- |
| `id`           | `uuid`        | PK, default `gen_random_uuid()` |
| `user_id`      | `uuid`        | FK → users.id, NOT NULL         |
| `lat`          | `float8`      | NOT NULL                        |
| `lng`          | `float8`      | NOT NULL                        |
| `text`         | `text`        | NOT NULL, max 500 chars         |
| `image_url`    | `text`        | NULLABLE, URL to Supabase Storage |
| `is_anonymous` | `boolean`     | default `false`                 |
| `score`        | `integer`     | default `0`                     |
| `created_at`   | `timestamptz` | default `now()`                 |

**Index:** `idx_posts_location` on `(lat, lng)` for geo-queries.

Images are stored in Supabase Storage bucket `post-images`. The `image_url` column stores the public URL returned after upload. See Section 15 for the media upload pipeline.

#### `votes`

| Column    | Type     | Constraints                     |
| --------- | -------- | ------------------------------- |
| `id`      | `uuid`   | PK, default `gen_random_uuid()` |
| `user_id` | `uuid`   | FK → users.id, NOT NULL         |
| `post_id` | `uuid`   | FK → posts.id ON DELETE CASCADE |
| `value`   | `smallint` | `1` or `-1`, NOT NULL         |

**Unique constraint:** `(user_id, post_id)` — one vote per user per post.

A database trigger updates `posts.score` on INSERT/UPDATE/DELETE of votes:

```sql
CREATE OR REPLACE FUNCTION update_post_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET score = (
    SELECT COALESCE(SUM(value), 0) FROM votes WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
  ) WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

#### `messages`

| Column        | Type          | Constraints                     |
| ------------- | ------------- | ------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()` |
| `sender_id`   | `uuid`        | FK → users.id, NOT NULL         |
| `receiver_id` | `uuid`        | FK → users.id, NOT NULL         |
| `text`        | `text`        | NOT NULL                        |
| `created_at`  | `timestamptz` | default `now()`                 |

**Index:** `idx_messages_conversation` on `(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at)` for efficient conversation loading.

#### `locations`

| Column       | Type          | Constraints                     |
| ------------ | ------------- | ------------------------------- |
| `user_id`    | `uuid`        | PK, FK → users.id              |
| `lat`        | `float8`      | NOT NULL                        |
| `lng`        | `float8`      | NOT NULL                        |
| `sharing`    | `boolean`     | default `true`                  |
| `updated_at` | `timestamptz` | default `now()`                 |

Single row per user, upserted. The `sharing` flag controls whether friends can see this user on the map.

#### `moments`

| Column       | Type          | Constraints                     |
| ------------ | ------------- | ------------------------------- |
| `id`         | `uuid`        | PK, default `gen_random_uuid()` |
| `user_id`    | `uuid`        | FK → users.id, NOT NULL         |
| `title`      | `text`        | NOT NULL                        |
| `lat`        | `float8`      | NOT NULL                        |
| `lng`        | `float8`      | NOT NULL                        |
| `created_at` | `timestamptz` | default `now()`                 |

#### `communities`

| Column        | Type          | Constraints                     |
| ------------- | ------------- | ------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()` |
| `name`        | `text`        | UNIQUE, NOT NULL, 3–50 chars    |
| `description` | `text`        | NULLABLE, max 500 chars         |
| `created_by`  | `uuid`        | FK → users.id, NOT NULL         |
| `lat`         | `float8`      | NULLABLE (location-anchored communities) |
| `lng`         | `float8`      | NULLABLE                        |
| `created_at`  | `timestamptz` | default `now()`                 |

A community is a named group that users can join. It has an optional location anchor (e.g., "Northside Dorm" pinned to that building). The creator is auto-assigned as `admin` role in `community_members`.

#### `community_members`

| Column         | Type          | Constraints                     |
| -------------- | ------------- | ------------------------------- |
| `id`           | `uuid`        | PK, default `gen_random_uuid()` |
| `community_id` | `uuid`        | FK → communities.id ON DELETE CASCADE |
| `user_id`      | `uuid`        | FK → users.id ON DELETE CASCADE |
| `role`         | `text`        | `'member'` / `'admin'`, default `'member'` |
| `joined_at`    | `timestamptz` | default `now()`                 |

**Unique constraint:** `(community_id, user_id)` — one membership per user per community.

The `admin` role can remove members and delete the community. The community creator is always `admin`.

#### `group_messages`

| Column         | Type          | Constraints                     |
| -------------- | ------------- | ------------------------------- |
| `id`           | `uuid`        | PK, default `gen_random_uuid()` |
| `community_id` | `uuid`        | FK → communities.id ON DELETE CASCADE |
| `sender_id`    | `uuid`        | FK → users.id, NOT NULL         |
| `text`         | `text`        | NOT NULL                        |
| `created_at`   | `timestamptz` | default `now()`                 |

Each community has a single group chat. Messages are visible to all members. Realtime subscription delivers new messages instantly.

#### `reports`

| Column        | Type          | Constraints                     |
| ------------- | ------------- | ------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()` |
| `reporter_id` | `uuid`        | FK → users.id, NOT NULL         |
| `target_type` | `text`        | `'post'` / `'message'` / `'user'` / `'group_message'`, NOT NULL |
| `target_id`   | `uuid`        | NOT NULL (ID of the reported entity) |
| `reason`      | `text`        | NOT NULL                        |
| `status`      | `text`        | `'pending'` / `'reviewed'` / `'resolved'`, default `'pending'` |
| `reviewed_by` | `uuid`        | FK → users.id, NULLABLE         |
| `created_at`  | `timestamptz` | default `now()`                 |

Used by the admin moderation system. Any user can create a report; only admins can review/resolve them.

#### `push_tokens`

| Column       | Type          | Constraints                     |
| ------------ | ------------- | ------------------------------- |
| `id`         | `uuid`        | PK, default `gen_random_uuid()` |
| `user_id`    | `uuid`        | FK → users.id ON DELETE CASCADE |
| `token`      | `text`        | NOT NULL                        |
| `platform`   | `text`        | `'ios'` / `'android'`, NOT NULL |
| `created_at` | `timestamptz` | default `now()`                 |

**Unique constraint:** `(user_id, token)` — prevents duplicate token registration.

A user can have multiple tokens (multiple devices). Tokens are registered on app launch and used by the Edge Function to dispatch push notifications.

---

## 5. Row-Level Security (RLS)

RLS is **enabled on every table**. All policies use `auth.uid()` to identify the current user.

### 5.1 Policy Summary

| Table               | SELECT                                      | INSERT                   | UPDATE                  | DELETE                  |
| ------------------- | ------------------------------------------- | ------------------------ | ----------------------- | ----------------------- |
| `users`             | All authenticated users                     | Only own row (via trigger) | Own row only           | —                       |
| `friendships`       | Where `user_id` or `friend_id = auth.uid()` | `user_id = auth.uid()`   | Own rows only           | Own rows only           |
| `posts`             | All authenticated users                     | `user_id = auth.uid()`   | Own posts OR admin      | Own posts OR admin      |
| `votes`             | Own votes only                              | `user_id = auth.uid()`   | Own votes only          | Own votes only          |
| `messages`          | `sender_id` or `receiver_id = auth.uid()`   | `sender_id = auth.uid()` | —                       | Admin only              |
| `locations`         | Only accepted friends (see below)           | `user_id = auth.uid()`   | `user_id = auth.uid()`  | —                       |
| `moments`           | `user_id = auth.uid()`                      | `user_id = auth.uid()`   | `user_id = auth.uid()`  | `user_id = auth.uid()`  |
| `communities`       | All authenticated users                     | Any authenticated user   | Creator or admin        | Creator or admin        |
| `community_members` | Members of community or admin               | Own membership           | Community admin only    | Own membership or admin |
| `group_messages`    | Members of community                        | Members of community     | —                       | Sender or admin         |
| `reports`           | Own reports or admin                        | Any authenticated user   | Admin only              | Admin only              |
| `push_tokens`       | Own tokens only                             | `user_id = auth.uid()`   | Own tokens only         | Own tokens only         |

### 5.2 Locations RLS — Friends Only

This is the most nuanced policy. A user can only see locations of accepted friends who have `sharing = true`:

```sql
CREATE POLICY "Friends can view shared locations"
ON locations FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    sharing = true
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND user_id = auth.uid()
        AND friend_id = locations.user_id
    )
  )
);
```

### 5.3 Communities RLS — Members Only Chat

Group messages are only visible to community members:

```sql
CREATE POLICY "Community members can view group messages"
ON group_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = group_messages.community_id
      AND user_id = auth.uid()
  )
);
```

### 5.4 Reports RLS — Users Create, Admins Manage

```sql
CREATE POLICY "Users can create reports"
ON reports FOR INSERT
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports, admins view all"
ON reports FOR SELECT
USING (
  reporter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update reports"
ON reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### 5.5 Admin Override Policies

Admin users (`users.role = 'admin'`) have elevated access for moderation:

- **Posts:** Can UPDATE (e.g., hide) and DELETE any post
- **Messages:** Can DELETE any message (for moderation)
- **Group messages:** Can DELETE any group message
- **Reports:** Full CRUD
- **Community members:** Can remove any member from any community

Admin checks use a subquery: `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')`.

---

## 6. Realtime Subscriptions

Supabase Realtime is used for three features. All subscribe via the `supabase.channel()` API.

### 6.1 Messages

Subscribe to new messages where the current user is the receiver:

```typescript
supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`,
    },
    (payload) => {
      // Append to conversation state
    }
  )
  .subscribe();
```

**Lifecycle:** Subscribe on ChatListScreen mount, unsubscribe on unmount.

### 6.2 Friend Locations

Subscribe to location updates from accepted friends:

```typescript
supabase
  .channel('friend-locations')
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT and UPDATE
      schema: 'public',
      table: 'locations',
    },
    (payload) => {
      // RLS filters to only friends; update map markers
    }
  )
  .subscribe();
```

**Lifecycle:** Subscribe on MapScreen mount. Since RLS restricts visibility, the subscription only receives rows the user is authorized to see.

### 6.3 Group Messages

Subscribe to new messages in a specific community chat:

```typescript
supabase
  .channel(`group-${communityId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'group_messages',
      filter: `community_id=eq.${communityId}`,
    },
    (payload) => {
      // Append to group chat state
    }
  )
  .subscribe();
```

**Lifecycle:** Subscribe on GroupChatScreen mount for the active community, unsubscribe on unmount. RLS ensures only community members receive events.

---

## 7. Authentication Flow

### 7.1 Sign-Up

```
User enters email + password + username
  → supabase.auth.signUp({ email, password })
  → DB trigger creates row in public.users with auth.uid() + username
  → User is auto-logged in
  → Navigate to Map tab
```

The trigger that creates the user profile:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 7.2 Sign-In

```
User enters email + password
  → supabase.auth.signInWithPassword({ email, password })
  → Session stored in expo-secure-store
  → Navigate to Map tab
```

### 7.3 Session Persistence

On app launch:
1. Check `expo-secure-store` for existing session
2. If found, call `supabase.auth.setSession()` to restore
3. If expired, Supabase auto-refreshes the JWT
4. If no session, show LoginScreen

### 7.4 Auth Context

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

Wraps the entire app. All screens check `user` to gate access.

---

## 8. Screen-by-Screen Design

### 8.1 Map Screen (Default Tab)

**Purpose:** Live map showing friends and nearby posts.

**Data sources:**
- `locations` table (friends with `sharing = true`)
- `posts` table (within viewport bounding box)

**Behavior:**
1. On mount, request location permission via `expo-location`
2. Center map on user's current position
3. Fetch friends' locations → render `FriendMarker` components
4. Fetch posts within bounding box → render `PostMarker` components
5. Subscribe to realtime friend location changes
6. On map region change, re-query posts for new bounding box (debounced 500ms)

**Markers:**
- **Friend:** Small circle avatar with username label, colored dot
- **Post:** Pin icon; tap to expand inline card showing text + score

**FAB (Floating Action Button):** "+" button in bottom-right → opens CreatePostScreen

**Geo-query for posts (bounding box):**

```typescript
const fetchPostsInBounds = async (region: Region) => {
  const latDelta = region.latitudeDelta / 2;
  const lngDelta = region.longitudeDelta / 2;

  const { data } = await supabase
    .from('posts')
    .select('*')
    .gte('lat', region.latitude - latDelta)
    .lte('lat', region.latitude + latDelta)
    .gte('lng', region.longitude - lngDelta)
    .lte('lng', region.longitude + lngDelta)
    .order('created_at', { ascending: false })
    .limit(50);

  return data;
};
```

### 8.2 Feed Screen

**Purpose:** Scrollable list of nearby posts, sorted by recency or top score.

**Data flow:**
1. Get user's current location
2. Compute bounding box for ~2 mile radius
3. Query posts within bounds
4. Display as `PostCard` list

**Sorting toggle:** Segmented control at top: `Recent | Top`
- Recent: `ORDER BY created_at DESC`
- Top: `ORDER BY score DESC, created_at DESC`

**PostCard layout:**

```
┌─────────────────────────────────┐
│ @username (or "Anonymous")  2m  │
│                                 │
│ Post text content here...       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │     [optional image]        │ │
│ │     (tap to fullscreen)     │ │
│ └─────────────────────────────┘ │
│                                 │
│ ▲ 12 ▼      ⚑ Report  0.3 mi  │
└─────────────────────────────────┘
```

Images render as a 16:9 thumbnail. Tapping opens a full-screen image viewer. The report flag icon opens a confirmation dialog before submitting a report.

**Interactions:**
- Tap ▲/▼ to vote (optimistic update, then persist)
- Pull-to-refresh reloads feed

**Bounding box for radius:**

```typescript
const milesToDegLat = (miles: number) => miles / 69.0;
const milesToDegLng = (miles: number, lat: number) =>
  miles / (69.0 * Math.cos(lat * (Math.PI / 180)));
```

### 8.3 Create Post Screen

**Purpose:** Drop a post (text + optional image) at the user's current location.

**Fields:**
- Text input (max 500 chars, required)
- Image attach button (opens `expo-image-picker`)
- Anonymous toggle (switch)
- "Post" button

**Flow:**
1. Grab current location from `expo-location`
2. Show mini-map preview with pin at current location
3. If user attaches an image:
   - Compress/resize client-side (max 1024px wide, JPEG 80% quality)
   - Show thumbnail preview with "X" to remove
4. On submit:
   - If image attached: upload to Supabase Storage `post-images/{userId}/{uuid}.jpg`
   - Get public URL from Storage
   - Insert into `posts` table with `image_url`
   - Navigate back to Map or Feed
   - Post appears immediately (optimistic or refetch)

**Validation:**
- Text must be 1–500 characters
- Image max size: 5MB after compression
- Location must be available (show error if denied)

### 8.4 Chat List Screen

**Purpose:** List of all conversations — both 1:1 DMs and community group chats.

**Layout:** Two sections via a segmented control at top: `DMs | Groups`

**DMs section:**

Built client-side by:
1. Fetching all messages involving the current user
2. Grouping by the other user's ID
3. Taking the most recent message per group
4. Sorting groups by most recent message

**Groups section:**

Built by:
1. Fetching all communities where user is a member
2. For each, fetching the most recent `group_messages` row
3. Sorting by most recent message

**Row layout:**

```
DMs:
┌─────────────────────────────────┐
│ 🟢 @username                    │
│ Last message preview...    2m   │
└─────────────────────────────────┘

Groups:
┌─────────────────────────────────┐
│ 👥 Community Name               │
│ @sender: Last msg preview  5m   │
└─────────────────────────────────┘
```

Tap DM → navigate to ChatScreen. Tap Group → navigate to GroupChatScreen.

### 8.5 Chat Screen (1:1)

**Purpose:** Real-time messaging between two users.

**Data flow:**
1. Fetch message history between the two users, ordered by `created_at ASC`
2. Subscribe to realtime INSERT events filtered by `sender_id` = other user
3. Render messages in a FlatList (inverted)

**Message layout:**

```
        ┌──────────────────┐
        │ Their message     │  ← left-aligned, gray bg
        └──────────────────┘
  ┌──────────────────┐
  │ My message        │  ← right-aligned, blue bg
  └──────────────────┘
```

**Sending:**
1. Insert into `messages` table
2. Optimistically append to local state
3. Realtime delivers to the other user

**Query for conversation history:**

```typescript
const fetchConversation = async (otherUserId: string) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  return data;
};
```

### 8.6 Profile Screen

**Purpose:** User settings and friend management.

**Sections:**

1. **User Info**
   - Username display
   - Sign out button

2. **Location Sharing**
   - Toggle switch for `locations.sharing`
   - When off, the user's position is hidden from all friends

3. **Friends**
   - Text input to search by username
   - "Add Friend" button → inserts `friendships` row with `status = 'pending'`
   - List of current friends with status badges:
     - `pending` (outgoing): "Requested"
     - `pending` (incoming): "Accept / Decline" buttons
     - `accepted`: friend name, tap to open chat
   - Accept action: update own row to `'accepted'` + insert reciprocal row

4. **Moments**
   - Link to MomentsScreen

### 8.7 Moments Screen

**Purpose:** Manage private location pins.

**Features:**
- List of saved moments with title + distance from current location
- "Add Moment" → capture current location + enter title
- Swipe to delete
- Moments are **only visible to the owner** (enforced by RLS)

**Moment card:**

```
┌─────────────────────────────────┐
│ 📍 "Best coffee spot"           │
│ Saved Mar 15, 2026  •  0.2 mi  │
└─────────────────────────────────┘
```

### 8.8 Community List Screen

**Purpose:** Browse and discover communities. Accessible from the Communities tab.

**Sections:**
1. **My Communities** — communities the user is a member of, sorted by most recent group message
2. **Discover** — all communities the user is NOT a member of, sorted by member count

**Search:** Text input at top filters both sections by community name (client-side filter for MVP).

**Community card:**

```
┌─────────────────────────────────┐
│ 👥 Northside Dorm               │
│ A community for Northside...    │
│ 42 members           📍 0.3 mi  │
│                        [Join]   │
└─────────────────────────────────┘
```

**Actions:**
- Tap "Join" → insert `community_members` row
- Tap card → navigate to CommunityScreen

**FAB:** "+" button → opens CreateCommunityScreen

### 8.9 Community Screen (Detail)

**Purpose:** View a single community's details and enter its group chat.

**Layout:**

```
┌─────────────────────────────────┐
│ ← Back          Northside Dorm  │
│                                 │
│ A community for residents of    │
│ the Northside dormitory.        │
│                                 │
│ 42 members  •  Created Mar 10   │
│                                 │
│ [Enter Chat]     [Leave]        │
│                                 │
│ Members:                        │
│  @alice  @bob  @charlie  ...    │
└─────────────────────────────────┘
```

**Admin view** (if `role = 'admin'`):
- "Remove" button next to each member
- "Delete Community" in danger zone
- Member list shows role badges

### 8.10 Create Community Screen

**Purpose:** Create a new community.

**Fields:**
- Name (3–50 chars, required)
- Description (optional, max 500 chars)
- Pin to current location toggle (optional)

**Flow:**
1. Insert into `communities`
2. Insert creator into `community_members` with `role = 'admin'`
3. Navigate to the new CommunityScreen

### 8.11 Group Chat Screen

**Purpose:** Real-time group messaging within a community.

**Behavior:** Identical to the 1:1 ChatScreen but:
- Messages come from `group_messages` table filtered by `community_id`
- Each bubble shows the sender's username above the message
- Realtime subscription on `group_messages` for this community
- All community members can send and read

**Message layout:**

```
        @alice
        ┌──────────────────┐
        │ Their message     │  ← left-aligned
        └──────────────────┘
  ┌──────────────────┐
  │ My message        │  ← right-aligned
  └──────────────────┘
        @bob
        ┌──────────────────┐
        │ Another message   │  ← left-aligned
        └──────────────────┘
```

### 8.12 Admin Screen (Admin-Only)

**Purpose:** Moderation dashboard for users with `role = 'admin'`.

**Access:** Only visible in Profile tab if `user.role === 'admin'`. Non-admin users never see this screen.

**Sections:**

1. **Reports Queue**
   - List of all reports with `status = 'pending'`, sorted by `created_at ASC` (oldest first)
   - Each report shows: reporter username, target type, reason, timestamp
   - Tap to expand and see the reported content inline
   - Actions per report:
     - **Dismiss** → set `status = 'resolved'`, no further action
     - **Remove Content** → delete the reported post/message + set `status = 'resolved'`
     - **Ban User** → set reported user's account to disabled via Supabase Auth admin API

2. **Resolved Reports**
   - Collapsible list of past reports with outcomes

3. **Stats Overview**
   - Total users, total posts, total communities, pending reports count
   - Fetched via simple `COUNT(*)` queries

**Report card:**

```
┌─────────────────────────────────┐
│ ⚠ Report #42          pending   │
│ Type: post                      │
│ Reporter: @alice                │
│ Reason: "Inappropriate content" │
│                                 │
│ Reported content:               │
│ "The actual post text here..."  │
│                                 │
│ [Dismiss]  [Remove]  [Ban User] │
└─────────────────────────────────┘
```

---

## 9. Navigation Structure

```
Root
├── AuthStack (unauthenticated)
│   ├── LoginScreen
│   └── SignUpScreen
│
└── MainTabs (authenticated)
    ├── Map Tab
    │   ├── MapScreen
    │   └── CreatePostScreen (modal)
    │
    ├── Feed Tab
    │   └── FeedScreen
    │
    ├── Communities Tab
    │   ├── CommunityListScreen
    │   ├── CommunityScreen
    │   ├── CreateCommunityScreen
    │   └── GroupChatScreen
    │
    ├── Chat Tab
    │   ├── ChatListScreen
    │   ├── ChatScreen (1:1 DM)
    │   └── GroupChatScreen (also reachable from Communities)
    │
    └── Profile Tab
        ├── ProfileScreen
        ├── MomentsScreen
        └── AdminScreen (admin-only, conditionally rendered)
```

**Navigator types:**
- `NavigationContainer` at root
- Conditional render: `AuthStack` (Stack) if no session, `MainTabs` (BottomTab) if authenticated
- Each tab contains a nested Stack navigator for drill-down screens
- `AdminScreen` is only pushed onto the Profile stack if `user.role === 'admin'`
- `GroupChatScreen` is shared between Communities and Chat tabs (defined once, navigable from both)

---

## 10. State Management

No external state library. The app uses **React Context + local state** with the following contexts:

### 10.1 AuthContext

- Wraps entire app
- Provides `user`, `session`, `loading`, auth methods
- Listens to `supabase.auth.onAuthStateChange`

### 10.2 NotificationContext

- Wraps the app alongside AuthContext
- Registers push token on login
- Handles incoming notification routing (deep link to correct screen)
- Manages notification permissions state

### 10.3 Local Screen State

Each screen manages its own data via `useState` + `useEffect`:
- `MapScreen`: `posts[]`, `friendLocations[]`
- `FeedScreen`: `posts[]`, `sortMode`
- `ChatListScreen`: `conversations[]`, `groupConversations[]`
- `ChatScreen`: `messages[]`
- `GroupChatScreen`: `groupMessages[]`
- `CommunityListScreen`: `myCommunities[]`, `discoverCommunities[]`
- `AdminScreen`: `reports[]`, `stats`

### 10.4 Why No Global Store

With communities and notifications added, the app has moderate cross-screen state needs (e.g., unread counts, notification badges). For MVP, these are handled via:
- **AuthContext** for user + role
- **NotificationContext** for push state
- Per-screen data fetching

If complexity grows (e.g., real-time unread badges across tabs), Zustand can be added without refactoring.

---

## 11. Location Handling

### 11.1 Permissions

```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  // Show error: "Location is required for Ampd to work"
  return;
}
```

Only foreground permission is needed for MVP. Background location is out of scope.

### 11.2 User Location Updates

When the app is in the foreground:
1. `expo-location` watches position with `Location.watchPositionAsync()`
2. On each update (throttled to every 15 seconds minimum):
   - Upsert into `locations` table
   - Supabase Realtime broadcasts change to friends

```typescript
Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15000,
    distanceInterval: 50, // meters
  },
  (location) => {
    upsertLocation(location.coords.latitude, location.coords.longitude);
  }
);
```

### 11.3 Upsert Query

```typescript
const upsertLocation = async (lat: number, lng: number) => {
  await supabase
    .from('locations')
    .upsert(
      { user_id: userId, lat, lng, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
};
```

---

## 12. Voting System

### 12.1 Client Logic

```typescript
const vote = async (postId: string, value: 1 | -1) => {
  const { data: existing } = await supabase
    .from('votes')
    .select('id, value')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();

  if (existing) {
    if (existing.value === value) {
      // Undo vote
      await supabase.from('votes').delete().eq('id', existing.id);
    } else {
      // Flip vote
      await supabase.from('votes').update({ value }).eq('id', existing.id);
    }
  } else {
    // New vote
    await supabase.from('votes').insert({ user_id: userId, post_id: postId, value });
  }
};
```

### 12.2 Score Sync

The `update_post_score` trigger (Section 4.2) keeps `posts.score` in sync. The client does **optimistic updates** on the displayed score, then refetches to reconcile.

---

## 13. Friendship Flow

### 13.1 Add Friend

```
User A searches for "bob" → finds User B
User A taps "Add Friend"
  → INSERT friendships (user_id=A, friend_id=B, status='pending')
```

### 13.2 Accept Friend

```
User B sees pending request on Profile screen
User B taps "Accept"
  → UPDATE friendships SET status='accepted' WHERE user_id=A AND friend_id=B
  → INSERT friendships (user_id=B, friend_id=A, status='accepted')
```

Both rows now exist with `status='accepted'`, making queries symmetric.

### 13.3 Query My Friends

```typescript
const { data: friends } = await supabase
  .from('friendships')
  .select('friend_id, users!friendships_friend_id_fkey(username)')
  .eq('user_id', userId)
  .eq('status', 'accepted');
```

---

## 14. Push Notifications

### 14.1 Architecture

Push notifications use Expo's push notification service (Expo Push API) triggered by Supabase Edge Functions.

```
Event occurs (new message, friend request, etc.)
  → Supabase DB trigger fires
  → Calls Edge Function via pg_net or webhook
  → Edge Function reads push_tokens for target user(s)
  → Sends to Expo Push API
  → Expo routes to APNs (iOS) / FCM (Android)
  → Device receives push
```

### 14.2 Token Registration

On app launch, after auth:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const registerForPushNotifications = async () => {
  if (!Device.isDevice) return; // Push doesn't work on emulators

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform: Platform.OS },
      { onConflict: 'user_id,token' }
    );
};
```

### 14.3 Edge Function — Push Dispatcher

Located at `supabase/functions/push-notification/index.ts`.

Receives a payload with:
- `target_user_id` — who to notify
- `title` — notification title
- `body` — notification body
- `data` — navigation payload (e.g., `{ screen: 'Chat', userId: '...' }`)

```typescript
import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  const { target_user_id, title, body, data } = await req.json();

  // Fetch tokens for target user
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_id', target_user_id);

  // Send to Expo Push API
  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: 'default',
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
```

### 14.4 Notification Triggers

| Event                  | Title                    | Body                           | Data payload             |
| ---------------------- | ------------------------ | ------------------------------ | ------------------------ |
| New DM                 | "New message"            | `"@sender: message preview"`  | `{ screen: 'Chat', userId }` |
| New group message      | `"Community Name"`       | `"@sender: message preview"`  | `{ screen: 'GroupChat', communityId }` |
| Friend request received| "Friend request"         | `"@username wants to connect"` | `{ screen: 'Profile' }` |
| Friend request accepted| "Friend accepted"        | `"@username accepted your request"` | `{ screen: 'Profile' }` |
| Post near you (future) | "Nearby activity"        | `"New post 0.2 mi away"`      | `{ screen: 'Feed' }`    |

### 14.5 Client-Side Notification Handling

```typescript
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (data.screen === 'Chat') {
    navigation.navigate('Chat', { userId: data.userId });
  } else if (data.screen === 'GroupChat') {
    navigation.navigate('GroupChat', { communityId: data.communityId });
  }
});
```

---

## 15. Media Upload Pipeline

### 15.1 Supabase Storage Setup

**Bucket:** `post-images` (public read, authenticated write)

Storage policies:
- **INSERT:** `auth.uid()` must match the path prefix (`post-images/{userId}/...`)
- **SELECT:** Public (anyone can read — images are shown in the feed)
- **DELETE:** Only the uploader or admin

### 15.2 Upload Flow

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const pickAndUploadImage = async (): Promise<string | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
    aspect: [16, 9],
  });

  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const fileName = `${userId}/${crypto.randomUUID()}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('post-images')
    .upload(fileName, blob, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(fileName);

  return publicUrl;
};
```

### 15.3 Image Constraints

| Parameter    | Value              |
| ------------ | ------------------ |
| Max file size | 5 MB (after compression) |
| Format       | JPEG only          |
| Max width    | 1024px (auto-scaled) |
| Aspect ratio | Free (but 16:9 suggested) |
| Per-post     | 1 image max        |

### 15.4 Rendering

Images are displayed in `PostCard` and on the map (tapping a `PostMarker` shows the image in the expanded card). Uses `Image` component with `resizeMode="cover"` and lazy loading.

---

## 16. Communities & Group Chat

### 16.1 Community Lifecycle

```
User creates community (name + optional description + optional location)
  → Row in communities + community_members (role='admin')
  → Community appears in Discover for others
  → Others tap Join → community_members insert
  → Group chat is immediately available
```

### 16.2 Community Discovery

Communities are sorted by:
- **My Communities:** most recent group message first
- **Discover:** member count descending

Location-anchored communities show distance from the user. Non-location communities are global.

### 16.3 Group Chat Behavior

- Messages are stored in `group_messages`
- Realtime subscription per community (Section 6.3)
- All members can send; no muting or permissions tiers beyond admin
- Admin can delete any message
- Messages show sender username above each bubble

### 16.4 Leaving & Deletion

- Any member can leave (delete their `community_members` row)
- If the last admin leaves, the longest-tenured member is auto-promoted to admin
- Admin can delete the community → cascades to `community_members` and `group_messages`

---

## 17. Admin & Moderation

### 17.1 Admin Role

Admin access is controlled by `users.role = 'admin'`. This is set manually in the database — there is no UI to promote yourself. The first admin is seeded during deployment.

### 17.2 Report Flow

```
User taps ⚑ on a post/message/user
  → Confirmation dialog: "Report this content?"
  → User enters reason (text, required)
  → INSERT into reports
  → Admin sees it in AdminScreen reports queue
  → Admin takes action: Dismiss / Remove / Ban
```

### 17.3 Admin Actions

| Action         | What happens                                          |
| -------------- | ----------------------------------------------------- |
| **Dismiss**    | Set `reports.status = 'resolved'`, `reviewed_by = admin.id` |
| **Remove**     | Delete the reported content + resolve report          |
| **Ban User**   | Disable auth account via Supabase Admin API + resolve |

Banning uses the Supabase admin client (service role key, server-side only) to call:
```typescript
supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
```

This is done via an Edge Function to keep the service role key off the client.

### 17.4 Admin Dashboard Queries

```typescript
// Pending reports
const { data: reports } = await supabase
  .from('reports')
  .select('*, reporter:users!reporter_id(username)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true });

// Stats
const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
```

---

## 18. Security Considerations

### 14.1 Anonymous Posts

When `is_anonymous = true`, the client hides the username. However, `user_id` is still stored server-side for moderation. The RLS policy on `posts` allows all authenticated users to SELECT, but the client conditionally renders "Anonymous" instead of the username.

**Important:** This is a UI-level anonymity feature. A future version could use a database function to strip `user_id` from SELECT results for anonymous posts if stronger anonymity is needed.

### 14.2 Input Validation

- Post text: 1–500 characters, trimmed, no empty strings
- Username: 3–20 characters, alphanumeric + underscores only
- All user-supplied text is parameterized by Supabase (no SQL injection risk)

### 14.3 Rate Limiting

Out of scope for MVP. If abuse occurs, Supabase's built-in rate limiting on the API can be configured in the dashboard.

---

## 19. SQL Migration

The full DDL for the initial migration:

```sql
-- 001_initial_schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT auth.uid(),
  username   text UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 20),
  role       text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE friendships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat          float8 NOT NULL,
  lng          float8 NOT NULL,
  text         text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  image_url    text,
  is_anonymous boolean DEFAULT false,
  score        integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE votes (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value   smallint NOT NULL CHECK (value IN (1, -1)),
  UNIQUE (user_id, post_id)
);

CREATE TABLE messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE locations (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lat        float8 NOT NULL,
  lng        float8 NOT NULL,
  sharing    boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE moments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  lat        float8 NOT NULL,
  lng        float8 NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE communities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL CHECK (char_length(name) BETWEEN 3 AND 50),
  description text CHECK (char_length(description) <= 500),
  created_by  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat         float8,
  lng         float8,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE community_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at    timestamptz DEFAULT now(),
  UNIQUE (community_id, user_id)
);

CREATE TABLE group_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'message', 'user', 'group_message')),
  target_id   uuid NOT NULL,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_posts_location ON posts (lat, lng);
CREATE INDEX idx_posts_created ON posts (created_at DESC);
CREATE INDEX idx_messages_conversation ON messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at
);
CREATE INDEX idx_friendships_user ON friendships (user_id, status);
CREATE INDEX idx_friendships_friend ON friendships (friend_id, status);
CREATE INDEX idx_community_members_user ON community_members (user_id);
CREATE INDEX idx_community_members_community ON community_members (community_id);
CREATE INDEX idx_group_messages_community ON group_messages (community_id, created_at DESC);
CREATE INDEX idx_reports_status ON reports (status, created_at);
CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keep posts.score in sync with votes
CREATE OR REPLACE FUNCTION update_post_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET score = (
    SELECT COALESCE(SUM(value), 0) FROM votes
    WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
  ) WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_post_score();

-- Auto-add community creator as admin member
CREATE OR REPLACE FUNCTION add_community_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_community_created
  AFTER INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION add_community_creator();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (id = auth.uid());

-- friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own friendship rows"
  ON friendships FOR UPDATE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete own friendship rows"
  ON friendships FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- posts
CREATE POLICY "Posts are viewable by authenticated users"
  ON posts FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts or admin"
  ON posts FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own posts or admin"
  ON posts FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- votes
CREATE POLICY "Users can view own votes"
  ON votes FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE USING (user_id = auth.uid());

-- messages (private)
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admin can delete messages"
  ON messages FOR DELETE USING (is_admin());

-- locations (friends only)
CREATE POLICY "Users can view own or friends' shared locations"
  ON locations FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      sharing = true
      AND EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
          AND user_id = auth.uid()
          AND friend_id = locations.user_id
      )
    )
  );

CREATE POLICY "Users can upsert own location"
  ON locations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own location"
  ON locations FOR UPDATE
  USING (user_id = auth.uid());

-- moments (private)
CREATE POLICY "Users can view own moments"
  ON moments FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create moments"
  ON moments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own moments"
  ON moments FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own moments"
  ON moments FOR DELETE USING (user_id = auth.uid());

-- communities
CREATE POLICY "Communities are viewable by authenticated users"
  ON communities FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator or admin can update community"
  ON communities FOR UPDATE
  USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Creator or admin can delete community"
  ON communities FOR DELETE
  USING (created_by = auth.uid() OR is_admin());

-- community_members
CREATE POLICY "Members can view community membership"
  ON community_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Community admin can update members"
  ON community_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
    OR is_admin()
  );

CREATE POLICY "Users can leave or admin can remove"
  ON community_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
    OR is_admin()
  );

-- group_messages
CREATE POLICY "Community members can view group messages"
  ON group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = group_messages.community_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can send group messages"
  ON group_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = group_messages.community_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Sender or admin can delete group messages"
  ON group_messages FOR DELETE
  USING (sender_id = auth.uid() OR is_admin());

-- reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users view own reports, admins view all"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE USING (is_admin());

-- push_tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can register push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;

-- ============================================
-- STORAGE
-- ============================================

-- Run in Supabase dashboard or via API:
-- CREATE BUCKET post-images (public: true)
-- Storage policies:
--   INSERT: auth.uid()::text = (storage.foldername(name))[1]
--   SELECT: true (public)
--   DELETE: auth.uid()::text = (storage.foldername(name))[1] OR is_admin()
```

---

## 20. TypeScript Types

```typescript
// src/types/index.ts

export interface User {
  id: string;
  username: string;
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
```

---

## 21. API Surface (Service Layer)

Each service module exports async functions that wrap Supabase queries. No REST API is built — the client talks directly to Supabase (except Edge Functions for push notifications and admin actions).

| Module              | Functions                                                    |
| ------------------- | ------------------------------------------------------------ |
| `auth.ts`           | `signUp`, `signIn`, `signOut`, `getSession`                 |
| `posts.ts`          | `createPost`, `fetchPostsInBounds`, `fetchPostsInRadius`    |
| `votes.ts`          | `vote`, `getUserVotes`                                       |
| `friends.ts`        | `sendRequest`, `acceptRequest`, `declineRequest`, `getFriends`, `searchUsers` |
| `messages.ts`       | `sendMessage`, `fetchConversation`, `fetchConversationList`  |
| `groupMessages.ts`  | `sendGroupMessage`, `fetchGroupMessages`, `fetchGroupConversationList` |
| `communities.ts`    | `createCommunity`, `fetchCommunities`, `joinCommunity`, `leaveCommunity`, `fetchMembers`, `removeMember`, `deleteCommunity` |
| `locations.ts`      | `upsertLocation`, `fetchFriendLocations`, `toggleSharing`    |
| `moments.ts`        | `createMoment`, `fetchMoments`, `deleteMoment`               |
| `media.ts`          | `uploadImage`, `deleteImage`                                 |
| `notifications.ts`  | `registerPushToken`, `removePushToken`                       |
| `admin.ts`          | `fetchReports`, `resolveReport`, `removeContent`, `banUser`, `fetchStats` |

---

## 22. Performance Considerations

### 18.1 Map Post Loading

- Posts are fetched by **bounding box**, not radius (cheaper query, no trig functions)
- Capped at 50 posts per query
- Re-fetch is **debounced** (500ms) on map pan/zoom
- Markers are simple Views, not images, to reduce memory

### 18.2 Location Updates

- Throttled to every 15 seconds OR 50 meters of movement
- Uses `Accuracy.Balanced` (not `BestForNavigation`) to save battery
- Upserts (not inserts) keep the table at exactly one row per user

### 18.3 Chat

- Messages are fetched in pages of 50 (cursor-based pagination by `created_at`)
- FlatList is inverted for chat UX
- Realtime subscription avoids polling

### 18.4 Feed

- Pull-to-refresh, no infinite scroll for MVP
- Posts older than 24 hours could be filtered out in a future version

---

## 23. Error Handling Strategy

| Scenario                | Handling                                         |
| ----------------------- | ------------------------------------------------ |
| No location permission  | Show full-screen prompt to enable in settings    |
| Network failure         | Show inline error banner, retry button           |
| Auth token expired      | Supabase auto-refreshes; if fails, redirect to login |
| Empty feed              | Show "No posts nearby" placeholder               |
| Empty chat list         | Show "Start a conversation" CTA                  |
| Failed post creation    | Show toast error, keep text in input             |
| Image upload failure    | Show toast error, allow retry without re-picking |
| Push permission denied  | App works without notifs; show banner suggesting enable |
| Community not found     | Show "Community deleted" and navigate back       |
| Report submission error | Show toast error, keep reason in input           |
| Admin action failure    | Show error toast with reason, no state change    |

---

## 24. Future Considerations (Post-MVP)

These are explicitly **out of scope** but noted for awareness:

- **Background location** for persistent sharing
- **Video uploads** on posts
- **Post expiry** (auto-delete after 24h)
- **Geofenced campus boundaries**
- **PostGIS** for proper spatial indexing (replaces bounding box queries)
- **Unread message count** badge on Chat tab
- **Muting/blocking** users at the user level
- **Community roles** beyond member/admin (e.g., moderator)
- **Threaded replies** on posts
- **OAuth providers** (Google, Apple Sign-In)

---

## 25. Development Milestones

| Phase | Scope                                          | Est. Effort |
| ----- | ---------------------------------------------- | ----------- |
| 1     | Project setup, auth, navigation shell          | 1 day       |
| 2     | Database migration, Supabase config, RLS       | 1 day       |
| 3     | Map screen + post markers                      | 1 day       |
| 4     | Feed screen + voting + image display           | 1 day       |
| 5     | Create post flow + image upload pipeline       | 1 day       |
| 6     | Friends system + location sharing              | 1 day       |
| 7     | 1:1 Chat (list + realtime)                     | 1 day       |
| 8     | Communities + group chat                       | 1.5 days    |
| 9     | Push notifications (tokens, Edge Function)     | 1 day       |
| 10    | Admin dashboard + report system                | 1 day       |
| 11    | Profile + moments                              | 0.5 day     |
| 12    | Polish, error handling, testing                | 1.5 days    |
|       | **Total**                                      | **~12 days** |

---

## 26. Environment Variables

**Client-side** (`.env` at project root, shipped in app):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

The anon key is safe to ship in the client — RLS protects all data access.

**Server-side** (Edge Function environment, set in Supabase dashboard):

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

The service role key is used by Edge Functions only (push dispatch, admin ban). Never shipped to the client.

---

*End of design document.*
