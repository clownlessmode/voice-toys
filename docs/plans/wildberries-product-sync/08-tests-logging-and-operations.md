# Tests, logging, and operations

**Parent goal:** [Master plan](./README.md)

**Navigation:** [Previous](./07-admin-ui-manual-sync.md) · [Index](./README.md)

## Objective

Lock in correctness for mapping and sync helpers, protect regressions on public product filtering, and document how to run and monitor WB sync in production.

## Scope

**In scope**

- **Unit tests (Vitest):**
  - Rate limiter / 429 backoff logic in the WB client (mock `fetch`).
  - `map-card-to-product` pure functions with fixture JSON.
  - Optional: sync state machine with mocked client + mocked Prisma (or in-memory SQLite) — prioritize high-value cases.
- **Regression:** test that `GET /api/products` (or equivalent storefront query) **excludes** `isActive: false` if implemented in subtask 03 — extend existing tests under `test/` (e.g. `test/api/comprehensive-server.test.ts` pattern).
- **Logging:** ensure sync summary logs at INFO; errors with nmID; never log token.
- **Operations checklist** (short, in PR description or comment): env vars, cron schedule suggestion (10–30 min incremental; full reconcile less often), how to run manual sync, what to do on repeated 429.

**Out of scope**

- Load testing WB API.
- New user-facing markdown docs unless the repo already expects them (per project norms, avoid extra `.md` files).

## Background

- **Explore:** `npm run test:run`, Vitest config, and how API routes are tested (`NextRequest`, supertest patterns in `test/api/`).
- Prisma tests may use test database or mocks; follow existing conventions.

## Implementation notes

1. Add fixtures under `test/fixtures/wb-card-sample.json` (anonymized).
2. If integration tests need WB token, skip in CI when env missing (`describe.skipIf`).
3. Document **manual QA**: ping → incremental sync → verify product count → full reconcile → verify deactivation of removed card (staging).

## Acceptance criteria

- `npm run test:run` passes in CI with new tests.
- Public catalog behavior for inactive products is covered by at least one test.
- Operators have a concise runbook in ticket/PR (not necessarily a new file).

## Handoff

Initiative complete when [Definition of done](./README.md#definition-of-done) in the master plan is satisfied.
