import {
  getOzonDeliveryClientId,
  getOzonDeliveryClientSecret,
  isOzonDeliveryConfigured,
  OZON_DELIVERY_API_BASE_URL,
  OZON_DELIVERY_SCOPE,
  OZON_DELIVERY_TOKEN_URL,
} from "./config";

export type Money = { amount: string; currency_code: "RUB" };
export type ParcelDimensions = { weight_g: number; length_mm: number; width_mm: number; height_mm: number };
export type DeliveryPosting = {
  request_id: number;
  shipment_method_id: number;
  cutoff_at: string | null;
  declared_value: Money;
  dimensions: ParcelDimensions;
};
export type DeliveryPointSummary = { delivery_point_id: number; shipment_method_ids: number[] };
export type DeliveryPoint = {
  delivery_point_id: number;
  name: string;
  full_address: string;
  type: string;
  is_active: boolean;
  coordinates?: { latitude: number; longitude: number };
  schedule?: Array<Record<string, unknown>>;
  restrictions?: Record<string, unknown>;
};
export type CheckoutRequest = {
  recipient: { phone_number: string };
  postings: DeliveryPosting[];
  delivery: { delivery_point: { delivery_point_id: number } };
};
export type CheckoutResponse = { results: Array<{
  request_id: number;
  posting?: {
    estimated_delivery_cost?: Money;
    estimated_insurance_cost?: Money;
    estimated_delivery_days?: number;
    cutoff_at?: string;
  };
  error?: Record<string, unknown>;
}> };
export type CreateOrderRequest = Omit<CheckoutRequest, "recipient" | "postings"> & {
  order_external_id: string;
  recipient: { phone_number: string; full_name: string };
  postings: Array<DeliveryPosting & { posting_external_id: string; description: string }>;
};
export type CreateOrderResponse = {
  order_number: string;
  order_external_id?: string;
  postings: Array<{
    request_id: number;
    posting_number: string;
    posting_external_id?: string;
    estimated_delivery_days?: number;
    cutoff_at?: string;
  }>;
};
type ClientOptions = {
  getClientId?: () => string;
  getClientSecret?: () => string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
};

export class OzonDeliveryError extends Error {
  constructor(message: string, readonly status: number, readonly providerCode?: string) {
    super(message);
    this.name = "OzonDeliveryError";
  }
}

export function normalizeOzonDeliveryPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  if (!/^7\d{10}$/.test(digits)) throw new Error("Invalid Ozon Delivery phone number");
  return `+${digits}`;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function cookiePair(setCookie: string | null): string | null {
  return setCookie?.split(";", 1)[0]?.trim() || null;
}

export class OzonDeliveryClient {
  private readonly getClientId: (() => string) | null;
  private readonly getClientSecret: (() => string) | null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private tokenPromise: Promise<string> | null = null;

  constructor(options: ClientOptions = {}) {
    const configured = isOzonDeliveryConfigured();
    this.getClientId = options.getClientId ?? (configured ? getOzonDeliveryClientId : null);
    this.getClientSecret = options.getClientSecret ?? (configured ? getOzonDeliveryClientSecret : null);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => Date.now());
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async getAccessToken(): Promise<string> {
    if (this.token && this.tokenExpiresAt - this.now() > 60_000) return this.token;
    if (this.tokenPromise) return this.tokenPromise;
    this.tokenPromise = this.fetchToken().finally(() => { this.tokenPromise = null; });
    return this.tokenPromise;
  }

