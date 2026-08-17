drop index if exists public.study_room_participant_states_room_last_seen_idx;

create index if not exists study_room_participant_states_user_id_idx
on public.study_room_participant_states (user_id);
