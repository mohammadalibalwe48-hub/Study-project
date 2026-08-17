create or replace function private.delete_empty_study_room()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1
  from public.study_rooms
  where id = old.room_id
  for update;

  if not found then
    return old;
  end if;

  if not exists (
    select 1
    from public.study_room_members
    where room_id = old.room_id
  ) then
    delete from public.study_rooms
    where id = old.room_id;
  end if;

  return old;
end;
$$;

revoke all on function private.delete_empty_study_room() from public;

create or replace trigger delete_empty_study_room_after_member_leaves
after delete on public.study_room_members
for each row
execute function private.delete_empty_study_room();

create or replace function public.leave_study_room(p_room_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  perform 1
  from public.study_rooms
  where id = p_room_id
  for update;

  if not found then
    return true;
  end if;

  delete from public.study_room_members
  where room_id = p_room_id
    and user_id = auth.uid();

  if not found then
    raise exception 'not a room member';
  end if;

  select not exists (
    select 1
    from public.study_rooms
    where id = p_room_id
  ) into v_deleted;

  return v_deleted;
end;
$$;

revoke all on function public.leave_study_room(uuid) from public;
revoke execute on function public.leave_study_room(uuid) from anon;
grant execute on function public.leave_study_room(uuid) to authenticated;
