# Database schema: WB fields, active flag, sync cursor

**Parent goal:** [Master plan](./README.md)

**Navigation:** [Previous](./02-wildberries-http-client.md) · [Index](./README.md) · [Next](./04-wb-card-to-product-mapping.md)

## Objective

Extend the Prisma schema so each product can be keyed by WB `nmID`, support **deactivation** instead of hard delete for removed WB cards, and persist **incremental sync cursor** state.

## Scope

**In scope**

- **`Product` model** (`prisma/schema.prisma`):
  - `wbNmId Int?` @unique (or `BigInt` if IDs exceed 32-bit safe range in JS — choose type consistent with Prisma + WB; document choice).
  - `isActive Boolean @default(true)` — **false** means removed from WB or manually hidden; public catalog must exclude these.
  - Optional: `wbCardUpdatedAt DateTime?` — last `updatedAt` seen from WB card for debugging and skip-if-unchanged optimizations.
- **Sync cursor table** (recommended):
  - e.g. `WbSyncState` with fields such as: `id` (singleton or enum key), `mode` (`incremental` | `full` if you support both), `cursorUpdatedAt` (string or DateTime as returned by WB), `cursorNmId` (Int?), `lastRunAt`, `lastSuccessAt`, `lastError` (optional text).
  - Rationale: cursor is **global pagination state**, not a property of a single product; avoids overloading `Product` rows.
- **Migration** under `prisma/migrations/` compatible with SQLite.
- Update **public** product queries to add `where: { isActive: true }` where appropriate:
  - **Explore:** `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, cart/checkout paths that resolve products for customers, and any `findMany` used by the storefront.
- **Admin** may list all products or toggle “show inactive”; decide minimal behavior (e.g. admin list shows inactive with a badge) — can be a follow-up in **07** if timeboxed.

**Out of scope**

- Backfilling `wbNmId` for legacy seed data (optional script; mention in handoff).
- Changing order semantics (`OrderItem` keeps FK to `Product`).

## Background

- Current `Product` fields include `name`, `breadcrumbs`, `images`, `price`, availability strings, `description`, `characteristics`, JSON `categories` / `ageGroups` — see full model in `prisma/schema.prisma`.
- SQLite is the datasource; migrations are the source of truth.

## Implementation notes

1. After schema change, run `npx prisma migrate dev` (or project-standard command) and regenerate client.
2. Existing products: `wbNmId` null means **not** WB-managed; sync should only deactivate rows that **have** `wbNmId` set when doing reconciliation (subtask 05).
3. Ensure unique constraint on `wbNmId` prevents duplicate imports.
4. If the app exposes product slugs/URLs by internal `id`, creating new rows for new WB cards is fine; `id` remains cuid.

## Acceptance criteria

- Migration applies cleanly on fresh and existing dev DBs.
- Storefront and customer-facing APIs do not return `isActive: false` products (unless explicitly documented exception).
- Prisma client exposes new fields; no raw SQL required for normal sync.

## Handoff

Subtask **04** maps WB JSON into create/update payloads using `wbNmId` / `isActive`. Subtask **05** reads/writes `WbSyncState` and upserts `Product` rows.
