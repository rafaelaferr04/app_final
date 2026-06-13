-- WiseMoney — Schema Supabase
-- 1. Vai ao teu projeto em supabase.com
-- 2. Dashboard → SQL Editor → New query → cola tudo → Run

-- Transações
create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  amount       numeric,
  category     text,
  date         text,
  type         text,
  notes        text,
  created_by   text,
  created_date timestamptz default now()
);

-- Objetivos de poupança
create table if not exists savings_goals (
  id                   uuid primary key default gen_random_uuid(),
  title                text,
  icon                 text default '🎯',
  target_amount        numeric,
  current_amount       numeric default 0,
  priority             text default 'medium',
  deadline             text,
  contribution_history jsonb    default '[]'::jsonb,
  completed_date       text,
  created_by           text,
  created_date         timestamptz default now()
);

-- Perfil do utilizador
create table if not exists user_profiles (
  id                    uuid primary key default gen_random_uuid(),
  total_xp              integer default 0,
  current_level         integer default 1,
  streak_days           integer default 0,
  notifications_enabled boolean default true,
  monthly_budget        numeric default 0,
  financial_goal        text,
  bank_connected        boolean default false,
  bank_provider         text,
  bank_access_token     text,
  bank_last_sync        text,
  created_by            text,
  created_date          timestamptz default now()
);

-- Progresso nos cursos
create table if not exists course_progress (
  id                uuid primary key default gen_random_uuid(),
  course_id         text,
  level             integer,
  lessons_completed jsonb default '[]'::jsonb,
  completed         boolean default false,
  xp_earned         integer default 0,
  quiz_scores       jsonb default '[]'::jsonb,
  created_by        text,
  created_date      timestamptz default now()
);

-- Mensagens do chat (Finny)
create table if not exists chat_messages (
  id           uuid primary key default gen_random_uuid(),
  role         text,
  content      text,
  created_by   text,
  created_date timestamptz default now()
);

-- Conquistas desbloqueadas
create table if not exists achievements (
  id             uuid primary key default gen_random_uuid(),
  achievement_id text,
  title          text,
  description    text,
  icon           text,
  xp             integer default 0,
  category       text,
  created_by     text,
  created_date   timestamptz default now()
);

-- ─── Row Level Security ────────────────────────────────────────────────────────
-- Cada utilizador só vê e edita os seus próprios dados (created_by = email da sessão)

alter table transactions       enable row level security;
alter table savings_goals      enable row level security;
alter table user_profiles      enable row level security;
alter table course_progress    enable row level security;
alter table chat_messages      enable row level security;
alter table achievements       enable row level security;

-- transactions
create policy "transactions_own" on transactions
  for all using     (auth.email() = created_by)
  with check        (auth.email() = created_by);

-- savings_goals
create policy "savings_goals_own" on savings_goals
  for all using     (auth.email() = created_by)
  with check        (auth.email() = created_by);

-- user_profiles
create policy "user_profiles_own" on user_profiles
  for all using     (auth.email() = created_by)
  with check        (auth.email() = created_by);

-- course_progress
create policy "course_progress_own" on course_progress
  for all using     (auth.email() = created_by)
  with check        (auth.email() = created_by);

-- chat_messages
create policy "chat_messages_own" on chat_messages
  for all using     (auth.email() = created_by)
  with check        (auth.email() = created_by);

-- achievements
create policy "achievements_own" on achievements
  for all using     (auth.email() = created_by)
  with check        (auth.email() = created_by);
