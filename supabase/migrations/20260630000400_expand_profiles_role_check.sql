-- Expand profiles.role values for Owner Access Control.
-- Safe for production: constraint-only change, no data mutation.

alter table if exists public.profiles
  drop constraint if exists profiles_role_check;

alter table if exists public.profiles
  add constraint profiles_role_check
  check (
    role is null
    or role in (
      'guest',
      'viewer',
      'user',
      'free_user',
      'premium',
      'premium_user',
      'admin',
      'super_admin',
      'owner',
      'admin_supervisor',
      'supervisor',
      'admin_content',
      'content_curator'
    )
  );
