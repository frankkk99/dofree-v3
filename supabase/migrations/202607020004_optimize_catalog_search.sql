alter table public.tmdb_catalog
add column if not exists search_text text;

update public.tmdb_catalog
set search_text = lower(concat_ws(' ',
  title,
  title_en,
  overview,
  language,
  source_bucket,
  coalesce(genres::text, '')
));

create index if not exists idx_tmdb_catalog_active_bucket
on public.tmdb_catalog (is_active, source_bucket);

create index if not exists idx_tmdb_catalog_active_language
on public.tmdb_catalog (is_active, language);

create index if not exists idx_tmdb_catalog_active_media_type
on public.tmdb_catalog (is_active, media_type);

create index if not exists idx_tmdb_catalog_active_rating
on public.tmdb_catalog (is_active, rating desc);

create index if not exists idx_tmdb_catalog_active_sort_score
on public.tmdb_catalog (is_active, sort_score desc nulls last);

create index if not exists idx_admin_movie_links_active_tmdb
on public.admin_movie_links (is_active, media_type, tmdb_id);
