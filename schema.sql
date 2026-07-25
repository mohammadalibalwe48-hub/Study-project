-- schema.sql
-- Complete Database schema for Syrian Baccalaureate Educational Platform

-- 1. Create branches table
create table if not exists public.branches (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamp with time zone default now() not null
);

-- 2. Create public users table referencing auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text check (role in ('student', 'admin')) default 'student' not null,
  branch_id bigint references public.branches(id) on delete set null,
  created_at timestamp with time zone default now() not null
);

-- 3. Create subjects table
create table if not exists public.subjects (
  id bigint generated always as identity primary key,
  branch_id bigint references public.branches(id) on delete cascade not null,
  name text not null,
  description text,
  image_url text,
  created_at timestamp with time zone default now() not null
);

-- 4. Create lessons table
create table if not exists public.lessons (
  id bigint generated always as identity primary key,
  subject_id bigint references public.subjects(id) on delete cascade not null,
  name text not null,
  content text,
  video_url text,
  order_index integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

-- 5. Create files table
create table if not exists public.files (
  id bigint generated always as identity primary key,
  lesson_id bigint references public.lessons(id) on delete cascade not null,
  name text not null,
  file_url text not null,
  created_at timestamp with time zone default now() not null
);

-- 6. Create quizzes table
create table if not exists public.quizzes (
  id bigint generated always as identity primary key,
  subject_id bigint references public.subjects(id) on delete cascade not null,
  lesson_id bigint references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamp with time zone default now() not null
);

-- 7. Create questions table
create table if not exists public.questions (
  id bigint generated always as identity primary key,
  quiz_id bigint references public.quizzes(id) on delete cascade not null,
  question_text text not null,
  options jsonb not null, -- Array of strings e.g. ["أ", "ب", "ج", "د"]
  correct_option_index integer not null, -- 0, 1, 2, 3
  created_at timestamp with time zone default now() not null
);

-- 8. Create quiz_results table
create table if not exists public.quiz_results (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  quiz_id bigint references public.quizzes(id) on delete cascade not null,
  score integer not null,
  total_questions integer not null,
  completed_at timestamp with time zone default now() not null
);

-- 9. Create user_xp table
create table if not exists public.user_xp (
  user_id uuid primary key references public.users(id) on delete cascade,
  xp integer default 0 not null,
  streak_days integer default 0 not null,
  last_active timestamp with time zone default now() not null
);

-- 10. Create user_achievements table
create table if not exists public.user_achievements (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  badge_id text not null,
  unlocked_at timestamp with time zone default now() not null,
  unique(user_id, badge_id)
);

-- 11. Create study_sessions table
create table if not exists public.study_sessions (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  duration_minutes integer default 0 not null,
  session_date timestamp with time zone default now() not null
);

-- 12. Create planner_tasks table
create table if not exists public.planner_tasks (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  subject_id bigint references public.subjects(id) on delete set null,
  title text not null,
  completed boolean default false not null,
  due_date timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

-- 13. Create room_messages table
create table if not exists public.room_messages (
  id bigint generated always as identity primary key,
  room_id text not null,
  user_id uuid references public.users(id) on delete cascade not null,
  message text not null,
  created_at timestamp with time zone default now() not null
);

-- 14. Create flashcards table
create table if not exists public.flashcards (
  id bigint generated always as identity primary key,
  subject_id bigint references public.subjects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  front_text text not null,
  back_text text not null,
  created_at timestamp with time zone default now() not null
);

-- 15. Create forum_posts table
create table if not exists public.forum_posts (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  subject_id bigint references public.subjects(id) on delete cascade not null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- 16. Create forum_replies table
create table if not exists public.forum_replies (
  id bigint generated always as identity primary key,
  post_id bigint references public.forum_posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- 17. Create bookmarks table
create table if not exists public.bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  target_type text not null check (target_type in ('lesson', 'forum_post')),
  target_id bigint not null,
  created_at timestamp with time zone default now() not null,
  unique(user_id, target_type, target_id)
);

-- 18. Create mentors table
create table if not exists public.mentors (
  id bigint generated always as identity primary key,
  name text not null,
  specialization text not null,
  bio text,
  rating numeric(3, 2) default 5.00,
  contact_info text,
  image_url text,
  created_at timestamp with time zone default now() not null
);

-- 19. Create support_tickets table
create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  subject text not null,
  description text not null,
  status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamp with time zone default now() not null
);

-- 20. Create blog_posts table
create table if not exists public.blog_posts (
  id bigint generated always as identity primary key,
  title text not null,
  slug text not null unique,
  content text not null,
  author_id uuid references public.users(id) on delete set null,
  published boolean default true not null,
  created_at timestamp with time zone default now() not null
);

-- 21. Create faqs table
create table if not exists public.faqs (
  id bigint generated always as identity primary key,
  question text not null,
  answer text not null,
  category text default 'general' not null,
  created_at timestamp with time zone default now() not null
);

-- Enable Row Level Security on all tables
alter table public.branches enable row level security;
alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.lessons enable row level security;
alter table public.files enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.user_xp enable row level security;
alter table public.user_achievements enable row level security;
alter table public.study_sessions enable row level security;
alter table public.planner_tasks enable row level security;
alter table public.room_messages enable row level security;
alter table public.flashcards enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;
alter table public.bookmarks enable row level security;
alter table public.mentors enable row level security;
alter table public.support_tickets enable row level security;
alter table public.blog_posts enable row level security;
alter table public.faqs enable row level security;

-- Helper function to check if current user is admin using JWT user_metadata
create or replace function public.is_admin()
returns boolean as $$
begin
  return coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'student') = 'admin';
end;
$$ language plpgsql security definer;

-- Trigger function to handle new user insertion from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.users) into is_first;
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when is_first then 'admin' else coalesce(new.raw_user_meta_data->>'role', 'student') end
  );

  -- Initialize user_xp row
  insert into public.user_xp (user_id, xp, streak_days, last_active)
  values (new.id, 0, 0, now())
  on conflict (user_id) do nothing;
  
  if is_first then
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
    where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger for auth.users signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger function to sync user role and name updates back to auth.users metadata
