create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index room_messages_room_created on public.room_messages (room_id, created_at);
alter table public.room_messages enable row level security;

create policy "room members read messages" on public.room_messages for select using (
  exists (select 1 from public.room_participants p where p.room_id = room_messages.room_id and p.user_id = auth.uid() and p.left_at is null)
);
create policy "room members send messages" on public.room_messages for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.room_participants p where p.room_id = room_messages.room_id and p.user_id = auth.uid() and p.left_at is null
  )
);

do $$
begin
  alter publication supabase_realtime add table public.room_messages;
exception when duplicate_object then null;
end $$;

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
  open_room public.rooms;
  selected_user uuid;
  room uuid;
  needed integer := requested_people + 1;
  candidate_compatible boolean;
  current_count integer;
begin
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if requested_people not between 1 and 3 then raise exception 'invalid_group_size'; end if;
  if not exists (select 1 from profiles where id = current_user_id and is_age_verified) then raise exception 'age_verification_required'; end if;
  perform pg_advisory_xact_lock(4242, requested_people);

  update match_queue set status = 'expired'
  where user_id = current_user_id and status = 'waiting' and expires_at <= now();
  if exists (select 1 from room_participants where user_id = current_user_id and left_at is null) then
    raise exception 'already_in_room';
  end if;

  select * into queue_entry from match_queue
  where user_id = current_user_id and status in ('waiting', 'matched')
  order by created_at desc limit 1 for update;
  if queue_entry.status = 'matched' and queue_entry.room_id is not null then
    return jsonb_build_object('status', 'matched', 'room_id', queue_entry.room_id);
  end if;
  if queue_entry.id is null then
    insert into match_queue (user_id, desired_people) values (current_user_id, requested_people) returning * into queue_entry;
  else
    update match_queue set desired_people = requested_people, expires_at = now() + interval '5 minutes'
    where id = queue_entry.id returning * into queue_entry;
  end if;

  select r.* into open_room from rooms r
  where r.status = 'waiting' and r.max_participants = needed
    and (select count(*) from room_participants p where p.room_id = r.id and p.left_at is null) < r.max_participants
    and not exists (
      select 1 from room_participants p join blocked_users b on
        (b.blocker_id = current_user_id and b.blocked_id = p.user_id)
        or (b.blocker_id = p.user_id and b.blocked_id = current_user_id)
      where p.room_id = r.id and p.left_at is null
    )
  order by r.created_at
  for update skip locked limit 1;

  if open_room.id is not null then
    insert into room_participants (room_id, user_id) values (open_room.id, current_user_id);
    select count(*) into current_count from room_participants where room_id = open_room.id and left_at is null;
    update rooms set status = case when current_count >= needed then 'active' else 'waiting' end where id = open_room.id;
    update match_queue set status = 'matched', room_id = open_room.id where id = queue_entry.id;
    return jsonb_build_object('status', 'matched', 'room_id', open_room.id);
  end if;

  select q.* into candidate from match_queue q
  where q.status = 'waiting' and q.desired_people = requested_people and q.id <> queue_entry.id and q.expires_at > now()
    and not exists (
      select 1 from blocked_users b where (b.blocker_id = current_user_id and b.blocked_id = q.user_id)
        or (b.blocker_id = q.user_id and b.blocked_id = current_user_id)
    )
  order by (q.created_at < now() - interval '30 seconds') desc, random()
  for update skip locked limit 1;

  if candidate.id is null then
    return jsonb_build_object('status', 'waiting', 'room_id', null);
  end if;

  select not exists (
    select 1 from blocked_users b where (b.blocker_id = candidate.user_id and b.blocked_id = current_user_id)
      or (b.blocker_id = current_user_id and b.blocked_id = candidate.user_id)
  ) into candidate_compatible;
  if not candidate_compatible then
    return jsonb_build_object('status', 'waiting', 'room_id', null);
  end if;

  insert into rooms (status, max_participants, started_at) values (case when needed = 2 then 'active' else 'waiting' end, needed, now()) returning id into room;
  insert into room_participants (room_id, user_id) values (room, current_user_id), (room, candidate.user_id);
  update match_queue set status = 'matched', room_id = room where id in (queue_entry.id, candidate.id);
  return jsonb_build_object('status', 'matched', 'room_id', room);
end;
$$;

create or replace function public.leave_room(target_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update room_participants set left_at = now()
  where room_id = target_room_id and user_id = auth.uid() and left_at is null;
  update match_queue set status = 'cancelled'
  where room_id = target_room_id and user_id = auth.uid() and status = 'matched';
  if not exists (select 1 from room_participants where room_id = target_room_id and left_at is null) then
    update rooms set status = 'ended', ended_at = now() where id = target_room_id and status <> 'ended';
  end if;
end;
$$;
