-- 外包需求附件
-- 在 Supabase SQL Editor 执行（需已执行 009_waibao.sql）

create table if not exists public.waibao_attachments (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.waibao_requirements(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  mime_type text not null default '',
  uploaded_by uuid not null references public.waibao_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_waibao_attachments_requirement
  on public.waibao_attachments(requirement_id, created_at desc);

alter table public.waibao_attachments enable row level security;

create policy "No public access to waibao attachments"
  on public.waibao_attachments for select using (false);

-- Storage 私有桶（若 insert 失败，请在 Supabase Dashboard → Storage 手动创建 waibao-attachments，设为 Private）
insert into storage.buckets (id, name, public, file_size_limit)
values ('waibao-attachments', 'waibao-attachments', false, 10485760)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;
