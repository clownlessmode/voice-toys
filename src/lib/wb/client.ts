import {
  WB_CONTENT_API_BASE_URL,
  WB_COMMON_API_BASE_URL,
  WB_DISCOUNTS_API_BASE_URL,
  WB_MARKETPLACE_API_BASE_URL,
  getOzonApiKey,
  getOzonClientId,
  isOzonConfigured,
  getWbContentToken,
} from "./config";
import {
  priceInfoFromDiscountsListGood,
  type WbSizePriceInfo,
} from "./map-card-to-product";
import {
  type TokenBucketRateLimiter,
  createDefaultWbRateLimiter,
} from "./rate-limiter";

const CARDS_PATH = "/content/v2/get/cards/list" as const;
const PING_PATH = "/ping" as const;
const GOODS_FILTER_PRICES_PATH = "/api/v2/list/goods/filter" as const;
const WAREHOUSES_PATH = "/api/v3/warehouses" as const;
const STOCKS_PATH_PREFIX = "/api/v3/stocks" as const;
const OZON_SELLER_API_BASE_URL = "https://api-seller.ozon.ru" as const;

const globalRateLimiter: TokenBucketRateLimiter = createDefaultWbRateLimiter();
let requestChain: Promise<unknown> = Promise.resolve();

function logWb(
  level: "warn" | "error",
  event: string,
  fields: Record<string, unknown>
): void {
  const line = JSON.stringify({ scope: "wb", event, ...fields });
  if (level === "error") {
    console.error(line);
  } else {
    console.warn(line);
  }
}

/**
 * All WB API calls share one queue + rate limiter (concurrent callers serialize).
 */
function enqueueWbRequest<T>(fn: () => Promise<T>): Promise<T> {
  const p = requestChain.then(() =>
    (async () => {
      await globalRateLimiter.acquire();
      return fn();
    })()
  ) as Promise<T>;
  requestChain = p.then(
    () => undefined,
    () => undefined
  );
  return p;
}

const MAX_429_RETRIES = 5;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 60_000;
const JITTER_MS = 150;

function parseRetryAfterSeconds(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    return Math.min(MAX_BACKOFF_MS / 1000, Math.max(0, parseInt(trimmed, 10)));
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const sec = (dateMs - Date.now()) / 1000;
    return sec > 0
      ? Math.min(MAX_BACKOFF_MS / 1000, sec)
      : 0;
  }
  return null;
}

function backoffMs(attempt: number): number {
  const exp = Math.min(
    MAX_BACKOFF_MS,
    BASE_BACKOFF_MS * Math.pow(2, attempt)
  );
  return exp + Math.floor(Math.random() * JITTER_MS);
}

function bodySnippet(text: string, max = 500): string {
  const t = text.length > max ? `${text.slice(0, max)}…` : text;
  return t.replace(/[\r\n]+/g, " ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class WbClientError extends Error {
  readonly status: number;
  readonly bodySnippet?: string;
  readonly operation: string;

  constructor(
    message: string,
    options: {
      status: number;
      operation: string;
      bodySnippet?: string;
    }
  ) {
    super(message);
    this.name = "WbClientError";
    this.status = options.status;
    this.operation = options.operation;
    this.bodySnippet = options.bodySnippet;
  }
}

export type WbPingResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  /** Truncated body for diagnostics; avoid logging in untrusted envs. */
  bodyTextPreview?: string;
};

export type WbCardsPageCursor = {
  updatedAt: string;
  nmID: number;
  /**
   * Only set when the API included `total` in the cursor. When omitted, pagination
   * must use page size vs the request limit (see {@link shouldStopWbCardPagination}).
   */
  total?: number;
};

export type WbCardsPageResult = {
  status: number;
  cards: unknown[];
  /** Parsed cursor; null if missing or invalid. */
  cursor: WbCardsPageCursor | null;
  /**
   * Values to send as `cursor` on the next request (from response), if present.
   */
  nextCursor: { updatedAt: string; nmID: number } | null;
  raw: unknown;
};

type FetchJsonContext = {
  operation: string;
  cursorForLog?: { nmID?: number; updatedAt?: string };
  max429Retries?: number;
};

