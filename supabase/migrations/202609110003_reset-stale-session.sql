create or replace function public.reset_my_matchmaking_session()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  old_room_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update match_queue
  set status = 'cancelled'
  where user_id = current_user_id
    and status in ('waiting', 'matched');

  for old_room_id in
    select room_id
    from room_participants
    where user_id = current_user_id
      and left_at is null
  loop
    update room_participants
    set left_at = now()
    where room_id = old_room_id
      and user_id = current_user_id
      and left_at is null;

    if not exists (
      select 1 from room_participants
      where room_id = old_room_id and left_at is null
    ) then
      update rooms
      set status = 'ended', ended_at = now()
      where id = old_room_id and status <> 'ended';
    end if;
  end loop;
end;
$$;

grant execute on function public.reset_my_matchmaking_session() to authenticated;
