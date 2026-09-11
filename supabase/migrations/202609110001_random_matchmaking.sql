create extension if not exists pgcrypto;

create type public.queue_status as enum ('waiting', 'matched', 'cancelled', 'expired');
create type public.room_status as enum ('waiting', 'active', 'ended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Guest',
  is_age_verified boolean not null default false,
  age_gate_accepted_at timestamptz,
  age_gate_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  status public.room_status not null default 'waiting',
  max_participants smallint not null check (max_participants between 2 and 4),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table public.match_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  desired_people smallint not null check (desired_people between 1 and 3),
  status public.queue_status not null default 'waiting',
  room_id uuid references public.rooms(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

create table public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create table public.blocked_users (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index match_queue_waiting_lookup on public.match_queue (desired_people, created_at) where status = 'waiting';
create unique index one_waiting_match_per_user on public.match_queue (user_id) where status = 'waiting';
create unique index one_active_room_per_user on public.room_participants (user_id) where left_at is null;
create index room_participants_room_lookup on public.room_participants (room_id) where left_at is null;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.match_queue enable row level security;
alter table public.room_participants enable row level security;
alter table public.blocked_users enable row level security;

create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users read own queue" on public.match_queue for select using (user_id = auth.uid());
create policy "participants read own rooms" on public.room_participants for select using (user_id = auth.uid());
create policy "users manage own blocks" on public.blocked_users for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid() and blocker_id <> blocked_id);
create policy "participants read joined room" on public.rooms for select using (exists (select 1 from public.room_participants p where p.room_id = id and p.user_id = auth.uid() and p.left_at is null));

create or replace function public.join_matchmaking(requested_people smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  queue_entry public.match_queue;
  candidate public.match_queue;
  selected_ids uuid[] := '{}';
  room uuid;
  needed integer;
  compatible boolean;
begin
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if requested_people not between 1 and 3 then raise exception 'invalid_group_size'; end if;
  if not exists (select 1 from profiles where id = current_user_id and is_age_verified) then raise exception 'age_verification_required'; end if;
  needed := requested_people + 1;
  perform pg_advisory_xact_lock(4242, requested_people);

  update match_queue set status = 'expired' where user_id = current_user_id and status = 'waiting' and expires_at <= now();
  if exists (select 1 from room_participants where user_id = current_user_id and left_at is null) then raise exception 'already_in_room'; end if;

  insert into match_queue (user_id, desired_people)
  values (current_user_id, requested_people)
  on conflict (user_id) where status = 'waiting' do update set expires_at = now() + interval '5 minutes'
  returning * into queue_entry;

  for candidate in
    select q.* from match_queue q
    where q.status = 'waiting'
      and q.desired_people = requested_people
      and q.expires_at > now()
      and q.id <> queue_entry.id
      and not exists (
        select 1 from blocked_users b
        where (b.blocker_id = current_user_id and b.blocked_id = q.user_id)
           or (b.blocker_id = q.user_id and b.blocked_id = current_user_id)
      )
    order by (q.created_at < now() - interval '30 seconds') desc, random()
    for update skip locked
    limit 20
  loop
    select not exists (
      select 1 from unnest(selected_ids) picked
      join blocked_users b on (b.blocker_id = picked and b.blocked_id = candidate.user_id) or (b.blocker_id = candidate.user_id and b.blocked_id = picked)
    ) into compatible;
    if compatible then selected_ids := array_append(selected_ids, candidate.user_id); end if;
    exit when cardinality(selected_ids) = needed - 1;
  end loop;

  if cardinality(selected_ids) < needed - 1 then
    return jsonb_build_object('status', 'waiting', 'room_id', null);
  end if;

  selected_ids := array_append(selected_ids, current_user_id);
  insert into rooms (status, max_participants, started_at) values ('active', needed, now()) returning id into room;
  insert into room_participants (room_id, user_id) select room, unnest(selected_ids);
  update match_queue set status = 'matched', room_id = room where user_id = any(selected_ids) and status = 'waiting';
  return jsonb_build_object('status', 'matched', 'room_id', room);
end;
$$;

create or replace function public.accept_age_gate()
returns void language sql security definer set search_path = public as $$
  insert into profiles (id, is_age_verified, age_gate_accepted_at, age_gate_version)
  values (auth.uid(), true, now(), '18-plus-v1')
  on conflict (id) do update set is_age_verified = true, age_gate_accepted_at = now(), age_gate_version = '18-plus-v1', updated_at = now();
$$;

create or replace function public.cancel_matchmaking()
returns void language sql security definer set search_path = public as $$
  update match_queue set status = 'cancelled' where user_id = auth.uid() and status = 'waiting';
$$;

create or replace function public.leave_room(target_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update room_participants set left_at = now() where room_id = target_room_id and user_id = auth.uid() and left_at is null;
  if not exists (select 1 from room_participants where room_id = target_room_id and left_at is null) then
    update rooms set status = 'ended', ended_at = now() where id = target_room_id and status <> 'ended';
  end if;
end;
$$;

grant execute on function public.join_matchmaking(smallint) to authenticated;
grant execute on function public.accept_age_gate() to authenticated;
grant execute on function public.cancel_matchmaking() to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
