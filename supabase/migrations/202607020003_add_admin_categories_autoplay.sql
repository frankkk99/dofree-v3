alter table public.admin_categories
add column if not exists autoplay boolean not null default false;

update public.admin_categories
set autoplay = false
where autoplay is null;
