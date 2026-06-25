-- AI 潜客爬虫任务
-- 在 Supabase SQL Editor 执行

alter table public.business_prospects
  add column if not exists source text not null default 'manual',
  add column if not exists source_url text not null default '';

create table if not exists public.business_lead_crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  keywords text[] not null,
  status text not null default 'pending'
    check (status in ('pending', 'searching', 'processing', 'completed', 'failed')),
  total_urls int not null default 0,
  processed_urls int not null default 0,
  imported_count int not null default 0,
  skipped_count int not null default 0,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_lead_crawl_queue (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.business_lead_crawl_jobs(id) on delete cascade,
  keyword text not null default '',
  url text not null,
  title text not null default '',
  snippet text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'imported', 'skipped', 'failed')),
  ai_reason text not null default '',
  prospect_id uuid references public.business_prospects(id) on delete set null,
  error_message text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (job_id, url)
);

create index if not exists idx_crawl_queue_job_status
  on public.business_lead_crawl_queue(job_id, status, sort_order);

alter table public.business_lead_crawl_jobs enable row level security;
alter table public.business_lead_crawl_queue enable row level security;

create policy "No public access to crawl jobs"
  on public.business_lead_crawl_jobs for select using (false);

create policy "No public access to crawl queue"
  on public.business_lead_crawl_queue for select using (false);
