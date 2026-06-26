# Admin Analytics and Maintenance System

## What this branch adds

This branch adds the first usable admin observability layer for DodeedeeV3:

- public-safe analytics event API at `/api/analytics`
- global browser tracker mounted in `app/layout.tsx`
- admin dashboard analytics summary
- Supabase migration for `analytics_events`, `admin_audit_logs`, and `system_health_snapshots`
- dashboard health flags for Supabase, TMDB, and analytics table readiness

## Events captured

The browser tracker records these events when available:

- `page_view`
- `detail_open`
- `watch_click`
- `search`
- `category_click`
- `favorite_click`
- `history_click`

The endpoint sanitizes input and writes through the server using the service role key. If the analytics table or env vars are missing, the endpoint returns a soft success so public pages do not break.

## Supabase setup

Run the migration:

```sql
supabase/migrations/20260626000100_admin_analytics_observability.sql
```

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_ACCESS_TOKEN=
```

## Dashboard panels

The admin dashboard now shows:

- visitors today
- page views today
- watch clicks in the last 7 days
- searches in the last 7 days
- daily traffic bars for page views, visitors, and watch clicks
- top content by detail/watch activity
- top search queries
- maintenance tasks for missing links, broken links, searches, and watch/detail activity
- system health checks

## Next improvements

Recommended next steps after this branch is verified:

1. Write `admin_audit_logs` from movie-link POST/PATCH, membership edits, and role changes.
2. Add a dedicated `/admin/analytics` page with date filters.
3. Add a broken-link report inbox with status changes: `pending`, `checking`, `fixed`, `ignored`.
4. Add scheduled link health checks and write results to `system_health_snapshots`.
5. Add CSV export for analytics and maintenance queues.
