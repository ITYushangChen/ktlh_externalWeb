-- 简化版：厂区平面图 + 统一送货流程 + 送货类型列表
-- 在 Supabase SQL Editor 执行（可与旧表共存，新功能用新表）

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  delivery_flow text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, delivery_flow)
values (1, '1. 从北门进入厂区
2. 如需过磅请先至过磅处
3. 按送货类型联系对应负责人
4. 到达指定车间/区域卸货')
on conflict (id) do nothing;

create table if not exists public.delivery_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text not null,
  phone text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_types_sort on public.delivery_types(sort_order);

alter table public.site_settings enable row level security;
alter table public.delivery_types enable row level security;

create policy "Public read site settings"
  on public.site_settings for select
  using (true);

create policy "Public read active delivery types"
  on public.delivery_types for select
  using (is_active = true);

create or replace function public.touch_delivery_type_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists delivery_types_updated on public.delivery_types;
create trigger delivery_types_updated
  before update on public.delivery_types
  for each row execute function public.touch_delivery_type_updated();