/**
 * `fetch` with 429 handling: Retry-After, then exponential backoff + jitter; capped attempts.
 */
async function fetchWith429Retry(
  input: string,
  init: RequestInit,
  ctx: FetchJsonContext
): Promise<Response> {
  const maxRetries = Math.max(1, Math.floor(ctx.max429Retries ?? MAX_429_RETRIES));
  let lastStatus = 0;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(input, init);
    lastStatus = res.status;
    if (res.status !== 429) {
      return res;
    }
    if (attempt === maxRetries - 1) {
      break;
    }
    const header = res.headers.get("Retry-After");
    const fromHeader = parseRetryAfterSeconds(header);
    const fromBackoff = backoffMs(attempt) / 1000;
    const waitSec =
      fromHeader != null
        ? fromHeader
        : Math.min(MAX_BACKOFF_MS / 1000, fromBackoff);
    const waitMs = Math.max(0, Math.ceil(waitSec * 1000));
    logWb("warn", "wb_429_backoff", {
      operation: ctx.operation,
      attempt: attempt + 1,
      maxRetries,
      retryAfterHeader: header ?? null,
      waitMs,
      nmID: ctx.cursorForLog?.nmID,
    });
    const clone = res.clone();
    void clone
      .text()
      .then((t) => {
        if (t) {
          logWb("warn", "wb_429_response_body", {
            operation: ctx.operation,
            bodySnippet: bodySnippet(t, 200),
            nmID: ctx.cursorForLog?.nmID,
          });
        }
      })
      .catch(() => undefined);
    await sleep(Math.min(waitMs, MAX_BACKOFF_MS));
  }
  return new Response(
    `Too Many Requests (retries exceeded: ${lastStatus})`,
    { status: 429, statusText: "Too Many Requests" }
  );
}

function parseAsRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseGoodsFilterPricesMap(json: unknown): Map<number, WbSizePriceInfo> {
  const out = new Map<number, WbSizePriceInfo>();
  const root = parseAsRecord(json);
  if (!root) return out;
  if (root.error === true) {
    logWb("warn", "wb_goods_prices_error_body", {
      errorText:
        typeof root.errorText === "string" ? root.errorText.slice(0, 200) : null,
    });
    return out;
  }
  const data = parseAsRecord(root.data);
  const listGoods = data?.listGoods;
  if (!Array.isArray(listGoods)) return out;
  for (const row of listGoods) {
    const parsed = priceInfoFromDiscountsListGood(row);
    if (parsed) out.set(parsed.nmId, parsed.price);
  }
  return out;
}

function parseString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  return value;
}

/**
 * One page of `POST /content/v2/get/cards/list` response, safe for extra fields.
 */
function parseCardsPageJson(json: unknown): Omit<WbCardsPageResult, "status"> {
  const root = parseAsRecord(json);
  const data =
    root && "data" in root ? parseAsRecord(root.data) : null;
  const fromDataOrRoot = (data ?? root) as Record<string, unknown> | null;
  let rawCards: unknown;
  if (fromDataOrRoot && "cards" in fromDataOrRoot) {
    rawCards = fromDataOrRoot.cards;
  } else if (root && "cards" in root) {
    rawCards = root.cards;
  }
  const cards: unknown[] = Array.isArray(rawCards) ? rawCards : [];
  if (rawCards !== undefined && !Array.isArray(rawCards)) {
    logWb("warn", "wb_cards_parse", {
      message: "cards is not an array; using []",
    });
  }

  const cursorVal =
    (fromDataOrRoot && "cursor" in fromDataOrRoot
      ? fromDataOrRoot.cursor
      : undefined) ??
    (root && "cursor" in root ? root.cursor : undefined);
  const c = parseAsRecord(cursorVal);
  let cursor: WbCardsPageCursor | null = null;
  let nextCursor: { updatedAt: string; nmID: number } | null = null;
  if (c) {
    const updatedAt = parseString(c.updatedAt);
    const nmID = parseFiniteNumber(c.nmID);
    if (updatedAt && nmID !== null) {
      const parsed: WbCardsPageCursor = { updatedAt, nmID };
      if ("total" in c) {
        const t = parseFiniteNumber(c.total);
        if (t !== null) {
          parsed.total = t;
        }
      }
      cursor = parsed;
      nextCursor = { updatedAt, nmID };
    } else if (c.updatedAt != null || c.nmID != null) {
      logWb("warn", "wb_cards_parse", {
        message: "cursor.updatedAt or cursor.nmID missing/invalid",
      });
    }
  }
  return { cards, cursor, nextCursor, raw: json };
}

