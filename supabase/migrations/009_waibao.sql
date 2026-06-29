-- 外包需求平台 /waibao
-- 在 Supabase SQL Editor 执行

create table if not exists public.waibao_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waibao_users_username_unique unique (username)
);

create table if not exists public.waibao_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.waibao_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_waibao_sessions_user on public.waibao_sessions(user_id);
create index if not exists idx_waibao_sessions_expires on public.waibao_sessions(expires_at);

create table if not exists public.waibao_requirements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  status text not null default 'open'
    check (status in ('open', 'claimed', 'submitted', 'completed', 'cancelled')),
  created_by uuid not null references public.waibao_users(id) on delete restrict,
  claimed_by uuid references public.waibao_users(id) on delete set null,
  claimed_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  admin_note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_waibao_requirements_status
  on public.waibao_requirements(status, sort_order, created_at desc);

alter table public.waibao_users enable row level security;
alter table public.waibao_sessions enable row level security;
alter table public.waibao_requirements enable row level security;

create policy "No public access to waibao users"
  on public.waibao_users for select using (false);

create policy "No public access to waibao sessions"
  on public.waibao_sessions for select using (false);

create policy "No public access to waibao requirements"
  on public.waibao_requirements for select using (false);

create or replace function public.touch_waibao_user_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists waibao_users_updated on public.waibao_users;
create trigger waibao_users_updated
  before update on public.waibao_users
  for each row execute function public.touch_waibao_user_updated();

create or replace function public.touch_waibao_requirement_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists waibao_requirements_updated on public.waibao_requirements;
create trigger waibao_requirements_updated
  before update on public.waibao_requirements
  for each row execute function public.touch_waibao_requirement_updated();
