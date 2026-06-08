# Environment and configuration

**Parent goal:** [Master plan](./README.md) — integrate the Voice Toys product database with the Wildberries Content API.

**Navigation:** [Index](./README.md) · Next: [02 — Wildberries HTTP client](./02-wildberries-http-client.md)

## Objective

Define and document all configuration needed to call WB APIs and to protect sync endpoints, without coupling secrets to code.

## Scope

**In scope**

- New env vars (names are suggestions; align with existing `.env.local` style in the repo):
  - `WILDBERRIES_CONTENT_API_TOKEN` (or `WB_API_TOKEN`) — token sent as `Authorization` on Content and Common API calls (verify exact header format in WB docs).
  - Optional: `WB_SYNC_CRON_SECRET` — shared secret for `Authorization: Bearer <secret>` or query param on a cron-only route (match patterns used elsewhere if any).
- Centralized config module (e.g. `src/lib/wb/config.ts`) reading `process.env` with clear validation errors when token is missing on server actions that need it.
- Brief comment in implementation PR listing vars for operators (no credential values in repo).

**Out of scope**

- Implementing HTTP calls (subtask 02).
- Database changes (subtask 03).

## Background

- The user’s environment uses `.env.local`; Next.js loads this for server code.
- No `.env.example` was found in the workspace snapshot; if the project adds one later, mirror these keys there **without values**.

## Implementation notes

1. **Explore:** Grep for `process.env` in `src/` to match naming conventions (e.g. CDEK, S3).
2. Add a small `getWbContentToken(): string` (or similar) that throws a descriptive error if unset when sync runs.
3. Document base URLs in one place:
   - Content: `https://content-api.wildberries.ru`
   - Common (ping): `https://common-api.wildberries.ru`
4. Confirm with WB documentation whether `Authorization` is raw token or `Bearer <token>`; wire the client (subtask 02) accordingly.

## Acceptance criteria

- All sync-related code reads the token from config, not scattered `process.env` reads.
- Missing token fails fast with a clear message in logs/API response for admin/cron callers.
- No secrets committed in markdown or code.

## Handoff

Subtask **02** expects stable env var names and a config module it can import for URLs and token retrieval.
