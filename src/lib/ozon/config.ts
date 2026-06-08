/**
 * Ozon Seller API — configuration.
 *
 * Set in `.env.local`:
 * - `OZON_CLIENT_ID` — seller Client-Id from Seller API settings
 * - `OZON_API_KEY` — API key (Admin role recommended for logistics)
 */

export const OZON_SELLER_API_BASE_URL =
  "https://api-seller.ozon.ru" as const;

function readOzonClientIdFromEnv(): string | undefined {
  const id = process.env.OZON_CLIENT_ID?.trim();
  return id || undefined;
}

function readOzonApiKeyFromEnv(): string | undefined {
  const key = process.env.OZON_API_KEY?.trim();
  return key || undefined;
}

export function getOzonClientId(): string {
  const id = readOzonClientIdFromEnv();
  if (!id) {
    throw new Error("Missing OZON_CLIENT_ID in environment.");
  }
  return id;
}

export function getOzonApiKey(): string {
  const key = readOzonApiKeyFromEnv();
  if (!key) {
    throw new Error("Missing OZON_API_KEY in environment.");
  }
  return key;
}

export function isOzonConfigured(): boolean {
  return Boolean(readOzonClientIdFromEnv() && readOzonApiKeyFromEnv());
}
