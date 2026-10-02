export const OZON_DELIVERY_TOKEN_URL = "https://xapi.ozon.ru/oauth/token" as const;
export const OZON_DELIVERY_API_BASE_URL = "https://api-delivery.ozon.ru" as const;
export const OZON_DELIVERY_SCOPE = "delivery-api.all" as const;

function env(name: "OZON_DELIVERY_CLIENT_ID" | "OZON_DELIVERY_CLIENT_SECRET"): string | undefined {
  const value = (name === "OZON_DELIVERY_CLIENT_ID"
    ? process.env.OZON_DELIVERY_CLIENT_ID
    : process.env.OZON_DELIVERY_CLIENT_SECRET)?.trim();
  return value || undefined;
}

export function getOzonDeliveryClientId(): string {
  const value = env("OZON_DELIVERY_CLIENT_ID");
  if (!value) throw new Error("Missing OZON_DELIVERY_CLIENT_ID in environment.");
  return value;
}

export function getOzonDeliveryClientSecret(): string {
  const value = env("OZON_DELIVERY_CLIENT_SECRET");
  if (!value) throw new Error("Missing OZON_DELIVERY_CLIENT_SECRET in environment.");
  return value;
}

export function isOzonDeliveryConfigured(): boolean {
  return Boolean(env("OZON_DELIVERY_CLIENT_ID") && env("OZON_DELIVERY_CLIENT_SECRET"));
}
