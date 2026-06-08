# Sync service: incremental pagination and reconciliation

**Parent goal:** [Master plan](./README.md)

**Navigation:** [Previous](./04-wb-card-to-product-mapping.md) · [Index](./README.md) · [Next](./06-api-routes-cron-and-security.md)

## Objective

Implement the core sync orchestration: paginated fetch, incremental cursor persistence, upsert by `wbNmId`, and deactivation of WB-linked products no longer present on WB.

## Scope

**In scope**

- **Incremental mode (recommended default):**
  - Load last cursor from `WbSyncState` (subtask 03).
  - Request ascending sort; pass `cursor.updatedAt` / `cursor.nmID` from prior response until `response.cursor.total < request.cursor.limit`.
  - After **successful** completion, persist the latest cursor for the next run.
  - For each card: find `Product` by `wbNmId`; **create** if missing, **update** if changed (use mapper from subtask 04).
- **Rate limiting:** use the client from subtask 02 so sync does not bypass limits.
- **Reconciliation / removals:**
  - Incremental stream alone may **not** reveal cards deleted from WB. Implement at least one of:
    - **Full pass mode:** paginate from empty cursor through entire catalog, collect all nmIDs in a run, then `UPDATE Product SET isActive = false WHERE wbNmId IS NOT NULL AND wbNmId NOT IN (...)` in batches; or
    - **Scheduled full pass:** same as above on a slower cadence; incremental runs more frequently.
  - Do **not** deactivate products with `wbNmId IS NULL` (manual catalog entries).
- **Return value:** structured result for API/UI: counts `{ added, updated, deactivated, unchanged, errors }`, optional arrays of nmIDs capped to avoid huge payloads, and `durationMs`.

**Out of scope**

- HTTP route auth (subtask 06).
- Admin UI (subtask 07).

## Background

- **Explore:** `src/lib/prisma.ts` for client singleton; existing bulk logic `src/app/api/products/bulk/route.ts` for transaction patterns if useful.
- SQLite: avoid holding a single transaction open across hundreds of HTTP pages; batch per page or per N records.

## Implementation notes

1. Place orchestration in e.g. `src/lib/wb/sync-products.ts` exporting `runWbProductSync(options: { mode: 'incremental' | 'full'; signal?: AbortSignal }): Promise<SyncResult>`.
2. On partial failure, define whether cursor advances (prefer **no** advance until page committed; document).
3. **429 / network:** propagate retry from client; if run aborts mid-way, cursor behavior should be safe (ideally at-most-one page idempotency via `wbNmId` upsert).
4. **Idempotency:** repeated sync should not duplicate products (unique `wbNmId`).
5. Logging: one line per page + summary; log error nmIDs.

## Acceptance criteria

- Incremental run twice in a row: second run performs minimal writes if WB data unchanged.
- Full reconciliation deactivates a test product whose nmID was removed from the mock/fixture scenario (integration test or documented manual QA).
- Manual-only products (`wbNmId` null) remain active across syncs.

## Handoff

Subtask **06** exposes `runWbProductSync` via authenticated routes; **07** displays returned counts.
