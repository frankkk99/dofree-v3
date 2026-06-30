-- Admin Catalog Sync Center.
-- Safe by default: records jobs/logs and analytics compatibility columns without deleting catalog or user data.

alter table public.analytics_events
  add column if not exists event_type text,
  add column if not exists tmdb_id bigint,
  add column if not exists query text,
  add column if not exists path text,
  add column if not exists session_id text;

update public.analytics_events
set
  event_type = coalesce(event_type, event_name),
  tmdb_id = coalesce(tmdb_id, media_id),
  query = coalesce(query, search_query),
  path = coalesce(path, page_path),
  session_id = coalesce(session_id, visitor_id)
where event_type is null
   or tmdb_id is null
   or query is null
   or path is null
   or session_id is null;

create index if not exists analytics_events_event_type_idx on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_events_tmdb_id_idx on public.analytics_events (media_type, tmdb_id, created_at desc) where tmdb_id is not null;
create index if not exists analytics_events_query_idx on public.analytics_events (query, created_at desc) where query is not null;

create table if not exists public.admin_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null default 'catalog_refresh',
  profile_id text not null,
  profile_label text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled', 'preview')),
  dry_run boolean not null default true,
  target_count integer not null default 1000 check (target_count > 0 and target_count <= 10000),
  batch_size integer not null default 100 check (batch_size > 0 and batch_size <= 250),
  current_page integer not null default 1 check (current_page > 0),
  processed_count integer not null default 0 check (processed_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  filters jsonb not null default '{}'::jsonb,
  safety_options jsonb not null default '{}'::jsonb,
  preview jsonb not null default '{}'::jsonb,
  last_error text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists admin_sync_jobs_updated_at_idx on public.admin_sync_jobs (updated_at desc);
create index if not exists admin_sync_jobs_status_idx on public.admin_sync_jobs (status, updated_at desc);
create index if not exists admin_sync_jobs_profile_idx on public.admin_sync_jobs (profile_id, updated_at desc);
create index if not exists admin_sync_jobs_created_by_idx on public.admin_sync_jobs (created_by, updated_at desc);

alter table public.admin_sync_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_sync_jobs'
      and policyname = 'admin_sync_jobs_service_role_all'
  ) then
    create policy admin_sync_jobs_service_role_all
      on public.admin_sync_jobs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists public.admin_sync_job_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.admin_sync_jobs(id) on delete cascade,
  level text not null default 'info' check (level in ('info', 'warn', 'error', 'success')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_sync_job_logs_job_idx on public.admin_sync_job_logs (job_id, created_at desc);
create index if not exists admin_sync_job_logs_created_at_idx on public.admin_sync_job_logs (created_at desc);
create index if not exists admin_sync_job_logs_level_idx on public.admin_sync_job_logs (level, created_at desc);

alter table public.admin_sync_job_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_sync_job_logs'
      and policyname = 'admin_sync_job_logs_service_role_all'
  ) then
    create policy admin_sync_job_logs_service_role_all
      on public.admin_sync_job_logs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.admin_sync_jobs to service_role;
grant select, insert, update, delete on public.admin_sync_job_logs to service_role;
grant select, insert, update on public.analytics_events to service_role;
