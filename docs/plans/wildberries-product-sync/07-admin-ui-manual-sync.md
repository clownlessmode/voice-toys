# Admin UI: manual Wildberries sync

**Parent goal:** [Master plan](./README.md)

**Navigation:** [Previous](./06-api-routes-cron-and-security.md) · [Index](./README.md) · [Next](./08-tests-logging-and-operations.md)

## Objective

Let operators trigger WB sync from the admin panel and see **added**, **updated**, **deactivated**, and **error** counts, plus connectivity status.

## Scope

**In scope**

- UI location: extend **`src/app/admin/settings/page.tsx`** (already has data-management actions) **or** add a dedicated `src/app/admin/wildberries/page.tsx` and link it from `src/app/admin/layout.tsx` nav — choose one; settings is faster to ship, dedicated page scales better.
- Controls:
  - **Ping** button → call `GET /api/admin/wb/ping`, show success/failure.
  - **Sync now** → `POST /api/admin/wb/sync` with optional toggle or dropdown for `incremental` vs `full` reconciliation (explain tooltips in Russian to match existing admin copy).
  - Loading state, disable double-submit, show last result summary (counts + timestamp + error list if any).
- Styling: match existing Tailwind patterns (`admin/settings`, `admin/products`).

**Out of scope**

- Full Figma spec; this is functional admin UI. If the orchestrator prefers layout-only polish, a follow-up could use **figma-layout-designer** — not required for MVP.

## Background

- **Explore:** `src/app/admin/settings/page.tsx` for button patterns; `src/app/admin/layout.tsx` for sidebar links.
- Client components use `fetch` with `credentials: 'include'` for cookie session.

## Implementation notes

1. Keep strings user-facing in Russian where the rest of admin is Russian.
2. Surface non-200 responses as readable alerts (toast or inline error).
3. Optional: show last cursor / last sync time from a small `GET /api/admin/wb/status` if you add state read — otherwise infer from sync response only.

## Acceptance criteria

- Logged-in admin can run ping and sync without using curl.
- Counts from backend match visible labels (added / updated / deactivated / errors).
- Errors from partial failure are visible (at least summary message).

## Handoff

Subtask **08** documents manual QA steps here; operations can use this page while cron runs in background.

**Intended subagent:** **worker** (wiring + behavior); not layout-only.
