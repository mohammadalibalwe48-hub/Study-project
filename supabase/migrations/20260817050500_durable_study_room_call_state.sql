alter table public.study_room_participant_states
  add column if not exists client_instance_id uuid,
  add column if not exists cf_session_id text,
  add column if not exists session_generation integer not null default 0,
  add column if not exists session_ready boolean not null default false,
  add column if not exists audio_track_id text,
  add column if not exists video_track_id text;

-- Call-state rows are short-lived leases. Clearing them makes the key change safe
-- and prevents pre-migration sessions from being advertised after deployment.
delete from public.study_room_participant_states;

alter table public.study_room_participant_states
  drop constraint if exists study_room_participant_states_pkey;

alter table public.study_room_participant_states
  alter column client_instance_id set not null,
  add primary key (room_id, user_id, client_instance_id);

create index if not exists study_room_participant_states_room_last_seen_idx
  on public.study_room_participant_states (room_id, last_seen desc);

create or replace function public.create_study_room(
  p_title text,
  p_description text default '',
  p_mode text default 'both',
  p_capacity integer default 6,
  p_subject_id bigint default null
)
returns public.study_rooms
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_room public.study_rooms;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if char_length(trim(p_title)) < 3 then
    raise exception 'room title is too short';
  end if;

  if p_mode not in ('voice', 'video', 'both') then
    raise exception 'invalid room mode';
  end if;

  if p_capacity < 2 or p_capacity > 8 then
    raise exception 'invalid room capacity';
  end if;

  insert into public.study_rooms (
    creator_id,
    subject_id,
    title,
    description,
    mode,
    capacity,
    is_public
  ) values (
    auth.uid(),
    p_subject_id,
    trim(p_title),
    trim(coalesce(p_description, '')),
    p_mode,
    p_capacity,
    true
  )
  returning * into v_room;

  insert into public.study_room_members (room_id, user_id, role)
  values (v_room.id, auth.uid(), 'host');

  return v_room;
end;
$$;

revoke all on function public.create_study_room(text, text, text, integer, bigint) from public;
revoke execute on function public.create_study_room(text, text, text, integer, bigint) from anon;
grant execute on function public.create_study_room(text, text, text, integer, bigint) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_room_participant_states'
  ) then
    alter publication supabase_realtime add table public.study_room_participant_states;
  end if;
end
$$;
