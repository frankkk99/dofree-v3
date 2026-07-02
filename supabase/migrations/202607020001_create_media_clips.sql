create extension if not exists pgcrypto;

create table if not exists public.media_clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  youtube_url text not null,
  youtube_video_id text not null,
  embed_url text not null,
  thumbnail_url text,

  clip_type text not null default 'shorts',
  spoiler_level text not null default 'none',
  language text not null default 'thai',

  media_type text,
  tmdb_id integer,
  media_title text,
  media_slug text,
  poster_url text,
  genres text[] not null default '{}',

  status text not null default 'draft',
  show_home boolean not null default false,
  show_clips boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint media_clips_clip_type_check check (clip_type in ('shorts', 'trailer', 'summary', 'spoiler', 'scene', 'review')),
  constraint media_clips_spoiler_level_check check (spoiler_level in ('none', 'light', 'heavy')),
  constraint media_clips_language_check check (language in ('thai_dub', 'thai_sub', 'thai', 'english', 'other')),
  constraint media_clips_media_type_check check (media_type is null or media_type in ('movie', 'tv')),
  constraint media_clips_status_check check (status in ('draft', 'published', 'hidden')),
  constraint media_clips_youtube_video_id_check check (length(trim(youtube_video_id)) > 0),
  constraint media_clips_title_check check (length(trim(title)) > 0)
);

create index if not exists media_clips_status_idx on public.media_clips (status);
create index if not exists media_clips_show_clips_idx on public.media_clips (show_clips);
create index if not exists media_clips_show_home_idx on public.media_clips (show_home);
create index if not exists media_clips_clip_type_idx on public.media_clips (clip_type);
create index if not exists media_clips_language_idx on public.media_clips (language);
create index if not exists media_clips_tmdb_idx on public.media_clips (media_type, tmdb_id);
create index if not exists media_clips_sort_idx on public.media_clips (sort_order asc, created_at desc);
create index if not exists media_clips_genres_idx on public.media_clips using gin (genres);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists media_clips_set_updated_at on public.media_clips;
create trigger media_clips_set_updated_at
before update on public.media_clips
for each row
execute function public.set_updated_at();

alter table public.media_clips enable row level security;

drop policy if exists "Public can read published clips" on public.media_clips;
create policy "Public can read published clips"
  on public.media_clips
  for select
  using (status = 'published' and show_clips = true);
