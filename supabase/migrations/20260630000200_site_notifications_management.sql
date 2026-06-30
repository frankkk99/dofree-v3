-- Extend site_notifications for admin-managed scheduled notifications.
-- Safe for production: preserves existing rows and only adds missing columns/indexes.

create extension if not exists pgcrypto;

create table if not exists public.site_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  detail text,
  type text default 'general',
  priority integer default 0,
  audience text default 'all',
  cta_label text,
  cta_url text,
  secondary_cta_label text,
  secondary_cta_url text,
  image_url text,
  related_media_type text,
  related_tmdb_id integer,
  publish_at timestamptz,
  expires_at timestamptz,
  enabled boolean default true,
  pinned boolean default false,
  sort_order integer default 0,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.site_notifications add column if not exists detail text;
alter table public.site_notifications add column if not exists type text default 'general';
alter table public.site_notifications add column if not exists priority integer default 0;
alter table public.site_notifications add column if not exists audience text default 'all';
alter table public.site_notifications add column if not exists secondary_cta_label text;
alter table public.site_notifications add column if not exists secondary_cta_url text;
alter table public.site_notifications add column if not exists image_url text;
alter table public.site_notifications add column if not exists related_media_type text;
alter table public.site_notifications add column if not exists related_tmdb_id integer;
alter table public.site_notifications add column if not exists publish_at timestamptz;
alter table public.site_notifications add column if not exists expires_at timestamptz;
alter table public.site_notifications add column if not exists pinned boolean default false;
alter table public.site_notifications add column if not exists created_by uuid;
alter table public.site_notifications add column if not exists created_at timestamptz default now();
alter table public.site_notifications add column if not exists updated_at timestamptz default now();

alter table public.site_notifications alter column type set default 'general';
alter table public.site_notifications alter column priority set default 0;
alter table public.site_notifications alter column audience set default 'all';
alter table public.site_notifications alter column enabled set default true;
alter table public.site_notifications alter column pinned set default false;
alter table public.site_notifications alter column sort_order set default 0;
alter table public.site_notifications alter column created_at set default now();
alter table public.site_notifications alter column updated_at set default now();

update public.site_notifications
set
  type = coalesce(type, 'general'),
  priority = coalesce(priority, 0),
  audience = coalesce(audience, 'all'),
  enabled = coalesce(enabled, true),
  pinned = coalesce(pinned, false),
  sort_order = coalesce(sort_order, 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'site_notifications_type_check'
  ) then
    alter table public.site_notifications
      add constraint site_notifications_type_check
      check (type in ('general', 'system', 'new_release', 'episode_update', 'premium', 'maintenance', 'help', 'promotion'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'site_notifications_audience_check'
  ) then
    alter table public.site_notifications
      add constraint site_notifications_audience_check
      check (audience in ('all', 'guest', 'user', 'premium', 'admin'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'site_notifications_related_media_type_check'
  ) then
    alter table public.site_notifications
      add constraint site_notifications_related_media_type_check
      check (related_media_type is null or related_media_type in ('movie', 'tv'))
      not valid;
  end if;
end $$;

create index if not exists site_notifications_enabled_idx on public.site_notifications (enabled);
create index if not exists site_notifications_publish_at_idx on public.site_notifications (publish_at);
create index if not exists site_notifications_expires_at_idx on public.site_notifications (expires_at);
create index if not exists site_notifications_pinned_idx on public.site_notifications (pinned);
create index if not exists site_notifications_priority_idx on public.site_notifications (priority);
create index if not exists site_notifications_sort_order_idx on public.site_notifications (sort_order);
create index if not exists site_notifications_updated_at_idx on public.site_notifications (updated_at desc);

create or replace function public.set_site_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_notifications_updated_at on public.site_notifications;
create trigger set_site_notifications_updated_at
before update on public.site_notifications
for each row
execute function public.set_site_notifications_updated_at();

alter table public.site_notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_notifications'
      and policyname = 'site_notifications_service_role_all'
  ) then
    create policy site_notifications_service_role_all
      on public.site_notifications
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

grant select, insert, update, delete on public.site_notifications to service_role;
