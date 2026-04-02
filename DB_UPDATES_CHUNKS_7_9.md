# DB Updates Needed for Chunks 7-9

This file summarizes the Supabase/database changes needed to support the recently added Chat, Communities, and Dating code.

## Current State

Your `003_full_schema.sql` already contains the required tables, most triggers, and baseline RLS policies for chunks 7-9.

What is still needed:
- 1 policy fix for community member counts in Discover.
- 4 performance indexes for query patterns used by the new services.

## 1) Required Policy Fix (Communities Discover counts)

## Why this is needed

`fetchCommunities()` computes `member_count` by reading `community_members` rows for all communities.  
Current policy only allows selecting membership rows if the current user is in that community (or admin), so Discover counts can be hidden/incorrect.

App code affected:
- `src/services/communities.ts`

## Recommended approach

Use a `SECURITY DEFINER` function for member counts. This preserves membership privacy while allowing global counts.

```sql
-- 1. Function to expose only aggregated counts (not member identities)
create or replace function public.get_community_member_counts()
returns table (
  community_id uuid,
  member_count bigint
)
language sql
security definer
set search_path = public
as $$
  select cm.community_id, count(*)::bigint as member_count
  from public.community_members cm
  group by cm.community_id
$$;

-- 2. Allow authenticated users to call it
grant execute on function public.get_community_member_counts() to authenticated;
```

Then update the app service to call RPC instead of selecting raw `community_members` rows for Discover counts.

## Simpler alternative (less private)

If you are okay exposing membership rows to all authenticated users:

```sql
create policy "Authenticated users can view all community membership rows"
  on public.community_members
  for select
  using (auth.role() = 'authenticated');
```

Use this only if your product is okay with non-members seeing community membership data.

## 2) Recommended Indexes (Performance)

These match the exact filters/sorts used in the new services.

### A) Direct messages indexes

`messages.ts` frequently queries by sender/receiver pairs and recency.

```sql
create index if not exists idx_messages_sender_receiver_created
  on public.messages (sender_id, receiver_id, created_at desc);

create index if not exists idx_messages_receiver_sender_created
  on public.messages (receiver_id, sender_id, created_at desc);
```

### B) Dating matches indexes

`dating.ts` queries matches with `user_a = ? OR user_b = ?`.

```sql
create index if not exists idx_dating_matches_user_a
  on public.dating_matches (user_a);

create index if not exists idx_dating_matches_user_b
  on public.dating_matches (user_b);
```

## 3) Suggested Migration File

Create a new migration, for example:
- `supabase/migrations/004_chunk7_9_policy_indexes.sql`

Include:
- The policy solution you choose from Section 1.
- All four indexes from Section 2.

## 4) Post-Migration Verification Checklist

1. Run migrations.
2. In app, open Communities tab:
- Discover list should show realistic member counts (not all zeros).
3. Open DM chat and group chat:
- Messages should still read/send correctly.
4. Run quick explain plans in SQL editor for key queries (optional) to confirm index usage.

