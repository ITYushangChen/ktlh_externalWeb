-- 供应商送货单外部门户 /suppliers

create extension if not exists "pgcrypto";

-- 供应商档案（绑定 Supabase Auth）
create table if not exists public.supplier_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  internal_supplier_id integer not null unique,
  supplier_name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 采购单快照（由内网同步写入）
create table if not exists public.purchase_order_snapshots (
  id uuid primary key default gen_random_uuid(),
  internal_order_id integer not null unique,
  internal_supplier_id integer not null,
  order_number text not null unique,
  order_time timestamptz not null,
  expected_arrival_time timestamptz,
  order_amount numeric(12,2) not null default 0,
  order_status text not null,
  payment_status text,
  responsible_person text,
  remark text,
  buyer_company text not null default '青岛开拓隆海智控有限公司',
  buyer_address text not null default '青岛胶州上合经济开发区湘江路21号',
  access_token text unique,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_po_snapshots_supplier
  on public.purchase_order_snapshots(internal_supplier_id);
create index if not exists idx_po_snapshots_status
  on public.purchase_order_snapshots(order_status);
create index if not exists idx_po_snapshots_token
  on public.purchase_order_snapshots(access_token);

-- 采购明细快照
create table if not exists public.purchase_order_item_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_order_id uuid not null references public.purchase_order_snapshots(id) on delete cascade,
  internal_order_item_id integer not null unique,
  material_code text,
  material_name text not null,
  material_spec text,
  unit text not null,
  unit_price numeric(10,2) not null default 0,
  order_quantity numeric(10,2) not null,
  received_quantity numeric(10,2) not null default 0,
  item_amount numeric(12,2) not null default 0,
  remark text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_po_item_snapshots_order
  on public.purchase_order_item_snapshots(snapshot_order_id);
create index if not exists idx_po_item_snapshots_material
  on public.purchase_order_item_snapshots(material_code);

-- 送货单主表
create table if not exists public.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  delivery_number text not null unique,
  snapshot_order_id uuid not null references public.purchase_order_snapshots(id),
  internal_order_id integer not null,
  internal_supplier_id integer not null,
  supplier_profile_id uuid references public.supplier_profiles(id),
  supplier_name text not null,
  supplier_contact text,
  supplier_phone text,
  supplier_address text,
  buyer_company text not null,
  buyer_address text not null,
  buyer_contact text,
  delivery_date date not null,
  expected_arrival_time timestamptz,
  vehicle_plate text,
  driver_name text,
  driver_phone text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'cancelled')),
  remark text,
  pdf_storage_path text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_notes_order
  on public.delivery_notes(snapshot_order_id);
create index if not exists idx_delivery_notes_supplier
  on public.delivery_notes(internal_supplier_id);
create index if not exists idx_delivery_notes_status
  on public.delivery_notes(status);
create index if not exists idx_delivery_notes_number
  on public.delivery_notes(delivery_number);

-- 送货单明细
create table if not exists public.delivery_note_items (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references public.delivery_notes(id) on delete cascade,
  snapshot_item_id uuid not null references public.purchase_order_item_snapshots(id),
  internal_order_item_id integer not null,
  material_code text,
  material_name text not null,
  material_spec text,
  unit text not null,
  unit_price numeric(10,2) not null default 0,
  delivery_quantity numeric(10,2) not null check (delivery_quantity > 0),
  line_remark text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_delivery_note_items_note
  on public.delivery_note_items(delivery_note_id);

-- 送货单号序列表（按日）
create table if not exists public.delivery_number_seq (
  seq_date date primary key,
  last_seq integer not null default 0
);

create or replace function public.next_delivery_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := current_date;
  n int;
begin
  insert into delivery_number_seq(seq_date, last_seq)
  values (d, 1)
  on conflict (seq_date) do update
    set last_seq = delivery_number_seq.last_seq + 1
  returning last_seq into n;
  return 'SH' || to_char(d, 'YYYYMMDD') || lpad(n::text, 4, '0');
end;
$$;

-- updated_at triggers
create or replace function public.touch_supplier_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists supplier_profiles_updated on public.supplier_profiles;
create trigger supplier_profiles_updated
  before update on public.supplier_profiles
  for each row execute function public.touch_supplier_updated();

drop trigger if exists po_snapshots_updated on public.purchase_order_snapshots;
create trigger po_snapshots_updated
  before update on public.purchase_order_snapshots
  for each row execute function public.touch_supplier_updated();

drop trigger if exists po_item_snapshots_updated on public.purchase_order_item_snapshots;
create trigger po_item_snapshots_updated
  before update on public.purchase_order_item_snapshots
  for each row execute function public.touch_supplier_updated();

drop trigger if exists delivery_notes_updated on public.delivery_notes;
create trigger delivery_notes_updated
  before update on public.delivery_notes
  for each row execute function public.touch_supplier_updated();

-- RLS
alter table public.supplier_profiles enable row level security;
alter table public.purchase_order_snapshots enable row level security;
alter table public.purchase_order_item_snapshots enable row level security;
alter table public.delivery_notes enable row level security;
alter table public.delivery_note_items enable row level security;

create policy "supplier read own profile"
  on public.supplier_profiles for select
  using (auth.uid() = id);

create policy "supplier update own profile"
  on public.supplier_profiles for update
  using (auth.uid() = id);

create policy "supplier read own PO snapshots"
  on public.purchase_order_snapshots for select
  using (
    internal_supplier_id in (
      select internal_supplier_id from public.supplier_profiles
      where id = auth.uid() and is_active = true
    )
  );

create policy "supplier read own PO item snapshots"
  on public.purchase_order_item_snapshots for select
  using (
    snapshot_order_id in (
      select id from public.purchase_order_snapshots
      where internal_supplier_id in (
        select internal_supplier_id from public.supplier_profiles
        where id = auth.uid() and is_active = true
      )
    )
  );

create policy "supplier CRUD own delivery notes"
  on public.delivery_notes for all
  using (
    supplier_profile_id = auth.uid()
    or internal_supplier_id in (
      select internal_supplier_id from public.supplier_profiles where id = auth.uid()
    )
  )
  with check (
    supplier_profile_id = auth.uid()
    and status in ('draft', 'submitted', 'cancelled')
  );

create policy "supplier CRUD own delivery note items"
  on public.delivery_note_items for all
  using (
    delivery_note_id in (
      select id from public.delivery_notes
      where supplier_profile_id = auth.uid()
    )
  )
  with check (
    delivery_note_id in (
      select id from public.delivery_notes
      where supplier_profile_id = auth.uid()
    )
  );

-- 同步服务使用 service_role，无需额外 policy
