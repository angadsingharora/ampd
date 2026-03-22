# Ampd — Design Document

**Version:** 1.0
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

- No group chats or communities
- No media uploads (text-only posts)
- No push notifications
- No admin panel or moderation tools
- No stories, reels, or ephemeral content

---

## 2. Tech Stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Mobile Runtime | React Native (Expo SDK 52+)       |
| Language       | TypeScript (strict mode)          |
| Navigation     | React Navigation v7 (bottom tabs) |
| Maps           | react-native-maps (Google/Apple)  |
| Backend        | Supabase (hosted)                 |
| Database       | PostgreSQL (via Supabase)         |
| Auth           | Supabase Auth (email/password)    |
| Realtime       | Supabase Realtime (WebSocket)     |
| State          | React Context + useReducer        |
| Location       | expo-location                     |

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
  "react-native-safe-area-context": "^5.x",
  "react-native-screens": "^4.x"
}
```

---

## 3. Architecture

### 3.1 High-Level Diagram

```
┌──────────────────────────────────────────────────┐
│                   React Native App               │
│                                                  │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌─────────┐      │
│  │ Map  │  │ Feed │  │ Chat │  │ Profile │      │
│  │Screen│  │Screen│  │Screen│  │ Screen  │      │
│  └──┬───┘  └──┬───┘  └──┬───┘  └────┬────┘      │
│     │         │         │            │           │
│  ┌──┴─────────┴─────────┴────────────┴──┐        │
│  │          Service Layer               │        │
│  │  (posts, friends, messages, etc.)    │        │
│  └──────────────┬───────────────────────┘        │
│                 │                                │
│  ┌──────────────┴───────────────────────┐        │
│  │        Supabase Client               │        │
│  │  (Auth, DB, Realtime, PostGIS)       │        │
│  └──────────────┬───────────────────────┘        │
└─────────────────┼────────────────────────────────┘
                  │ HTTPS + WSS