create or replace function public.sync_user_role()
returns trigger as $$
begin
  update auth.users
  set raw_user_meta_data = 
    coalesce(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', new.role, 'full_name', new.full_name)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger for public.users updates
drop trigger if exists on_public_user_updated on public.users;
create trigger on_public_user_updated
  after update on public.users
  for each row
  when (old.role is distinct from new.role or old.full_name is distinct from new.full_name)
  execute procedure public.sync_user_role();

-- RLS Policies

-- branches policies
drop policy if exists "Branches are viewable by authenticated users" on public.branches;
create policy "Branches are viewable by authenticated users" on public.branches
  for select using (auth.role() = 'authenticated');

drop policy if exists "Branches are manageable by admins" on public.branches;
create policy "Branches are manageable by admins" on public.branches
  for all using (public.is_admin());

-- users policies (Updated: All authenticated users can view public profile fields for leaderboards & forums)
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "User profiles are viewable by authenticated users" on public.users;
create policy "User profiles are viewable by authenticated users" on public.users
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists "Admins can manage all user profiles" on public.users;
create policy "Admins can manage all user profiles" on public.users
  for all using (public.is_admin());

-- subjects policies
drop policy if exists "Subjects are viewable by authenticated users" on public.subjects;
create policy "Subjects are viewable by authenticated users" on public.subjects
  for select using (auth.role() = 'authenticated');

drop policy if exists "Subjects are manageable by admins" on public.subjects;
create policy "Subjects are manageable by admins" on public.subjects
  for all using (public.is_admin());

-- lessons policies
drop policy if exists "Lessons are viewable by authenticated users" on public.lessons;
create policy "Lessons are viewable by authenticated users" on public.lessons
  for select using (auth.role() = 'authenticated');

drop policy if exists "Lessons are manageable by admins" on public.lessons;
create policy "Lessons are manageable by admins" on public.lessons
  for all using (public.is_admin());

-- files policies
drop policy if exists "Files are viewable by authenticated users" on public.files;
create policy "Files are viewable by authenticated users" on public.files
  for select using (auth.role() = 'authenticated');

drop policy if exists "Files are manageable by admins" on public.files;
create policy "Files are manageable by admins" on public.files
  for all using (public.is_admin());

-- quizzes policies
drop policy if exists "Quizzes are viewable by authenticated users" on public.quizzes;
create policy "Quizzes are viewable by authenticated users" on public.quizzes
  for select using (auth.role() = 'authenticated');

drop policy if exists "Quizzes are manageable by admins" on public.quizzes;
create policy "Quizzes are manageable by admins" on public.quizzes
  for all using (public.is_admin());

-- questions policies
drop policy if exists "Questions are viewable by authenticated users" on public.questions;
create policy "Questions are viewable by authenticated users" on public.questions
  for select using (auth.role() = 'authenticated');

drop policy if exists "Questions are manageable by admins" on public.questions;
create policy "Questions are manageable by admins" on public.questions
  for all using (public.is_admin());

-- quiz_results policies
drop policy if exists "Users can view quiz results" on public.quiz_results;
create policy "Users can view quiz results" on public.quiz_results
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own quiz results" on public.quiz_results;
create policy "Users can insert their own quiz results" on public.quiz_results
  for insert with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Quiz results are manageable by admins" on public.quiz_results;
create policy "Quiz results are manageable by admins" on public.quiz_results
  for all using (public.is_admin());

-- user_xp policies
drop policy if exists "User XP is viewable by authenticated users" on public.user_xp;
create policy "User XP is viewable by authenticated users" on public.user_xp
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users can manage their own XP" on public.user_xp;
create policy "Users can manage their own XP" on public.user_xp
  for all using (auth.uid() = user_id or public.is_admin());

-- user_achievements policies
drop policy if exists "Achievements viewable by authenticated users" on public.user_achievements;
create policy "Achievements viewable by authenticated users" on public.user_achievements
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own achievements" on public.user_achievements;
create policy "Users can insert their own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id or public.is_admin());

-- study_sessions policies
drop policy if exists "Users can manage their own study sessions" on public.study_sessions;
create policy "Users can manage their own study sessions" on public.study_sessions
  for all using (auth.uid() = user_id or public.is_admin());

-- planner_tasks policies
drop policy if exists "Users can manage their own planner tasks" on public.planner_tasks;
create policy "Users can manage their own planner tasks" on public.planner_tasks
  for all using (auth.uid() = user_id or public.is_admin());

-- room_messages policies
drop policy if exists "Room messages are viewable by authenticated users" on public.room_messages;
create policy "Room messages are viewable by authenticated users" on public.room_messages
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users can insert room messages" on public.room_messages;
create policy "Users can insert room messages" on public.room_messages
  for insert with check (auth.uid() = user_id or public.is_admin());

-- flashcards policies
drop policy if exists "Users can manage their own flashcards" on public.flashcards;
create policy "Users can manage their own flashcards" on public.flashcards
  for all using (auth.uid() = user_id or public.is_admin());

-- forum_posts policies
drop policy if exists "Forum posts viewable by authenticated users" on public.forum_posts;
create policy "Forum posts viewable by authenticated users" on public.forum_posts
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users can manage their own forum posts" on public.forum_posts;
create policy "Users can manage their own forum posts" on public.forum_posts
  for all using (auth.uid() = user_id or public.is_admin());

-- forum_replies policies
drop policy if exists "Forum replies viewable by authenticated users" on public.forum_replies;
create policy "Forum replies viewable by authenticated users" on public.forum_replies
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users can manage their own forum replies" on public.forum_replies;
create policy "Users can manage their own forum replies" on public.forum_replies
  for all using (auth.uid() = user_id or public.is_admin());

-- bookmarks policies
drop policy if exists "Users can manage their own bookmarks" on public.bookmarks;
create policy "Users can manage their own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id or public.is_admin());

-- mentors policies
drop policy if exists "Mentors viewable by authenticated users" on public.mentors;
create policy "Mentors viewable by authenticated users" on public.mentors
  for select using (auth.role() = 'authenticated');

drop policy if exists "Mentors manageable by admins" on public.mentors;
create policy "Mentors manageable by admins" on public.mentors
  for all using (public.is_admin());

-- support_tickets policies
drop policy if exists "Users can manage their own support tickets" on public.support_tickets;
create policy "Users can manage their own support tickets" on public.support_tickets
  for all using (auth.uid() = user_id or public.is_admin());

-- blog_posts policies
drop policy if exists "Blog posts viewable by authenticated users" on public.blog_posts;
create policy "Blog posts viewable by authenticated users" on public.blog_posts
  for select using (auth.role() = 'authenticated');

drop policy if exists "Blog posts manageable by admins" on public.blog_posts;
create policy "Blog posts manageable by admins" on public.blog_posts
  for all using (public.is_admin());

-- faqs policies
drop policy if exists "FAQs viewable by authenticated users" on public.faqs;
create policy "FAQs viewable by authenticated users" on public.faqs
  for select using (auth.role() = 'authenticated');

drop policy if exists "FAQs manageable by admins" on public.faqs;
create policy "FAQs manageable by admins" on public.faqs
  for all using (public.is_admin());

-- ----------------------------------------------------
-- Postgres Stored Procedures (RPCs) for Gamification
-- ----------------------------------------------------

-- Award XP function
create or replace function public.award_user_xp(p_user_id uuid, p_amount integer)
returns integer as $$
declare
  v_new_xp integer;
begin
  insert into public.user_xp (user_id, xp, streak_days, last_active)
  values (p_user_id, p_amount, 0, now())
  on conflict (user_id) do update
  set xp = public.user_xp.xp + p_amount
  returning xp into v_new_xp;

  return v_new_xp;
end;
$$ language plpgsql security definer;

-- Update streak function
create or replace function public.update_user_streak(p_user_id uuid)
returns integer as $$
declare
  v_last_active timestamp with time zone;
  v_streak integer;
  v_now timestamp with time zone := now();
  v_today date := current_date;
  v_last_date date;
begin
  select last_active, streak_days into v_last_active, v_streak
  from public.user_xp
  where user_id = p_user_id;

  if not found then
    insert into public.user_xp (user_id, xp, streak_days, last_active)
    values (p_user_id, 0, 1, v_now);
    return 1;
  end if;

  v_last_date := v_last_active::date;

  if v_last_date = v_today then
    -- Already active today, return current streak
    return v_streak;
  elsif v_last_date = v_today - interval '1 day' then
    -- Active yesterday, increment streak
    v_streak := v_streak + 1;
  else
    -- Missed a day or more, reset streak to 1
    v_streak := 1;
  end if;

  update public.user_xp
  set streak_days = v_streak,
      last_active = v_now
  where user_id = p_user_id;

  return v_streak;
end;
$$ language plpgsql security definer;

-- Unlock badge function
create or replace function public.unlock_user_badge(p_user_id uuid, p_badge_id text)
returns boolean as $$
begin
  insert into public.user_achievements (user_id, badge_id, unlocked_at)
  values (p_user_id, p_badge_id, now())
  on conflict (user_id, badge_id) do nothing;
  
  return true;
end;
$$ language plpgsql security definer;