/**
 * Per product spec: last page when `response.cursor.total` (if present) is less than requested limit;
 * if `total` is absent, use page size vs limit.
 */
export function shouldStopWbCardPagination(
  requestLimit: number,
  page: Pick<WbCardsPageResult, "cards" | "cursor">
): boolean {
  const total = page.cursor?.total;
  if (total !== undefined) {
    return total < requestLimit;
  }
  return page.cards.length < requestLimit;
}

type WbGoodsPricesPageResult = {
  items: unknown[];
};
type WbWarehouse = {
  id: number;
  isDeleting?: boolean;
  isProcessing?: boolean;
};

export type WbClientOptions = {
  getToken?: () => string;
  getOzonClientId?: () => string;
  getOzonApiKey?: () => string;
};

export type OzonCatalogSyncItem = {
  offerId: string;
  name: string;
  description: string;
  priceRub: number;
  oldPriceRub?: number | null;
  images: string[];
};

export class WbClient {
  private readonly getToken: () => string;
  private readonly getOzonClientId: (() => string) | null;
  private readonly getOzonApiKey: (() => string) | null;

  constructor(options: WbClientOptions = {}) {
    this.getToken = options.getToken ?? getWbContentToken;
    this.getOzonClientId =
      options.getOzonClientId ?? (isOzonConfigured() ? getOzonClientId : null);
    this.getOzonApiKey =
      options.getOzonApiKey ?? (isOzonConfigured() ? getOzonApiKey : null);
  }

