-- Map MVP backend: friendships, live friend locations, and heatmap activity points.
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  addressee_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair_symmetric
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

create index if not exists friendships_addressee_status_idx
  on public.friendships (addressee_id, status);

create table if not exists public.live_locations (
  user_id uuid primary key,
  latitude double precision not null default 0,
  longitude double precision not null default 0,
  accuracy_meters double precision,
  is_sharing_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint valid_latitude check (latitude >= -90 and latitude <= 90),
  constraint valid_longitude check (longitude >= -180 and longitude <= 180)
);

create index if not exists live_locations_updated_at_idx
  on public.live_locations (updated_at desc);

create table if not exists public.activity_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  latitude double precision not null,
  longitude double precision not null,
  type text not null default 'checkin',
  weight double precision not null default 1,
  school_id text,
  created_at timestamptz not null default now(),
  constraint activity_points_valid_latitude check (latitude >= -90 and latitude <= 90),
  constraint activity_points_valid_longitude check (longitude >= -180 and longitude <= 180)
);

create index if not exists activity_points_created_at_idx
  on public.activity_points (created_at desc);

create index if not exists activity_points_school_created_at_idx
  on public.activity_points (school_id, created_at desc);

create index if not exists activity_points_lat_lng_idx
  on public.activity_points (latitude, longitude);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

drop trigger if exists live_locations_set_updated_at on public.live_locations;
create trigger live_locations_set_updated_at
before update on public.live_locations
for each row execute function public.set_updated_at();

alter table public.friendships enable row level security;
alter table public.live_locations enable row level security;
alter table public.activity_points enable row level security;

drop policy if exists "Friendships select mine" on public.friendships;
create policy "Friendships select mine"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Friendships create as requester" on public.friendships;
create policy "Friendships create as requester"
  on public.friendships for insert
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

drop policy if exists "Friendships update participants" on public.friendships;
create policy "Friendships update participants"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Live locations select accepted friends" on public.live_locations;
create policy "Live locations select accepted friends"
  on public.live_locations for select
  using (
    is_sharing_enabled = true
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = live_locations.user_id)
          or
          (f.addressee_id = auth.uid() and f.requester_id = live_locations.user_id)
        )
    )
  );

drop policy if exists "Live locations upsert own row" on public.live_locations;
create policy "Live locations upsert own row"
  on public.live_locations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Live locations update own row" on public.live_locations;
create policy "Live locations update own row"
  on public.live_locations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Activity points read all" on public.activity_points;
create policy "Activity points read all"
  on public.activity_points for select
  using (true);

drop policy if exists "Activity points insert own or anonymous" on public.activity_points;
create policy "Activity points insert own or anonymous"
  on public.activity_points for insert
  with check (user_id is null or user_id = auth.uid());

-- Temporary development fallback if auth is not wired yet.
-- Enable only in early local/dev builds and remove once auth is active:
-- create policy "DEV live locations read all"
--   on public.live_locations for select
--   using (true);
