drop function if exists public.cleanup_stale_study_room_participants(uuid);

create function public.cleanup_stale_study_room_participants(
  p_room_id uuid
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

  if p_room_id is null then
    raise exception 'room id is required';
  end if;

  if not exists (
    select 1
    from public.study_rooms room
    where room.id = p_room_id
      and room.is_public
  ) then
    raise exception 'room not found';
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
