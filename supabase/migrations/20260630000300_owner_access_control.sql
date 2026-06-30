-- Owner Access Control foundation.
-- Safe for production: additive only, preserves existing profiles/admin data.

create extension if not exists pgcrypto;

create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  role_key text unique not null,
  display_name text not null,
  description text,
  is_system boolean default false,
  enabled boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key text unique not null,
  module_key text not null,
  display_name text not null,
  description text,
  risk_level text default 'low',
  enabled boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_key text not null,
  permission_key text not null,
  allowed boolean default false,
  requires_approval boolean default true,
  can_bulk boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(role_key, permission_key)
);

create table if not exists public.admin_user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  permission_key text not null,
  allowed boolean,
  requires_approval boolean,
  can_bulk boolean,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, permission_key)
);

alter table public.admin_roles add column if not exists role_key text;
alter table public.admin_roles add column if not exists display_name text;
alter table public.admin_roles add column if not exists description text;
alter table public.admin_roles add column if not exists is_system boolean default false;
alter table public.admin_roles add column if not exists enabled boolean default true;
alter table public.admin_roles add column if not exists sort_order integer default 0;
alter table public.admin_roles add column if not exists created_at timestamptz default now();
alter table public.admin_roles add column if not exists updated_at timestamptz default now();

alter table public.admin_permissions add column if not exists permission_key text;
alter table public.admin_permissions add column if not exists module_key text;
alter table public.admin_permissions add column if not exists display_name text;
alter table public.admin_permissions add column if not exists description text;
alter table public.admin_permissions add column if not exists risk_level text default 'low';
alter table public.admin_permissions add column if not exists enabled boolean default true;
alter table public.admin_permissions add column if not exists sort_order integer default 0;
alter table public.admin_permissions add column if not exists created_at timestamptz default now();
alter table public.admin_permissions add column if not exists updated_at timestamptz default now();

alter table public.admin_role_permissions add column if not exists role_key text;
alter table public.admin_role_permissions add column if not exists permission_key text;
alter table public.admin_role_permissions add column if not exists allowed boolean default false;
alter table public.admin_role_permissions add column if not exists requires_approval boolean default true;
alter table public.admin_role_permissions add column if not exists can_bulk boolean default false;
alter table public.admin_role_permissions add column if not exists created_at timestamptz default now();
alter table public.admin_role_permissions add column if not exists updated_at timestamptz default now();

alter table public.admin_user_permission_overrides add column if not exists user_id uuid;
alter table public.admin_user_permission_overrides add column if not exists permission_key text;
alter table public.admin_user_permission_overrides add column if not exists allowed boolean;
alter table public.admin_user_permission_overrides add column if not exists requires_approval boolean;
alter table public.admin_user_permission_overrides add column if not exists can_bulk boolean;
alter table public.admin_user_permission_overrides add column if not exists note text;
alter table public.admin_user_permission_overrides add column if not exists created_at timestamptz default now();
alter table public.admin_user_permission_overrides add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_permissions_risk_level_check') then
    alter table public.admin_permissions
      add constraint admin_permissions_risk_level_check
      check (risk_level in ('low', 'medium', 'high', 'critical'))
      not valid;
  end if;
end $$;

insert into public.admin_roles (role_key, display_name, description, is_system, enabled, sort_order)
values
  ('owner', 'Owner', 'Full access to roles, permissions, security, and system settings.', true, true, 0),
  ('admin_supervisor', 'Supervisor', 'Operational reviewer with limited approval and reporting access.', true, true, 10),
  ('admin_content', 'Content Curator', 'Content operations role with approval boundaries.', true, true, 20)
on conflict (role_key) do update
set
  display_name = excluded.display_name,
  description = excluded.description,
  is_system = true,
  enabled = true,
  sort_order = excluded.sort_order,
  updated_at = now();

create index if not exists admin_roles_role_key_idx on public.admin_roles (role_key);
create index if not exists admin_permissions_permission_key_idx on public.admin_permissions (permission_key);
create index if not exists admin_permissions_module_key_idx on public.admin_permissions (module_key);
create index if not exists admin_role_permissions_role_key_idx on public.admin_role_permissions (role_key);
create index if not exists admin_role_permissions_permission_key_idx on public.admin_role_permissions (permission_key);
create index if not exists admin_user_permission_overrides_user_id_idx on public.admin_user_permission_overrides (user_id);
create index if not exists admin_user_permission_overrides_permission_key_idx on public.admin_user_permission_overrides (permission_key);

create or replace function public.set_admin_access_control_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_roles_updated_at on public.admin_roles;
create trigger set_admin_roles_updated_at
before update on public.admin_roles
for each row execute function public.set_admin_access_control_updated_at();

drop trigger if exists set_admin_permissions_updated_at on public.admin_permissions;
create trigger set_admin_permissions_updated_at
before update on public.admin_permissions
for each row execute function public.set_admin_access_control_updated_at();

drop trigger if exists set_admin_role_permissions_updated_at on public.admin_role_permissions;
create trigger set_admin_role_permissions_updated_at
before update on public.admin_role_permissions
for each row execute function public.set_admin_access_control_updated_at();

drop trigger if exists set_admin_user_permission_overrides_updated_at on public.admin_user_permission_overrides;
create trigger set_admin_user_permission_overrides_updated_at
before update on public.admin_user_permission_overrides
for each row execute function public.set_admin_access_control_updated_at();

alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_user_permission_overrides enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_roles' and policyname = 'admin_roles_service_role_all') then
    create policy admin_roles_service_role_all on public.admin_roles for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_permissions' and policyname = 'admin_permissions_service_role_all') then
    create policy admin_permissions_service_role_all on public.admin_permissions for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_role_permissions' and policyname = 'admin_role_permissions_service_role_all') then
    create policy admin_role_permissions_service_role_all on public.admin_role_permissions for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_user_permission_overrides' and policyname = 'admin_user_permission_overrides_service_role_all') then
    create policy admin_user_permission_overrides_service_role_all on public.admin_user_permission_overrides for all to service_role using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.admin_roles to service_role;
grant select, insert, update, delete on public.admin_permissions to service_role;
grant select, insert, update, delete on public.admin_role_permissions to service_role;
grant select, insert, update, delete on public.admin_user_permission_overrides to service_role;
