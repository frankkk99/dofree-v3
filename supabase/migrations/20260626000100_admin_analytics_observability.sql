-- Admin analytics and maintenance observability tables for DodeedeeV3.
-- Run this migration in Supabase before relying on the analytics dashboard numbers.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  page_path text,
  page_title text,
  media_type text check (media_type in ('movie', 'tv') or media_type is null),
  media_id bigint,
  title text,
  search_query text,
  section_slug text,
  referrer text,
  visitor_id text,
  user_id uuid,
  device text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id, created_at desc);
create index if not exists analytics_events_media_idx on public.analytics_events (media_type, media_id, created_at desc);
create index if not exists analytics_events_search_idx on public.analytics_events (search_query, created_at desc) where search_query is not null;

alter table public.analytics_events enable row level security;

-- Events are written through the Next.js route using the service role key.
-- Keep direct public access closed; admins read aggregated data through server APIs.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'analytics_events_service_role_all'
  ) then
    create policy analytics_events_service_role_all
      on public.analytics_events
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_label text,
  action text not null,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id, created_at desc);

alter table public.admin_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_logs'
      and policyname = 'admin_audit_logs_service_role_all'
  ) then
    create policy admin_audit_logs_service_role_all
      on public.admin_audit_logs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists public.system_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null default 'unknown',
  metric_name text,
  metric_value numeric,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_health_snapshots_created_at_idx on public.system_health_snapshots (created_at desc);
create index if not exists system_health_snapshots_source_idx on public.system_health_snapshots (source, created_at desc);

alter table public.system_health_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'system_health_snapshots'
      and policyname = 'system_health_snapshots_service_role_all'
  ) then
    create policy system_health_snapshots_service_role_all
      on public.system_health_snapshots
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
