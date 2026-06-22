-- 业务拓展：潜在客户看板
-- 在 Supabase SQL Editor 执行

create table if not exists public.business_prospects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text not null default '',
  annual_demand text not null default '',
  location text not null default '',
  stage text not null default 'lead'
    check (stage in ('lead', 'contacted', 'negotiating', 'sample', 'won', 'lost')),
  contact_name text not null default '',
  contact_phone text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_prospects_stage
  on public.business_prospects(stage, sort_order);

alter table public.business_prospects enable row level security;

-- 不开放公开读取，仅 service role API 写入/读取
create policy "No public access to business prospects"
  on public.business_prospects for select
  using (false);

create or replace function public.touch_business_prospect_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists business_prospects_updated on public.business_prospects;
create trigger business_prospects_updated
  before update on public.business_prospects
  for each row execute function public.touch_business_prospect_updated();
