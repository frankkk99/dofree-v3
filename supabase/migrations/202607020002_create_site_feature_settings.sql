create table if not exists public.site_feature_settings (
  feature_key text primary key,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.site_feature_settings (feature_key, is_enabled)
values ('home_clips_section', true)
on conflict (feature_key) do nothing;

alter table public.site_feature_settings enable row level security;

drop policy if exists "Public can read site feature settings" on public.site_feature_settings;
create policy "Public can read site feature settings"
on public.site_feature_settings
for select
using (true);
