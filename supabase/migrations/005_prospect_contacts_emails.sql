-- 业务拓展：多联系人 + 定时邮件
-- 在 Supabase SQL Editor 执行（需先执行 004_business_prospects.sql）

create table if not exists public.business_prospect_contacts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.business_prospects(id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prospect_contacts_prospect
  on public.business_prospect_contacts(prospect_id, sort_order);

-- 将旧版单联系人字段迁移到新表
insert into public.business_prospect_contacts (prospect_id, name, phone, sort_order)
select id, contact_name, contact_phone, 0
from public.business_prospects
where is_active = true
  and (contact_name <> '' or contact_phone <> '')
  and not exists (
    select 1 from public.business_prospect_contacts c
    where c.prospect_id = business_prospects.id
  );

create table if not exists public.business_prospect_email_schedules (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.business_prospect_contacts(id) on delete cascade,
  subject text not null,
  body text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  error_message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_email_schedules_pending
  on public.business_prospect_email_schedules(status, scheduled_at)
  where status = 'pending';

alter table public.business_prospect_contacts enable row level security;
alter table public.business_prospect_email_schedules enable row level security;

create policy "No public access to prospect contacts"
  on public.business_prospect_contacts for select using (false);

create policy "No public access to email schedules"
  on public.business_prospect_email_schedules for select using (false);

create or replace function public.touch_prospect_contact_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists prospect_contacts_updated on public.business_prospect_contacts;
create trigger prospect_contacts_updated
  before update on public.business_prospect_contacts
  for each row execute function public.touch_prospect_contact_updated();