┌─────────────────┼────────────────────────────────┐
│           Supabase Platform                      │
│  ┌──────────┐ ┌───────────┐ ┌──────────────┐    │
│  │   Auth   │ │ Postgres  │ │  Realtime     │    │
│  │          │ │ + PostGIS │ │  (WebSocket)  │    │
│  └──────────┘ └───────────┘ └──────────────┘    │
└──────────────────────────────────────────────────┘
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
│   │   ├── MapScreen.tsx       # Live map (default tab)
│   │   ├── FeedScreen.tsx      # Location-based feed
│   │   ├── ChatListScreen.tsx  # Conversation list
│   │   ├── ChatScreen.tsx      # 1:1 message thread
│   │   ├── ProfileScreen.tsx   # User profile + settings
│   │   ├── CreatePostScreen.tsx# Drop a post
│   │   ├── MomentsScreen.tsx   # Private pins
│   │   ├── LoginScreen.tsx     # Auth: login
│   │   └── SignUpScreen.tsx    # Auth: register
│   │
│   ├── components/
│   │   ├── PostCard.tsx        # Post display in feed
│   │   ├── PostMarker.tsx      # Post pin on map
│   │   ├── FriendMarker.tsx    # Friend dot on map
│   │   ├── VoteButtons.tsx     # Upvote/downvote controls
│   │   ├── ChatBubble.tsx      # Single message bubble
│   │   └── FriendListItem.tsx  # Friend row component
│   │
│   ├── services/
│   │   ├── supabase.ts         # Supabase client init
│   │   ├── auth.ts             # Sign up, sign in, sign out
│   │   ├── posts.ts            # CRUD + geo-query for posts
│   │   ├── votes.ts            # Upvote/downvote logic
│   │   ├── friends.ts          # Friend requests + status
│   │   ├── messages.ts         # Send/fetch messages
│   │   ├── locations.ts        # Update/fetch locations
│   │   └── moments.ts          # Private pin CRUD
│   │
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth state hook
│   │   ├── useLocation.ts      # Device location tracking
│   │   ├── useRealtime.ts      # Generic realtime subscription
│   │   └── usePosts.ts         # Posts with geo-filter
│   │
│   ├── context/
│   │   └── AuthContext.tsx      # Auth provider
│   │
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   │
│   └── utils/
│       ├── geo.ts              # Haversine, bounding box math
│       └── time.ts             # Relative timestamps
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Full DDL + RLS
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
└──────────┘       └─────────────┘       └──────────┘
```

### 4.2 Table Definitions

#### `users`

| Column       | Type        | Constraints                  |
| ------------ | ----------- | ---------------------------- |
| `id`         | `uuid`      | PK, default `auth.uid()`     |
| `username`   | `text`      | UNIQUE, NOT NULL             |
| `created_at` | `timestamptz` | default `now()`            |

Maps 1:1 with `auth.users`. Created via a trigger on sign-up.

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
| `is_anonymous` | `boolean`     | default `false`                 |
| `score`        | `integer`     | default `0`                     |
| `created_at`   | `timestamptz` | default `now()`                 |

**Index:** `idx_posts_location` on `(lat, lng)` for geo-queries.

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

---

## 5. Row-Level Security (RLS)

RLS is **enabled on every table**. All policies use `auth.uid()` to identify the current user.

### 5.1 Policy Summary

| Table         | SELECT                                      | INSERT                   | UPDATE                  | DELETE                  |
| ------------- | ------------------------------------------- | ------------------------ | ----------------------- | ----------------------- |
| `users`       | All authenticated users                     | Only own row (via trigger) | Own row only           | —                       |
| `friendships` | Where `user_id = auth.uid()` or `friend_id = auth.uid()` | `user_id = auth.uid()`  | Own rows only          | Own rows only           |
| `posts`       | All authenticated users                     | `user_id = auth.uid()`   | Own posts only          | Own posts only          |
| `votes`       | Own votes only                              | `user_id = auth.uid()`   | Own votes only          | Own votes only          |
| `messages`    | `sender_id` or `receiver_id = auth.uid()`   | `sender_id = auth.uid()` | —                       | —                       |
| `locations`   | Only accepted friends (see below)           | `user_id = auth.uid()`   | `user_id = auth.uid()`  | —                       |
| `moments`     | `user_id = auth.uid()`                      | `user_id = auth.uid()`   | `user_id = auth.uid()`  | `user_id = auth.uid()`  |

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

---

## 6. Realtime Subscriptions

Supabase Realtime is used for two features. Both subscribe via the `supabase.channel()` API.

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
│ ▲ 12 ▼           0.3 mi away   │
└─────────────────────────────────┘
```

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

**Purpose:** Drop a text post at the user's current location.

**Fields:**
- Text input (max 500 chars, required)
- Anonymous toggle (switch)
- "Post" button

**Flow:**
1. Grab current location from `expo-location`
2. Show mini-map preview with pin at current location
3. On submit:
   - Insert into `posts` table
   - Navigate back to Map or Feed
   - Post appears immediately (optimistic or refetch)

**Validation:**
- Text must be 1–500 characters
- Location must be available (show error if denied)

### 8.4 Chat List Screen

**Purpose:** List of conversations with other users.

**Query:**
```sql
SELECT DISTINCT ON (conversation_partner)
  CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END AS partner_id,
  text AS last_message,
  created_at
FROM messages
WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
ORDER BY conversation_partner, created_at DESC;
```

In practice, this is done client-side by:
1. Fetching all messages involving the current user
2. Grouping by the other user's ID
3. Taking the most recent message per group
4. Sorting groups by most recent message

**Row layout:**

```
┌─────────────────────────────────┐
│ 🟢 @username                    │
│ Last message preview...    2m   │
└─────────────────────────────────┘
```

Tap → navigate to ChatScreen with that user.

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
    ├── Chat Tab
    │   ├── ChatListScreen
    │   └── ChatScreen
    │
    └── Profile Tab
        ├── ProfileScreen
        └── MomentsScreen
