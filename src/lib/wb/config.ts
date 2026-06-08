/**
 * Wildberries (Content + Common) API — configuration only.
 *
 * Operators: set in `.env.local` (no values in repo):
 * - `WILDBERRIES_CONTENT_API_TOKEN` — required for API calls. Optional aliases: `WB_API_TOKEN`, `WB_API_KEY`.
 *   Header: `Authorization: <token>` (raw token string; not `Bearer` — see Wildberries API docs).
 *   The same token is used for **Discounts & prices** (`discounts-prices-api.wildberries.ru`) when loading `nmList` prices during sync.
 * - `WB_SYNC_CRON_SECRET` — required for `GET`/`POST` `/api/cron/wb-sync`. Authenticate with
 *   **either** `Authorization: Bearer <WB_SYNC_CRON_SECRET>` or header `X-WB-Sync-Secret: <WB_SYNC_CRON_SECRET>`
 *   (same value; name is case-insensitive). If unset, the route responds 503.
 */

export const WB_CONTENT_API_BASE_URL =
  "https://content-api.wildberries.ru" as const;
export const WB_COMMON_API_BASE_URL =
  "https://common-api.wildberries.ru" as const;
/** «Цены и скидки» — загрузка цен (GET `/api/v2/list/goods/filter`). */
export const WB_DISCOUNTS_API_BASE_URL =
  "https://discounts-prices-api.wildberries.ru" as const;
/** Marketplace API — склады продавца и остатки. */
export const WB_MARKETPLACE_API_BASE_URL =
  "https://marketplace-api.wildberries.ru" as const;

function readWbContentTokenFromEnv(): string | undefined {
  const primary = process.env.WILDBERRIES_CONTENT_API_TOKEN?.trim();
  if (primary) return primary;
  const alt = process.env.WB_API_TOKEN?.trim();
  if (alt) return alt;
  const key = process.env.WB_API_KEY?.trim();
  if (key) return key;
  return undefined;
}

/**
 * Returns the API token for `Authorization` on Content/Common requests (raw value; client sets header in subtask 02).
 * @throws Error if no token is configured
 */
export function getWbContentToken(): string {
  const token = readWbContentTokenFromEnv();
  if (!token) {
    throw new Error(
      "Missing Wildberries API token. Set WILDBERRIES_CONTENT_API_TOKEN (or WB_API_TOKEN or WB_API_KEY) in the environment."
    );
  }
  return token;
}

/**
 * Shared secret for `/api/cron/wb-sync`: must match `Authorization: Bearer …` or `X-WB-Sync-Secret` header.
 * Undefined if unset.
 */
export function getWbSyncCronSecret(): string | undefined {
  const s = process.env.WB_SYNC_CRON_SECRET?.trim();
  return s || undefined;
}

export {
  getOzonApiKey,
  getOzonClientId,
  isOzonConfigured,
} from "@/lib/ozon/config";