  private async fetchToken(): Promise<string> {
    if (!this.getClientId || !this.getClientSecret) {
      throw new OzonDeliveryError("Ozon Delivery is not configured", 503);
    }
    const response = await this.fetchImpl(OZON_DELIVERY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: this.getClientId(), client_secret: this.getClientSecret(),
        grant_type: "client_credentials", scope: [OZON_DELIVERY_SCOPE],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const data = await this.readJson(response, "OAuth");
    if (!response.ok) throw this.providerError(response.status, data, "Ozon OAuth rejected credentials");
    if (typeof data.access_token !== "string" || !data.access_token ||
        (typeof data.expires_in !== "number" && typeof data.expires_in !== "string")) {
      throw new OzonDeliveryError("Ozon OAuth returned an invalid response", 502);
    }
    const rawExpiry = Number(data.expires_in);
    if (!Number.isFinite(rawExpiry)) throw new OzonDeliveryError("Ozon OAuth returned an invalid expiry", 502);
    // The current API returns an absolute Unix timestamp; accept duration seconds defensively too.
    this.tokenExpiresAt = rawExpiry > 10_000_000_000 ? rawExpiry :
      rawExpiry > this.now() / 1000 - 60 ? rawExpiry * 1000 : this.now() + rawExpiry * 1000;
    this.token = data.access_token;
    return this.token;
  }

  private async readJson(response: Response, operation: string): Promise<Record<string, any>> {
    try {
      const value: unknown = await response.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      return value as Record<string, any>;
    } catch {
      throw new OzonDeliveryError(`Ozon ${operation} returned invalid JSON`, response.status || 502);
    }
  }

  private providerError(status: number, data: Record<string, any>, fallback: string): OzonDeliveryError {
    const nested = data.error && typeof data.error === "object" ? data.error : data;
    const code = nested.code == null ? undefined : String(nested.code);
    const message = typeof nested.message === "string" ? nested.message.slice(0, 240) : fallback;
    return new OzonDeliveryError(message, status, code);
  }

  private async post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
    let url = new URL(path, `${OZON_DELIVERY_API_BASE_URL}/`);
    const expectedOrigin = new URL(OZON_DELIVERY_API_BASE_URL).origin;
    let cookie: string | null = null;
    const serialized = JSON.stringify(body);
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      const token = await this.getAccessToken();
      const headers = new Headers({
        Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json",
      });
      if (cookie) headers.set("Cookie", cookie);
      if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
      const response = await this.fetchImpl(url.toString(), {
        method: "POST", headers, body: serialized, redirect: "manual", cache: "no-store",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (response.status !== 302 && response.status !== 307) {
        const data = await this.readJson(response, path);
        if (!response.ok) throw this.providerError(response.status, data, `Ozon ${path} failed`);
        return data as T;
      }
      const location = response.headers.get("location");
      if (!location) throw new OzonDeliveryError("Ozon redirect has no location", 502);
      const next = new URL(location, url);
      if (next.origin !== expectedOrigin || next.username || next.password) {
        throw new OzonDeliveryError("Ozon returned an unsafe redirect", 502);
      }
      if (redirects === 3) throw new OzonDeliveryError("Ozon redirect limit exceeded", 502);
      cookie = cookiePair(response.headers.get("set-cookie")) ?? cookie;
      url = next;
    }
    throw new OzonDeliveryError("Ozon redirect limit exceeded", 502);
  }

  async checkClient(phone: string): Promise<boolean> {
    const data = await this.post<{ can_be_delivered?: unknown }>("/v1/delivery/check-client", {
      phone_number: normalizeOzonDeliveryPhone(phone),
    });
    if (typeof data.can_be_delivered !== "boolean") throw new OzonDeliveryError("Invalid check-client response", 502);
    return data.can_be_delivered;
  }

  async listDeliveryPoints(cursor: string | null = null, limit = 100): Promise<{
    deliveryPoints: DeliveryPointSummary[]; nextCursor: string | null;
  }> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid delivery point limit");
    const data = await this.post<Record<string, unknown>>("/v1/delivery-point/list", {
      pagination: { cursor, limit },
    });
    if (!Array.isArray(data.delivery_points)) throw new OzonDeliveryError("Invalid delivery-point list response", 502);
    const deliveryPoints = data.delivery_points.map((value) => {
      if (!value || typeof value !== "object") throw new OzonDeliveryError("Invalid delivery point", 502);
      const row = value as Record<string, unknown>;
      const methods = typeof row.shipment_method_ids === "number" ? [row.shipment_method_ids] : row.shipment_method_ids;
      if (!positiveInteger(row.delivery_point_id) || !Array.isArray(methods) || !methods.every(positiveInteger)) {
        throw new OzonDeliveryError("Invalid delivery point", 502);
      }
      return { delivery_point_id: row.delivery_point_id, shipment_method_ids: methods };
    });
    const nextCursor = data.next_cursor == null ? null : data.next_cursor;
    if (nextCursor !== null && typeof nextCursor !== "string") throw new OzonDeliveryError("Invalid pagination cursor", 502);
    return { deliveryPoints, nextCursor };
  }

  async getDeliveryPoints(ids: number[]): Promise<DeliveryPoint[]> {
    if (!ids.length || ids.length > 100 || !ids.every(positiveInteger)) throw new Error("Invalid delivery point IDs");
    const data = await this.post<Record<string, unknown>>("/v1/delivery-point/info", { delivery_point_ids: ids });
    if (!Array.isArray(data.delivery_points)) throw new OzonDeliveryError("Invalid delivery-point info response", 502);
    return data.delivery_points as DeliveryPoint[];
  }

  checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
    return this.post<CheckoutResponse>("/v1/order/checkout", request);
  }

  createOrder(request: CreateOrderRequest, idempotencyKey: string): Promise<CreateOrderResponse> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      throw new Error("Ozon idempotency key must be a UUID v4");
    }
    return this.post<CreateOrderResponse>("/v1/order/create", request, idempotencyKey);
  }

  async cancelPosting(postingNumber: string): Promise<void> {
    if (!postingNumber.trim()) throw new Error("Invalid Ozon posting cancellation request");
    const data = await this.post<Record<string, unknown>>("/v1/posting/cancel", {
      posting_number: postingNumber.trim(),
    });
    if (data.result === false) {
      throw new OzonDeliveryError("Ozon rejected posting cancellation", 409);
    }
  }
}

let sharedClient: OzonDeliveryClient | null = null;

/** Reuses the short-lived OAuth token across server requests in one process. */
export function getOzonDeliveryClient(): OzonDeliveryClient {
  sharedClient ??= new OzonDeliveryClient();
  return sharedClient;
}
