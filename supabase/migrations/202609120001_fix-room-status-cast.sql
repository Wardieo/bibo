create or replace function public.join_matchmaking(requested_people smallint, requested_mode text)
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
  room uuid;
  needed integer := requested_people + 1;
  current_count integer;
begin
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if requested_people not between 1 and 3 then raise exception 'invalid_group_size'; end if;
  if requested_mode not in ('video', 'text') then raise exception 'invalid_match_mode'; end if;
  if not exists (select 1 from profiles where id = current_user_id and is_age_verified) then raise exception 'age_verification_required'; end if;
  perform pg_advisory_xact_lock(hashtext(requested_mode), requested_people);

  if exists (select 1 from room_participants where user_id = current_user_id and left_at is null) then
    raise exception 'already_in_room';
  end if;

  select * into queue_entry from match_queue
  where user_id = current_user_id and status in ('waiting', 'matched')
    and match_mode = requested_mode and desired_people = requested_people
  order by created_at desc limit 1 for update;

  if queue_entry.status = 'matched' and queue_entry.room_id is not null then
    return jsonb_build_object('status', 'matched', 'room_id', queue_entry.room_id);
  end if;

  if queue_entry.id is null then
    insert into match_queue (user_id, desired_people, match_mode)
    values (current_user_id, requested_people, requested_mode)
    returning * into queue_entry;
  else
    update match_queue set expires_at = now() + interval '5 minutes', status = 'waiting'
    where id = queue_entry.id returning * into queue_entry;
  end if;

  select r.* into open_room from rooms r
  where r.status = 'waiting' and r.room_type = requested_mode and r.max_participants = needed
    and (select count(*) from room_participants p where p.room_id = r.id and p.left_at is null) < r.max_participants
    and not exists (
      select 1 from room_participants p join blocked_users b on
        (b.blocker_id = current_user_id and b.blocked_id = p.user_id)
        or (b.blocker_id = p.user_id and b.blocked_id = current_user_id)
      where p.room_id = r.id and p.left_at is null
    )
  order by r.created_at for update skip locked limit 1;

  if open_room.id is not null then
    insert into room_participants (room_id, user_id) values (open_room.id, current_user_id);
    select count(*) into current_count from room_participants where room_id = open_room.id and left_at is null;
    update rooms
    set status = case when current_count >= needed then 'active'::public.room_status else 'waiting'::public.room_status end
    where id = open_room.id;
    update match_queue set status = 'matched', room_id = open_room.id where id = queue_entry.id;
    return jsonb_build_object('status', 'matched', 'room_id', open_room.id);
  end if;

  select q.* into candidate from match_queue q
  where q.status = 'waiting' and q.match_mode = requested_mode and q.desired_people = requested_people
    and q.id <> queue_entry.id and q.expires_at > now()
    and not exists (
      select 1 from blocked_users b where (b.blocker_id = current_user_id and b.blocked_id = q.user_id)
        or (b.blocker_id = q.user_id and b.blocked_id = current_user_id)
    )
  order by (q.created_at < now() - interval '30 seconds') desc, random()
  for update skip locked limit 1;

  if candidate.id is null then
    return jsonb_build_object('status', 'waiting', 'room_id', null);
  end if;

  insert into rooms (status, room_type, max_participants, started_at)
  values (case when needed = 2 then 'active'::public.room_status else 'waiting'::public.room_status end, requested_mode, needed, now())
  returning id into room;
  insert into room_participants (room_id, user_id) values (room, current_user_id), (room, candidate.user_id);
  update match_queue set status = 'matched', room_id = room where id in (queue_entry.id, candidate.id);
  return jsonb_build_object('status', 'matched', 'room_id', room);
end;
$$;

grant execute on function public.join_matchmaking(smallint, text) to authenticated;