  /**
   * Connectivity check against Common API. Does not log the token.
   */
  async ping(): Promise<WbPingResult> {
    return enqueueWbRequest(async () => {
      const token = this.getToken();
      const url = `${WB_COMMON_API_BASE_URL}${PING_PATH}`;
      const t0 = Date.now();
      try {
        const res = await fetchWith429Retry(
          url,
          {
            method: "GET",
            headers: { Authorization: token },
            cache: "no-store",
          },
          { operation: "ping" }
        );
        const durationMs = Date.now() - t0;
        const text = await res.text();
        if (!res.ok) {
          logWb("error", "wb_ping_http_error", {
            status: res.status,
            durationMs,
            bodySnippet: bodySnippet(text, 200),
          });
        }
        return {
          ok: res.ok,
          status: res.status,
          durationMs,
          bodyTextPreview: text.length ? bodySnippet(text, 200) : undefined,
        };
      } catch (e) {
        const durationMs = Date.now() - t0;
        logWb("error", "wb_ping_failed", {
          durationMs,
          error: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    });
  }

  /**
   * Single page of product cards. `limit` is clamped to 1..100.
   * Uses ascending sort, `withPhoto: 1` (only cards with photos), and optional cursor.
   */
  async fetchCardsPage(params: {
    limit: number;
    cursor?: { updatedAt?: string; nmID?: number };
  }): Promise<WbCardsPageResult> {
    return enqueueWbRequest(async () => {
      const token = this.getToken();
      const limit = Math.min(100, Math.max(1, Math.floor(params.limit)));
      const body = {
        settings: {
          sort: { ascending: true },
          cursor: {
            limit,
            ...(params.cursor?.updatedAt != null &&
            params.cursor.updatedAt !== ""
              ? { updatedAt: params.cursor.updatedAt }
              : {}),
            ...(params.cursor?.nmID !== undefined
              ? { nmID: params.cursor.nmID }
              : {}),
          },
          filter: { withPhoto: 1 },
        },
      };
      const url = `${WB_CONTENT_API_BASE_URL}${CARDS_PATH}`;
      const res = await fetchWith429Retry(
        url,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
        },
        {
          operation: "fetch_cards_list",
          cursorForLog: { nmID: params.cursor?.nmID },
        }
      );
      const text = await res.text();
      if (!res.ok) {
        const msg =
          res.status === 429
            ? "Cards list rate-limited (429) after retries"
            : `Cards list failed: HTTP ${res.status}`;
        logWb("error", "wb_cards_http_error", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          nmID: params.cursor?.nmID,
        });
        throw new WbClientError(msg, {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "fetchCardsPage",
        });
      }
      let json: unknown;
      try {
        json = text ? (JSON.parse(text) as unknown) : {};
      } catch {
        logWb("error", "wb_cards_not_json", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          nmID: params.cursor?.nmID,
        });
        throw new WbClientError("Invalid JSON in cards response", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "fetchCardsPage",
        });
      }
      const parsed = parseCardsPageJson(json);
      return { status: res.status, ...parsed };
    });
  }

  private async fetchGoodsPricesPage(
    limit: number,
    offset: number,
    filterNmID?: number
  ): Promise<WbGoodsPricesPageResult> {
    return enqueueWbRequest(async () => {
      const token = this.getToken();
      const l = Math.min(1000, Math.max(1, Math.floor(limit)));
      const o = Math.max(0, Math.floor(offset));
      const qs = new URLSearchParams(
        {
        limit: String(l),
        offset: String(o),
        } as Record<string, string>
      );
      if (
        filterNmID != null &&
        Number.isInteger(filterNmID) &&
        filterNmID > 0
      ) {
        qs.set("filterNmID", String(filterNmID));
      }
      const url = `${WB_DISCOUNTS_API_BASE_URL}${GOODS_FILTER_PRICES_PATH}?${qs.toString()}`;
      const res = await fetchWith429Retry(
        url,
        {
          method: "GET",
          headers: { Authorization: token },
          cache: "no-store",
        },
        {
          operation: "fetch_goods_prices_filter",
          // Цены и скидки легко упираются в лимиты: при 429 не "долбим" повторно.
          max429Retries: 1,
        }
      );
      const text = await res.text();
      if (!res.ok) {
        logWb("error", "wb_goods_prices_http_error", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          filterNmID: filterNmID ?? null,
          limit: l,
          offset: o,
        });
        throw new WbClientError(
          `Goods prices filter failed: HTTP ${res.status}`,
          {
            status: res.status,
            bodySnippet: bodySnippet(text),
            operation: "fetchGoodsPricesPage",
          }
        );
      }

      let json: unknown;
      try {
        json = text ? (JSON.parse(text) as unknown) : {};
      } catch {
        logWb("error", "wb_goods_prices_not_json", {
          bodySnippet: bodySnippet(text),
          filterNmID: filterNmID ?? null,
          limit: l,
          offset: o,
        });
        throw new WbClientError("Invalid JSON in goods prices response", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "fetchGoodsPricesPage",
        });
      }

      const root = parseAsRecord(json);
      const data = parseAsRecord(root?.data);
      const listGoods = data?.listGoods;
      return { items: Array.isArray(listGoods) ? listGoods : [] };
    });
  }

  private async fetchWarehouses(): Promise<WbWarehouse[]> {
    return enqueueWbRequest(async () => {
      const token = this.getToken();
      const url = `${WB_MARKETPLACE_API_BASE_URL}${WAREHOUSES_PATH}`;
      const res = await fetchWith429Retry(
        url,
        {
          method: "GET",
          headers: { Authorization: token },
          cache: "no-store",
        },
        { operation: "fetch_warehouses", max429Retries: 2 }
      );
      const text = await res.text();
      if (!res.ok) {
        logWb("error", "wb_warehouses_http_error", {
          status: res.status,
          bodySnippet: bodySnippet(text),
        });
        throw new WbClientError(`Warehouses failed: HTTP ${res.status}`, {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "fetchWarehouses",
        });
      }

      let json: unknown;
      try {
        json = text ? (JSON.parse(text) as unknown) : [];
      } catch {
        logWb("error", "wb_warehouses_not_json", {
          bodySnippet: bodySnippet(text),
        });
        throw new WbClientError("Invalid JSON in warehouses response", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "fetchWarehouses",
        });
      }

      if (!Array.isArray(json)) return [];
      const out: WbWarehouse[] = [];
      for (const row of json) {
        const o = parseAsRecord(row);
        if (!o) continue;
        const id = parseFiniteNumber(o.id);
        if (id == null || !Number.isInteger(id) || id <= 0) continue;
        out.push({
          id,
          isDeleting: o.isDeleting === true,
          isProcessing: o.isProcessing === true,
        });
      }
      return out;
    });
  }

  private async fetchStocksForWarehouse(
    warehouseId: number,
    chrtIds: number[]
  ): Promise<Map<number, number>> {
    return enqueueWbRequest(async () => {
      const token = this.getToken();
      const w = Math.floor(warehouseId);
      const ids = [
        ...new Set(chrtIds.filter((n) => Number.isInteger(n) && n > 0)),
      ];
      if (!Number.isInteger(w) || w <= 0 || ids.length === 0) {
        return new Map<number, number>();
      }
      const url = `${WB_MARKETPLACE_API_BASE_URL}${STOCKS_PATH_PREFIX}/${String(w)}`;
      const res = await fetchWith429Retry(
        url,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chrtIds: ids }),
          cache: "no-store",
        },
        {
          operation: "fetch_stocks_by_warehouse",
          max429Retries: 2,
        }
      );
      const text = await res.text();
      if (!res.ok) {
        logWb("error", "wb_stocks_http_error", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          warehouseId: w,
          chrtCount: ids.length,
        });
        throw new WbClientError(`Stocks failed: HTTP ${res.status}`, {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "fetchStocksForWarehouse",
        });
      }
      let json: unknown;
      try {
        json = text ? (JSON.parse(text) as unknown) : {};
      } catch {
        logWb("error", "wb_stocks_not_json", {
          bodySnippet: bodySnippet(text),
          warehouseId: w,
        });
        throw new WbClientError("Invalid JSON in stocks response", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "fetchStocksForWarehouse",
        });
      }
      const root = parseAsRecord(json);
      const stocks = root?.stocks;
      const out = new Map<number, number>();
      if (!Array.isArray(stocks)) return out;
      for (const row of stocks) {
        const o = parseAsRecord(row);
        if (!o) continue;
        const chrtId = parseFiniteNumber(o.chrtId);
        const amount = parseFiniteNumber(o.amount);
        if (
          chrtId == null ||
          amount == null ||
          !Number.isInteger(chrtId) ||
          chrtId <= 0
        ) {
          continue;
        }
        out.set(chrtId, Math.max(0, Math.floor(amount)));
      }
      return out;
    });
  }

  /**
   * Цены из «Цены и скидки»: `GET /api/v2/list/goods/filter?limit=...&offset=...`.
   * Загружает страницы каталога и возвращает цены только по запрошенным `nmID`.
   */
  async fetchGoodsPricesByNmList(
    nmIds: number[]
  ): Promise<Map<number, WbSizePriceInfo>> {
    const unique = [
      ...new Set(nmIds.filter((n) => Number.isInteger(n) && n > 0)),
    ];
    const out = new Map<number, WbSizePriceInfo>();
    if (unique.length === 0) return out;
    const wanted = new Set<number>(unique);

    const LIMIT = 1000;
    let offset = 0;

    for (;;) {
      const page = await this.fetchGoodsPricesPage(LIMIT, offset);
      if (page.items.length === 0) break;
      const parsed = parseGoodsFilterPricesMap({
        data: { listGoods: page.items },
      });
      parsed.forEach((price, nmId) => {
        if (wanted.has(nmId)) {
          out.set(nmId, price);
        }
      });
      if (out.size >= wanted.size) break;
      if (page.items.length < LIMIT) break;
      offset += LIMIT;
    }

    if (out.size < wanted.size && unique.length === 1) {
      const page = await this.fetchGoodsPricesPage(1000, 0, unique[0]);
      const parsed = parseGoodsFilterPricesMap({
        data: { listGoods: page.items },
      });
      parsed.forEach((price, nmId) => {
        if (wanted.has(nmId)) {
          out.set(nmId, price);
        }
      });
    }

    return out;
  }

  /**
   * Остатки по `chrtId` (сумма по всем активным складам продавца).
   */
  async fetchStocksByChrtIds(
    chrtIds: number[]
  ): Promise<Map<number, number>> {
    const unique = [
      ...new Set(chrtIds.filter((n) => Number.isInteger(n) && n > 0)),
    ];
    const out = new Map<number, number>();
    if (unique.length === 0) return out;

    const warehouses = await this.fetchWarehouses();
    const activeWarehouses = warehouses.filter((w) => !w.isDeleting);
    if (activeWarehouses.length === 0) {
      return out;
    }

    const CHUNK = 1000;
    for (const wh of activeWarehouses) {
      for (let i = 0; i < unique.length; i += CHUNK) {
        const chunk = unique.slice(i, i + CHUNK);
        const partial = await this.fetchStocksForWarehouse(wh.id, chunk);
        partial.forEach((amount, chrtId) => {
          out.set(chrtId, (out.get(chrtId) ?? 0) + amount);
        });
      }
    }
    return out;
  }

  async syncProductsToOzonCatalog(
    items: OzonCatalogSyncItem[]
  ): Promise<{ enabled: boolean; synced: number; skipped: number }> {
    if (!this.getOzonApiKey || !this.getOzonClientId) {
      logWb("warn", "ozon_catalog_sync_skipped", {
        reason: "missing_ozon_credentials",
      });
      return { enabled: false, synced: 0, skipped: items.length };
    }
    const normalized = items.filter(
      (i) =>
        i.offerId.trim().length > 0 &&
        i.name.trim().length > 0 &&
        Number.isFinite(i.priceRub) &&
        i.priceRub > 0
    );
    if (normalized.length === 0) {
      return { enabled: true, synced: 0, skipped: items.length };
    }

    const CHUNK = 100;
    let synced = 0;

    for (let i = 0; i < normalized.length; i += CHUNK) {
      const chunk = normalized.slice(i, i + CHUNK);
      const payload = {
        items: chunk.map((p) => ({
          offer_id: p.offerId,
          name: p.name,
          description: p.description,
          price: String(Math.max(1, Math.round(p.priceRub))),
          old_price:
            p.oldPriceRub != null && p.oldPriceRub > p.priceRub
              ? String(Math.round(p.oldPriceRub))
              : undefined,
          currency_code: "RUB",
          primary_image: p.images[0],
          images: p.images,
        })),
      };

      const res = await fetch(`${OZON_SELLER_API_BASE_URL}/v3/product/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Id": this.getOzonClientId(),
          "Api-Key": this.getOzonApiKey(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        logWb("error", "ozon_catalog_sync_http_error", {
          status: res.status,
          bodySnippet: bodySnippet(text),
          chunkSize: chunk.length,
        });
        throw new WbClientError(`Ozon product import failed: HTTP ${res.status}`, {
          status: res.status,
          bodySnippet: bodySnippet(text),
          operation: "syncProductsToOzonCatalog",
        });
      }
      synced += chunk.length;
    }

    return { enabled: true, synced, skipped: items.length - synced };
  }
}

/**
 * Walks all card pages using cursor from each response; stops per {@link shouldStopWbCardPagination}
 * and when the next cursor is missing.
 */
export async function* iterWbCardsByPage(
  client: WbClient,
  pageLimit: number = 100
): AsyncGenerator<WbCardsPageResult, void, undefined> {
  const limit = Math.min(100, Math.max(1, Math.floor(pageLimit)));
  let next: { updatedAt: string; nmID: number } | undefined;
  for (;;) {
    const page = await client.fetchCardsPage({
      limit,
      cursor: next
        ? { updatedAt: next.updatedAt, nmID: next.nmID }
        : undefined,
    });
    yield page;
    if (shouldStopWbCardPagination(limit, page)) {
      return;
    }
    if (!page.nextCursor) {
      logWb("warn", "wb_pagination_stopped", {
        message: "no next cursor from API",
      });
      return;
    }
    next = page.nextCursor;
  }
}

const defaultWbClient = new WbClient();

export { defaultWbClient as wb };

export function createWbClient(options?: WbClientOptions): WbClient {
  return new WbClient(options);
}
