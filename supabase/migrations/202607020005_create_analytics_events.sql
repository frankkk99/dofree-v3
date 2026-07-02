create table if not exists public.analytics_events (
  id bigserial primary key,
  event_name text not null,
  event_type text,
  page_path text,
  path text,
  page_title text,
  media_type text,
  media_id integer,
  tmdb_id integer,
  title text,
  search_query text,
  query text,
  section_slug text,
  ad_code text,
  visitor_id text,
  session_id text,
  user_id uuid,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  browser text,
  os text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.analytics_events enable row level security;

create index if not exists idx_analytics_events_created_at on public.analytics_events (created_at desc);
create index if not exists idx_analytics_events_event_created on public.analytics_events (event_name, created_at desc);
create index if not exists idx_analytics_events_visitor_created on public.analytics_events (visitor_id, created_at desc);
create index if not exists idx_analytics_events_session_created on public.analytics_events (session_id, created_at desc);
create index if not exists idx_analytics_events_page_created on public.analytics_events (page_path, created_at desc);
create index if not exists idx_analytics_events_media_created on public.analytics_events (media_type, media_id, created_at desc);
create index if not exists idx_analytics_events_search_created on public.analytics_events (search_query, created_at desc) where search_query is not null;
create index if not exists idx_analytics_events_ad_created on public.analytics_events (ad_code, created_at desc) where ad_code is not null;
create index if not exists idx_analytics_events_device_created on public.analytics_events (device, created_at desc) where device is not null;
