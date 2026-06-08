# API routes: admin sync, optional cron, security

**Parent goal:** [Master plan](./README.md)

**Navigation:** [Previous](./05-sync-service-incremental-and-reconciliation.md) · [Index](./README.md) · [Next](./07-admin-ui-manual-sync.md)

## Objective

Expose sync and diagnostics over HTTP with appropriate protection: admin session for manual operations, secret or platform cron for scheduled runs.

## Scope

**In scope**

- **Admin-authenticated endpoints** (same security model as other admin actions):
  - **Explore:** How admin pages call APIs today (cookie `admin-auth` is **not** HttpOnly in `src/app/api/admin/login/route.ts` — client `fetch` from `/admin` may rely on cookies; for `POST` from admin UI, use `credentials: 'include'`).
  - Suggested routes under `src/app/api/admin/wb/`:
    - `POST …/sync` — body: `{ mode?: 'incremental' | 'full' }`; returns JSON result from subtask 05.
    - `GET …/ping` — proxies WB ping for settings UI diagnostics.
- **Cron endpoint** (optional but recommended for “every 10–30 min”):
  - e.g. `GET` or `POST` `src/app/api/cron/wb-sync/route.ts` checking `WB_SYNC_CRON_SECRET` header or `Authorization` bearer.
  - Document for Vercel Cron (`vercel.json`) or external ping; note **max duration** limits on serverless.
- Reject unauthenticated calls to admin routes with **401/403**.
- Do not log the WB token.

**Out of scope**

- Admin React UI (subtask 07).

## Background

- `src/middleware.ts` only protects **pages** under `/admin`, not necessarily `/api/*` — **API routes must validate admin** (e.g. read `admin-auth` cookie or reuse a small helper). **Explore:** whether any `src/app/api/admin/*` routes already check the cookie; align with that pattern.

## Implementation notes

1. Add `assertAdmin(request)` helper if missing, shared by WB admin routes.
2. Cron route should default `mode: 'incremental'`; full reconciliation on a less frequent schedule or separate cron entry.
3. Return **JSON** with counts and error messages suitable for UI alerts.
4. If request would exceed platform timeout, consider returning **202** + run id pattern — only if needed; otherwise keep sync within limits or chunk (future).

## Acceptance criteria

- Unauthenticated access to admin WB sync fails.
- Cron URL works with correct secret and fails without it.
- Ping route confirms token/connectivity from the server environment.

## Handoff

Subtask **07** calls `POST /api/admin/wb/sync` and `GET /api/admin/wb/ping` with credentials; **08** adds API tests if feasible.
