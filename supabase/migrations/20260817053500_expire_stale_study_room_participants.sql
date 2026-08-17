create or replace function private.cleanup_stale_study_room_participants(
  p_room_id uuid default null,
  p_lease_timeout interval default interval '30 seconds'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cutoff timestamptz := clock_timestamp() - p_lease_timeout;
  v_deleted integer := 0;
begin
  if p_lease_timeout < interval '15 seconds'
     or p_lease_timeout > interval '5 minutes' then
    raise exception 'invalid participant lease timeout';
  end if;

  delete from public.study_room_participant_states state
  where state.last_seen < v_cutoff
    and (p_room_id is null or state.room_id = p_room_id);

  with stale_members as (
    select member.room_id, member.user_id
    from public.study_room_members member
    where (p_room_id is null or member.room_id = p_room_id)
      and member.joined_at < v_cutoff
      and not exists (
        select 1
        from public.study_room_participant_states state
        where state.room_id = member.room_id
          and state.user_id = member.user_id
          and state.last_seen >= v_cutoff
      )
    for update of member
  ), deleted as (
    delete from public.study_room_members member
    using stale_members stale
    where member.room_id = stale.room_id
      and member.user_id = stale.user_id
    returning 1
  )
  select count(*) into v_deleted from deleted;

  return v_deleted;
end;
$$;

revoke all on function private.cleanup_stale_study_room_participants(uuid, interval) from public;

create or replace function public.cleanup_stale_study_room_participants(
  p_room_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  return private.cleanup_stale_study_room_participants(
    p_room_id,
    interval '30 seconds'
  );
end;
$$;

revoke all on function public.cleanup_stale_study_room_participants(uuid) from public;
revoke execute on function public.cleanup_stale_study_room_participants(uuid) from anon;
grant execute on function public.cleanup_stale_study_room_participants(uuid) to authenticated;

create or replace function public.join_study_room(p_room_id uuid)
returns public.study_room_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.study_rooms;
  v_member public.study_room_members;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  perform private.cleanup_stale_study_room_participants(
    p_room_id,
    interval '30 seconds'
  );

  select * into v_room
  from public.study_rooms
  where id = p_room_id
    and is_public
  for update;

  if not found then
    raise exception 'room not found';
  end if;

  select count(*) into v_count
  from public.study_room_members
  where room_id = p_room_id;

  if v_count >= v_room.capacity
     and not exists (
       select 1
       from public.study_room_members
       where room_id = p_room_id
         and user_id = auth.uid()
     ) then
    raise exception 'room full';
  end if;

  insert into public.study_room_members (
    room_id,
    user_id,
    role,
    joined_at
  ) values (
    p_room_id,
    auth.uid(),
    case when v_room.creator_id = auth.uid() then 'host' else 'member' end,
    clock_timestamp()
  )
  on conflict (room_id, user_id) do update
  set role = excluded.role,
      joined_at = excluded.joined_at
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.join_study_room(uuid) from public;
revoke execute on function public.join_study_room(uuid) from anon;
grant execute on function public.join_study_room(uuid) to authenticated;
