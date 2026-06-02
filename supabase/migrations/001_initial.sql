-- 送货引导系统：在 Supabase SQL Editor 中执行此脚本

-- 送货单（每个二维码对应一条）
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  picker_label text,
  list_sort_order int not null default 0,
  supplier_name text,
  cargo_description text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 流程步骤（按 sort_order 排序）
create table if not exists public.delivery_steps (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  sort_order int not null default 0,
  title text not null,
  description text,
  location_label text,
  created_at timestamptz not null default now()
);

-- 联系人
create table if not exists public.delivery_contacts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  name text not null,
  role text,
  phone text not null,
  wechat text,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 路径节点（2D/3D 坐标，单位像素或米，由后台统一尺度）
create table if not exists public.path_nodes (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  node_key text not null,
  label text not null,
  x float not null default 0,
  y float not null default 0,
  z float not null default 0,
  floor int not null default 1,
  is_destination boolean not null default false,
  instruction text,
  unique (delivery_id, node_key)
);

-- 路径边（连接两个 node_key）
create table if not exists public.path_edges (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  from_key text not null,
  to_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_deliveries_code on public.deliveries(code);
create index if not exists idx_delivery_steps_delivery on public.delivery_steps(delivery_id);
create index if not exists idx_path_nodes_delivery on public.path_nodes(delivery_id);

-- 公开读取（司机扫码无需登录）
alter table public.deliveries enable row level security;
alter table public.delivery_steps enable row level security;
alter table public.delivery_contacts enable row level security;
alter table public.path_nodes enable row level security;
alter table public.path_edges enable row level security;

create policy "Public read active deliveries"
  on public.deliveries for select
  using (status = 'active');

create policy "Public read steps"
  on public.delivery_steps for select
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id and d.status = 'active'
    )
  );

create policy "Public read contacts"
  on public.delivery_contacts for select
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id and d.status = 'active'
    )
  );

create policy "Public read path nodes"
  on public.path_nodes for select
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id and d.status = 'active'
    )
  );

create policy "Public read path edges"
  on public.path_edges for select
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id and d.status = 'active'
    )
  );

-- 管理端：使用 service role 或已认证用户（在 Supabase 启用 Auth 后替换为 auth.uid() 策略）
-- 开发阶段可在 Dashboard 用 service_role；生产建议仅 service_role API 写入

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger deliveries_updated_at
  before update on public.deliveries
  for each row execute function public.set_updated_at();
