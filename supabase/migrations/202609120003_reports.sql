create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  category text not null,
  details text not null default '',
  urgent boolean not null default false,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

alter table public.user_reports enable row level security;

create policy "users create own reports" on public.user_reports
  for insert with check (reporter_id = auth.uid());

create or replace function public.block_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot_block_self'; end if;
  insert into blocked_users (blocker_id, blocked_id)
  values (auth.uid(), target_user_id)
  on conflict do nothing;
end;
$$;

create or replace function public.submit_user_report(
  target_user_id uuid,
  target_room_id uuid,
  report_category text,
  report_details text default '',
  is_urgent boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot_report_self'; end if;
  if not exists (
    select 1 from room_participants
    where room_id = target_room_id and user_id = auth.uid()
  ) or not exists (
    select 1 from room_participants
    where room_id = target_room_id and user_id = target_user_id
  ) then
    raise exception 'report_room_participant_required';
  end if;
  insert into user_reports (
    reporter_id, reported_id, room_id, category, details, urgent
  ) values (
    auth.uid(), target_user_id, target_room_id,
    left(trim(report_category), 120), left(coalesce(report_details, ''), 2000), is_urgent
  );
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.submit_user_report(uuid, uuid, text, text, boolean) to authenticated;