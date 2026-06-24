-- 联系人联络记录
-- 在 Supabase SQL Editor 执行（需先执行 005_prospect_contacts_emails.sql）

create table if not exists public.business_prospect_contact_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.business_prospect_contacts(id) on delete cascade,
  subject text not null,
  notes text not null default '',
  contacted_at timestamptz not null default now(),
  has_replied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contact_logs_contact
  on public.business_prospect_contact_logs(contact_id, contacted_at desc);

alter table public.business_prospect_contact_logs enable row level security;

create policy "No public access to contact logs"
  on public.business_prospect_contact_logs for select using (false);

create or replace function public.touch_contact_log_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contact_logs_updated on public.business_prospect_contact_logs;
create trigger contact_logs_updated
  before update on public.business_prospect_contact_logs
  for each row execute function public.touch_contact_log_updated();
