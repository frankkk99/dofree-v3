create table if not exists public.admin_series_episodes (
  id uuid primary key default gen_random_uuid(),
  tmdb_id bigint not null,
  media_type text not null default 'tv' check (media_type = 'tv'),
  season_number integer not null default 1 check (season_number > 0),
  episode_number integer not null check (episode_number > 0),
  episode_title text,
  watch_url text,
  trailer_url text,
  provider text,
  notes text,
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'broken', 'hidden')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tmdb_id, season_number, episode_number)
);

create index if not exists admin_series_episodes_tmdb_idx on public.admin_series_episodes (tmdb_id, season_number, episode_number);
create index if not exists admin_series_episodes_ready_idx on public.admin_series_episodes (tmdb_id, status, is_active) where watch_url is not null;
create index if not exists admin_series_episodes_updated_idx on public.admin_series_episodes (updated_at desc);

create or replace function public.set_admin_series_episodes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_series_episodes_updated_at on public.admin_series_episodes;
create trigger set_admin_series_episodes_updated_at
before update on public.admin_series_episodes
for each row
execute function public.set_admin_series_episodes_updated_at();

alter table public.admin_series_episodes enable row level security;

drop policy if exists "service role manages series episodes" on public.admin_series_episodes;
create policy "service role manages series episodes"
on public.admin_series_episodes
for all
to service_role
using (true)
with check (true);