```

**Navigator types:**
- `NavigationContainer` at root
- Conditional render: `AuthStack` (Stack) if no session, `MainTabs` (BottomTab) if authenticated
- Each tab contains a nested Stack navigator for drill-down screens

---

## 10. State Management

No external state library. The app uses **React Context + local state** with the following contexts:

### 10.1 AuthContext

- Wraps entire app
- Provides `user`, `session`, `loading`, auth methods
- Listens to `supabase.auth.onAuthStateChange`

### 10.2 Local Screen State

Each screen manages its own data via `useState` + `useEffect`:
- `MapScreen`: `posts[]`, `friendLocations[]`
- `FeedScreen`: `posts[]`, `sortMode`
- `ChatListScreen`: `conversations[]`
- `ChatScreen`: `messages[]`

### 10.3 Why No Global Store

The MVP has no cross-screen state dependencies complex enough to justify Redux/Zustand. Each screen fetches its own data. The only shared state is auth (handled by context).

If state sharing becomes necessary later (e.g., unread message counts in the tab bar), a lightweight store like Zustand can be added without refactoring.

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

## 14. Security Considerations

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

## 15. SQL Migration

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

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE USING (user_id = auth.uid());

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

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for messages and locations
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
```

---

## 16. TypeScript Types

```typescript
// src/types/index.ts

export interface User {
  id: string;
  username: string;
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
  is_anonymous: boolean;
  score: number;
  created_at: string;
  // Joined
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
  // Joined
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

export type SortMode = 'recent' | 'top';

export interface Conversation {
  partner_id: string;
  partner_username: string;
  last_message: string;
  last_message_at: string;
}
```

---

## 17. API Surface (Service Layer)

Each service module exports async functions that wrap Supabase queries. No REST API is built — the client talks directly to Supabase.

| Module          | Functions                                                    |
| --------------- | ------------------------------------------------------------ |
| `auth.ts`       | `signUp`, `signIn`, `signOut`, `getSession`                 |
| `posts.ts`      | `createPost`, `fetchPostsInBounds`, `fetchPostsInRadius`    |
| `votes.ts`      | `vote`, `getUserVotes`                                       |
| `friends.ts`    | `sendRequest`, `acceptRequest`, `declineRequest`, `getFriends`, `searchUsers` |
| `messages.ts`   | `sendMessage`, `fetchConversation`, `fetchConversationList`  |
| `locations.ts`  | `upsertLocation`, `fetchFriendLocations`, `toggleSharing`    |
| `moments.ts`    | `createMoment`, `fetchMoments`, `deleteMoment`               |

---

## 18. Performance Considerations

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

## 19. Error Handling Strategy

| Scenario              | Handling                                         |
| --------------------- | ------------------------------------------------ |
| No location permission | Show full-screen prompt to enable in settings   |
| Network failure        | Show inline error banner, retry button           |
| Auth token expired     | Supabase auto-refreshes; if fails, redirect to login |
| Empty feed             | Show "No posts nearby" placeholder               |
| Empty chat list        | Show "Start a conversation" CTA                  |
| Failed post creation   | Show toast error, keep text in input              |

---

## 20. Future Considerations (Post-MVP)

These are explicitly **out of scope** but noted for awareness:

- **Push notifications** via Expo Notifications + Supabase Edge Functions
- **Background location** for persistent sharing
- **Media attachments** on posts (images via Supabase Storage)
- **Group chats**
- **Post expiry** (auto-delete after 24h)
- **Geofenced campus boundaries**
- **Moderation tools** (report, block, content filtering)
- **PostGIS** for proper spatial indexing (replaces bounding box queries)
- **Unread message count** badge on Chat tab

---

## 21. Development Milestones

| Phase | Scope                                     | Est. Effort |
| ----- | ----------------------------------------- | ----------- |
| 1     | Project setup, auth, navigation shell     | 1 day       |
| 2     | Database migration, Supabase config, RLS  | 0.5 day     |
| 3     | Map screen + post markers                 | 1 day       |
| 4     | Feed screen + voting                      | 1 day       |
| 5     | Create post flow                          | 0.5 day     |
| 6     | Friends system + location sharing         | 1 day       |
| 7     | Chat (list + 1:1 realtime)                | 1 day       |
| 8     | Profile + moments                         | 0.5 day     |
| 9     | Polish, error handling, testing           | 1 day       |
|       | **Total**                                 | **~7 days** |

---

## 22. Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

Stored in `.env` at project root. Accessed via `process.env.EXPO_PUBLIC_*` (Expo convention). The anon key is safe to ship in the client — RLS protects all data access.

---

*End of design document.*
