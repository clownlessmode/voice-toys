import {
  getOzonApiKey,
  getOzonClientId,
  isOzonConfigured,
  OZON_SELLER_API_BASE_URL,
} from "@/lib/ozon/config";

export type OzonClientOptions = {
  getClientId?: () => string;
  getApiKey?: () => string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type OzonCatalogProduct = {
  product_id: number;
  offer_id: string;
  sku: number;
  has_fbo_stocks: boolean;
  has_fbs_stocks: boolean;
  archived: boolean;
};

export type OzonRequestErrorDetails = {
  status: number;
  bodySnippet: string;
  operation: string;
};

export class OzonClientError extends Error {
  readonly status: number;
  readonly bodySnippet: string;
  readonly operation: string;

  constructor(message: string, details: OzonRequestErrorDetails) {
    super(message);
    this.name = "OzonClientError";
    this.status = details.status;
    this.bodySnippet = details.bodySnippet;
    this.operation = details.operation;
  }
}

export type OzonDeliveryCheckResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  isPossible?: boolean;
  bodyTextPreview?: string;
};

function bodySnippet(text: string, max = 400): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** Normalize to Ozon format `7XXXXXXXXXX` (11 digits). */
export function normalizeOzonClientPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length >= 11) {
    digits = `7${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    digits = `7${digits}`;
  }
  if (!/^7\d{10}$/.test(digits)) {
    throw new Error(
      "Invalid phone for Ozon delivery check (expected 7XXXXXXXXXX)."
    );
  }
  return digits;
}

export class OzonClient {
  private readonly getClientId: (() => string) | null;
  private readonly getApiKey: (() => string) | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OzonClientOptions = {}) {
    this.getClientId =
      options.getClientId ?? (isOzonConfigured() ? getOzonClientId : null);
    this.getApiKey =
      options.getApiKey ?? (isOzonConfigured() ? getOzonApiKey : null);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  private authHeaders(): Record<string, string> {
    if (!this.getClientId || !this.getApiKey) {
      throw new Error(
        "Ozon API is not configured (OZON_CLIENT_ID and OZON_API_KEY)."
      );
    }
    return {
      "Client-Id": this.getClientId(),
      "Api-Key": this.getApiKey(),
      "Content-Type": "application/json",
    };
  }

  async request<T>(
    path: string,
    body: unknown,
    operation: string
  ): Promise<{ status: number; data: T; durationMs: number; rawText: string }> {
    const url = `${OZON_SELLER_API_BASE_URL}${path}`;
    const t0 = Date.now();
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const durationMs = Date.now() - t0;
    const rawText = await res.text();
    if (!res.ok) {
      throw new OzonClientError(`Ozon API ${operation} failed: HTTP ${res.status}`, {
        status: res.status,
        bodySnippet: bodySnippet(rawText),
        operation,
      });
    }
    let data: T;
    try {
      data = rawText ? (JSON.parse(rawText) as T) : ({} as T);
    } catch {
      throw new OzonClientError(`Ozon API ${operation} returned invalid JSON`, {
        status: res.status,
        bodySnippet: bodySnippet(rawText),
        operation,
      });
    }
    return { status: res.status, data, durationMs, rawText };
  }

  /** Read existing offers only. Never imports products or changes marketplace stock. */
  async listProducts(): Promise<OzonCatalogProduct[]> {
    const products = new Map<number, OzonCatalogProduct>();
    const cursors = new Set<string>();
    let lastId = "";
    for (let page = 0; page < 1000; page += 1) {
      const { data } = await this.request<{ result?: {
        items?: OzonCatalogProduct[]; total?: number; last_id?: string;
      } }>("/v3/product/list", {
        filter: { visibility: "ALL" }, limit: 100, last_id: lastId,
      }, "listProducts");
      const result = data?.result;
      if (!result || !Array.isArray(result.items) ||
          !Number.isSafeInteger(result.total) || result.total! < 0 ||
          result.items.some(item => !item || !Number.isSafeInteger(item.product_id) ||
            item.product_id <= 0 || typeof item.offer_id !== "string" ||
            !Number.isSafeInteger(item.sku) ||
            typeof item.archived !== "boolean" ||
            typeof item.has_fbo_stocks !== "boolean" || typeof item.has_fbs_stocks !== "boolean")) {
        throw new Error("Ozon returned an invalid catalog response");
      }
      for (const item of result.items) products.set(item.product_id, item);
      if (products.size >= result.total!) return [...products.values()];
      if (!result.items.length || !result.last_id || cursors.has(result.last_id)) {
        throw new Error("Ozon catalog is incomplete; comparison cancelled");
      }
      cursors.add(result.last_id);
      lastId = result.last_id;
    }
    throw new Error("Ozon catalog is incomplete; pagination limit exceeded");
  }

  /**
   * POST /v1/delivery/check — is Ozon delivery available for the buyer phone?
   */
  async checkDelivery(clientPhone: string): Promise<OzonDeliveryCheckResult> {
    const phone = normalizeOzonClientPhone(clientPhone);
    try {
      const { status, data, durationMs, rawText } = await this.request<{
        is_possible?: boolean;
      }>("/v1/delivery/check", { client_phone: phone }, "checkDelivery");
      if (typeof data?.is_possible !== "boolean") {
        throw new OzonClientError("Ozon returned an invalid delivery check response", {
          status: 502, bodySnippet: "Invalid delivery check response", operation: "checkDelivery",
        });
      }
      return {
        ok: true,
        status,
        durationMs,
        isPossible: data.is_possible,
        bodyTextPreview: rawText.length ? bodySnippet(rawText, 200) : undefined,
      };
    } catch (e) {
      if (e instanceof OzonClientError) {
        return {
          ok: false,
          status: e.status,
          durationMs: 0,
          bodyTextPreview: e.bodySnippet,
        };
      }
      throw e;
    }
  }
}
