create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

alter table public.site_settings enable row level security;

drop policy if exists "service role manages site settings" on public.site_settings;
create policy "service role manages site settings"
  on public.site_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

