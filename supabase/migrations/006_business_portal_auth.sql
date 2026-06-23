-- 业务拓展门户：账号登录（密码 bcrypt 存库，会话 JWT + 数据库）
-- 在 Supabase SQL Editor 执行

create table if not exists public.business_portal_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_portal_users_username_unique unique (username)
);

create table if not exists public.business_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.business_portal_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_sessions_user
  on public.business_portal_sessions(user_id);

create index if not exists idx_portal_sessions_expires
  on public.business_portal_sessions(expires_at);

alter table public.business_portal_users enable row level security;
alter table public.business_portal_sessions enable row level security;

create policy "No public access to portal users"
  on public.business_portal_users for select using (false);

create policy "No public access to portal sessions"
  on public.business_portal_sessions for select using (false);

create or replace function public.touch_portal_user_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists portal_users_updated on public.business_portal_users;
create trigger portal_users_updated
  before update on public.business_portal_users
  for each row execute function public.touch_portal_user_updated();
