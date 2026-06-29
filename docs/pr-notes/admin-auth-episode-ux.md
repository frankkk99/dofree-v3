# Clean up admin episode UX and auth provider page

This note documents the scoped changes in this PR.

## Included

- Removed Series Bulk from the Admin Workspace module map and topbar.
- Removed the AdminSeriesBulkManager render path from `/admin`.
- Added a small UI guard so Bulk Paste controls are not visible in the Content/Catalog admin flow while preserving backend/API code.
- Simplified the homepage drawer for signed-out users to only show Sign in / Sign up actions.
- Moved provider options into `/auth` via `AuthPanel`.
- Marked unavailable providers as disabled / coming soon.
- Kept Email + Password as the only enabled provider.
- Updated auth copy to communicate as ดูดีดี.online / DooDeeDee.online.

## Supabase Auth Email Template follow-up

Configure Supabase Auth Email Templates and Sender Name in the Supabase Dashboard:

- Sender name: ดูดีดี.online
- Confirm email subject: ยืนยันอีเมลสำหรับบัญชีดูดีดี.online
- Reset password subject: รีเซ็ตรหัสผ่านบัญชีดูดีดี.online
- OTP subject: รหัสยืนยันการเข้าสู่ระบบดูดีดี.online

Do not store SMTP passwords, client secrets, or any secret values in the repository.

## Build

`npm run build` was not executed locally in this ChatGPT sandbox because the environment cannot resolve `github.com` to clone/install the repository. The PR is intentionally opened as Draft for repository-side build checks before merge.
