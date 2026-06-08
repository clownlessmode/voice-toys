# Wildberries HTTP client (ping, cards, rate limits)

**Parent goal:** [Master plan](./README.md)

**Navigation:** [Previous](./01-environment-and-configuration.md) · [Index](./README.md) · [Next](./03-database-schema-wb-fields-and-sync-state.md)

## Objective

Provide a small, testable WB API layer: connectivity ping, paginated card list, rate limiting, and 429 handling.

## Scope

**In scope**

- `GET https://common-api.wildberries.ru/ping` using token from [01](./01-environment-and-configuration.md).
- `POST https://content-api.wildberries.ru/content/v2/get/cards/list` with:
  - `settings.sort.ascending: true`
  - `cursor.limit`: up to **100**
  - `filter.withPhoto: -1`
  - Cursor from response: `cursor.updatedAt`, `cursor.nmID` for next request; stop when `response.cursor.total < request.cursor.limit` (per product requirements).
- **Rate limiting:** target ~100 req/min, ~**600 ms** minimum interval, **burst 5** (implement a token bucket or sliding window; align with WB’s documented category limits).
- **429:** respect `Retry-After` if present; exponential backoff with jitter; cap retries and surface failure to caller.
- TypeScript types for request/response as **unknown** or partial interfaces with runtime validation for fields the mapper needs (subtask 04).

**Out of scope**

- Prisma / DB (subtask 03+).
- Business mapping of card fields to `Product`.

## Background

- **Explore:** `src/app/api/cdek/` for fetch patterns, error handling, and env usage.
- WB list endpoint returns cards and cursor metadata; exact JSON shape should be verified against live API or official docs in implementation.

## Implementation notes

1. Place client in e.g. `src/lib/wb/client.ts` or `src/lib/wildberries/` with:
   - `ping(): Promise<boolean>` or returns status/body for admin diagnostics.
   - `fetchCardsPage(params: { cursor?: { updatedAt?: string; nmID?: number }; limit: number }): Promise<WbCardsPageResult>`.
2. Serialize list requests so **global** rate limit applies across concurrent callers (single mutex or queue).
3. Log structured errors (status, body snippet, nmID cursor) at `warn`/`error` without logging full token.
4. Unit-test the limiter with fake timers if feasible (Vitest).

## Acceptance criteria

- Ping and one page of cards can be called from a one-off script or route without hitting DB.
- Rapid repeated calls are throttled; 429 triggers backoff and does not spin tight loops.
- Types and parsing fail safely if WB adds unexpected fields.

## Handoff

Subtask **03** is independent; **04** and **05** depend on this client for real API data and on **03** for persistence.
