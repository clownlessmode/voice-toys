# Wildberries product sync — master plan

## Context

The **voice-toys** app uses **Prisma** with **SQLite** (`prisma/schema.prisma`). The `Product` model drives the storefront via `src/app/api/products/route.ts` and admin CRUD under `src/app/api/products/` and `src/app/admin/products/`. Products are transformed with `transformProductFromDB` / `validateProductData` in `src/lib/product-utils.ts`.

There is **no** `isActive`, soft-delete, or external marketplace id on products today. The public catalog query does not filter hidden rows, so introducing “deactivated” products requires an explicit field and **where** clauses on storefront-facing reads (and a decision for admin lists).

Admin access is **cookie-based** (`admin-auth` from `src/app/api/admin/login/route.ts`, gated by `src/middleware.ts`). There is **no** existing in-repo cron; scheduled runs will likely use a host feature (e.g. Vercel Cron) or an external scheduler hitting a **secret-protected** route.

External API patterns exist elsewhere (e.g. CDEK Bearer usage under `src/app/api/cdek/`). Tests use **Vitest** (`npm run test:run`).

Wildberries requirements: **Content API** `POST …/content/v2/get/cards/list` with `Authorization: <token>`, ascending sort, `cursor.limit` max 100, `filter.withPhoto: -1`, cursor pagination via `cursor.updatedAt` / `cursor.nmID`; **connectivity** `GET https://common-api.wildberries.ru/ping`; rate limits (~100 req/min, ~600 ms spacing, burst 5) and **429** handling; **incremental** cursor persistence; DB upsert by **nmID**; create / update / **deactivate** when absent on WB; manual sync with **counts** (added, updated, deactivated, errors).

## Approach

Work proceeds in dependency order: **config → HTTP client with rate limiting → schema/migrations → mapping → sync orchestration → HTTP/cron entrypoints → admin UI → tests/observability**.

**Incremental vs removals:** Cursor-based incremental sync efficiently applies **new and changed** WB cards. Detecting cards **removed** from WB usually requires either a **full enumeration** of all nmIDs (full pass) or a **periodic reconciliation** job. This plan recommends a **hybrid**: incremental runs for frequent updates plus a **configurable full reconciliation** (separate mode, flag, or less frequent schedule) so `deactivate` is correct without re-downloading the entire catalog on every 10–minute tick.

**Where to store the sync cursor:** Prefer a **dedicated table** (e.g. single-row `WbSyncCursor` or named rows for `incremental` vs `full`) rather than only per-product fields. Per-product `wbNmId` (unique) remains essential for upserts; optional `wbCardUpdatedAt` on `Product` aids debugging and idempotent updates.

**Deactivate vs delete:** The codebase has no prior pattern; **add `isActive` (default `true`)** and filter **public** product APIs to `isActive: true` unless an admin-only query param is explicitly desired. Preserve rows for order history (`OrderItem` → `Product`).

## Risks and unknowns

- **WB payload shape** may differ from the sample fields; implementers should log a sample card in dev and adjust mapping (see subtask 04).
- **Authorization header format** (raw token vs `Bearer`) must match WB docs; verify with ping + one list call.
- **SQLite** concurrency: long syncs should batch writes; consider transaction boundaries per page or per N cards.
- **Price and availability** on cards may not map 1:1 to `price`, `pickupAvailability`, `deliveryAvailability`; defaults or placeholders may be required until prices come from another WB API (out of scope unless discovered necessary).
- **Hosting**: Cron availability and route timeouts (serverless) may require chunking or background job strategy; validate on the deployment target early.

## Definition of done

- Env-based WB token; ping and list calls succeed in dev/staging.
- Prisma migration adds WB linkage + sync state + `isActive`; storefront hides inactive products.
- Sync implements pagination, rate limiting, 429 backoff, and persists cursor(s).
- Manual admin sync shows **added / updated / deactivated / errors**; optional cron documented or implemented.
- Automated tests cover mapping and/or sync helpers where practical; critical paths documented for manual QA.

## Tasks

1. [Environment and configuration](./01-environment-and-configuration.md)
2. [Wildberries HTTP client (ping, cards, rate limits)](./02-wildberries-http-client.md)
3. [Database schema: WB fields, active flag, sync cursor](./03-database-schema-wb-fields-and-sync-state.md)
4. [WB card → Product mapping and defaults](./04-wb-card-to-product-mapping.md)
5. [Sync service: incremental pagination and reconciliation](./05-sync-service-incremental-and-reconciliation.md)
6. [API routes: admin sync, optional cron, security](./06-api-routes-cron-and-security.md)
7. [Admin UI: manual Wildberries sync](./07-admin-ui-manual-sync.md)
8. [Tests, logging, and operational notes](./08-tests-logging-and-operations.md)

### Execution notes

- Subtasks **01–05** are mostly sequential.
- **06** depends on **05**; **07** depends on **06**.
- **08** can start in parallel with **06–07** for unit tests of pure functions, but integration tests need **06** stable.
