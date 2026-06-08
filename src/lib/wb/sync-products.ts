import type { Prisma, PrismaClient } from "@prisma/client";
import { WbSyncMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  shouldStopWbCardPagination,
  type OzonCatalogSyncItem,
  WbClient,
  type WbCardsPageResult,
} from "@/lib/wb/client";
import {
  collectPhotoUrls,
  mapWbCardToProductData,
  parseWbCardNmId,
  type WbProductMapped,
  type WbSizePriceInfo,
  validateWbProductPayload,
} from "@/lib/wb/map-card-to-product";

/** Separate rows so a full sync never overwrites the incremental pagination cursor. */
export const WB_SYNC_STATE_KEY_INCREMENTAL = "wb_sync_incremental" as const;
export const WB_SYNC_STATE_KEY_FULL = "wb_sync_full" as const;
/** Older single-row cursor (`runWbProductSync` used one key); still read for incremental handoff. */
const WB_SYNC_STATE_KEY_LEGACY = "default" as const;

const PAGE_LIMIT = 100;

function wbSyncStateKey(mode: "incremental" | "full"): string {
  return mode === "full"
    ? WB_SYNC_STATE_KEY_FULL
    : WB_SYNC_STATE_KEY_INCREMENTAL;
}

/** nmID from the raw WB card payload (before mapping); matches {@link mapWbCardToProductData}. */
function rawNmIdFromCard(card: unknown): number | null {
  if (card == null || typeof card !== "object" || !("nmID" in card)) {
    return null;
  }
  return parseWbCardNmId((card as { nmID: unknown }).nmID);
}

function rawChrtIdsFromCard(card: unknown): number[] {
  if (card == null || typeof card !== "object") return [];
  const sizes = (card as { sizes?: unknown }).sizes;
  if (!Array.isArray(sizes)) return [];
  const out = new Set<number>();
  for (const row of sizes) {
    if (row == null || typeof row !== "object") continue;
    const raw = (row as { chrtID?: unknown; chrtId?: unknown }).chrtID ??
      (row as { chrtId?: unknown }).chrtId;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : null;
    if (n != null && Number.isInteger(n) && n > 0) {
      out.add(n);
    }
  }
  return [...out];
}
/** Capped list sizes in `SyncResult` to keep payloads small. */
export const SYNC_RESULT_MAX_NM_IDS = 200;

/**
 * We persist the WB pagination cursor to `WbSyncState` only after a page is fully
 * committed without errors. If any card in the page errors, we do not advance
 * the cursor: the same page will be retried on the next run, avoiding a gap
 * that would leave some updates never applied. (Idempotent `wbNmId` upserts
 * make re-processing safe.)
 */
export type SyncResult = {
  added: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: number;
  durationMs: number;
  addedNmIds?: number[];
  updatedNmIds?: number[];
  deactivatedNmIds?: number[];
  errorSamples?: { nmId: number | null; message: string }[];
  /**
   * When full `reconcile` was skipped to avoid mass-deactivation (empty API catalog,
   * no parseable nmIDs on cards, or similar).
   */
  reconcileSkippedReason?: string;
  ozonCatalogSync?: {
    enabled: boolean;
    synced: number;
    skipped: number;
    error?: string;
  };
};

export type RunWbProductSyncOptions = {
  mode: "incremental" | "full";
  signal?: AbortSignal;
  /**
   * Override for tests (defaults to a real {@link WbClient} and shared Prisma).
   * Production callers use env-based token in the client.
   */
  client?: Pick<WbClient, "fetchCardsPage"> & {
    /** Если не передан мок-тестами, цены только из карточки Content (часто 1 ₽). */
    fetchGoodsPricesByNmList?: WbClient["fetchGoodsPricesByNmList"];
    /** Остатки по chrtId (суммарно по складам). */
    fetchStocksByChrtIds?: WbClient["fetchStocksByChrtIds"];
    /** Загрузка/обновление карточек в Ozon каталоге. */
    syncProductsToOzonCatalog?: WbClient["syncProductsToOzonCatalog"];
  };
  db?: PrismaClient;
  /**
   * In `full` mode, deactivate WB-linked products whose nmID was not in the
   * run (default: true). Set `false` in isolated tests to avoid mutating
   * unrelated `Product` rows on a shared dev database.
   */
  reconcile?: boolean;
};

function pushCapped(
  list: number[] | undefined,
  value: number,
  cap: number
): number[] {
  const next = list ?? [];
  if (next.length < cap) next.push(value);
  return next;
}

function sameInstant(
  a: Date | null | undefined,
  b: Date | null | undefined
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.getTime() === b.getTime();
}

function hasLegacyWbMentions(existing: {
  breadcrumbs: string;
  pickupAvailability: string;
  deliveryAvailability: string;
  returnDetails: string;
  characteristics: { key: string }[];
}): boolean {
  const texts = [
    existing.breadcrumbs,
    existing.pickupAvailability,
    existing.deliveryAvailability,
    existing.returnDetails,
    ...existing.characteristics.map((c) => c.key),
  ];
  return texts.some((t) =>
    /(Wildberries|\(WB\)|Артикул \(WB\)|Размеры \(WB\)|Габариты \(WB)/i.test(t)
  );
}

/**
 * If WB card time matches DB and the row is still active, skip a heavy update.
 * Stale or inactive rows must be refreshed (reactivation, fixes).
 */
function isMappedUnchanged(
  existing: {
    wbCardUpdatedAt: Date | null;
    isActive: boolean;
    breadcrumbs: string;
    pickupAvailability: string;
    deliveryAvailability: string;
    returnDetails: string;
    characteristics: { key: string }[];
  },
  mapped: WbProductMapped
): boolean {
  if (!existing.isActive) return false;
  if (hasLegacyWbMentions(existing)) return false;
  return sameInstant(existing.wbCardUpdatedAt, mapped.wbCardUpdatedAt);
}

function toProductUpdate(
  mapped: WbProductMapped
): Prisma.ProductUpdateInput {
  const p = mapped.prismaCreate;
  return {
    name: p.name,
    breadcrumbs: p.breadcrumbs,
    images: p.images,
    price: p.price,
    oldPrice: p.oldPrice,
    discountPercent: p.discountPercent,
    currency: p.currency,
    favorite: p.favorite,
    pickupAvailability: p.pickupAvailability,
    deliveryAvailability: p.deliveryAvailability,
    returnDays: p.returnDays,
    returnDetails: p.returnDetails,
    description: p.description,
    videoUrl: p.videoUrl,
    categories: p.categories,
    ageGroups: p.ageGroups,
    wbCardUpdatedAt: p.wbCardUpdatedAt,
    isActive: true,
  };
}

type MutableCounts = {
  added: number;
  updated: number;
  unchanged: number;
  errors: number;
  addedNmIds: number[] | undefined;
  updatedNmIds: number[] | undefined;
  errorSamples: { nmId: number | null; message: string }[] | undefined;
};

function logPageSummary(
  mode: "incremental" | "full",
  pageIndex: number,
  cardCount: number,
  stop: boolean
): void {
  console.debug(
    JSON.stringify({
      scope: "wb",
      event: "wb_sync_page",
      mode,
      pageIndex,
      cardCount,
      lastPage: stop,
    })
  );
}

/** INFO-level run summary (counts, duration). Never include secrets. */
function logWbSyncInfoSummary(payload: Record<string, unknown>): void {
  console.info(
    JSON.stringify({
      level: "INFO",
      scope: "wb",
      event: "wb_sync_done",
      ...payload,
    })
  );
}

function logWbSyncError(payload: Record<string, unknown>): void {
  console.error(JSON.stringify({ scope: "wb", ...payload }));
}

function cardHasPhoto(card: unknown): boolean {
  if (card == null || typeof card !== "object") {
    return false;
  }
  const o = card as { photos?: unknown; media?: unknown };
  const photos = o.photos != null ? o.photos : o.media;
  return collectPhotoUrls(photos).length > 0;
}

function cardHasName(card: unknown): boolean {
  if (card == null || typeof card !== "object") {
    return false;
  }
  const o = card as { title?: unknown; name?: unknown };
  const title =
    typeof o.title === "string" ? o.title.trim() : "";
  const name =
    typeof o.name === "string" ? o.name.trim() : "";
  return title.length > 0 || name.length > 0;
}

async function deleteWbProductByNmId(
  db: PrismaClient,
  nmId: number | null | undefined
): Promise<void> {
  if (nmId == null || !Number.isInteger(nmId) || nmId <= 0) {
    return;
  }
  await db.product.deleteMany({
    where: { wbNmId: nmId },
  });
}

function hasUsableImageFromStoredJson(imagesJson: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(imagesJson);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return false;
  }
  for (const v of parsed) {
    if (typeof v !== "string") continue;
    const url = v.trim();
    if (!url) continue;
    if (url.startsWith("data:image/svg+xml;utf8,")) continue;
    return true;
  }
  return false;
}

async function purgeInvalidWbProductsFromDb(
  db: PrismaClient
): Promise<number> {
  const rows = await db.product.findMany({
    where: { wbNmId: { not: null } },
    select: { id: true, name: true, images: true },
  });
  const invalidIds: string[] = [];
  for (const row of rows) {
    const hasName = row.name.trim().length > 0;
    const hasPhoto = hasUsableImageFromStoredJson(row.images);
    if (!hasName || !hasPhoto) {
      invalidIds.push(row.id);
    }
  }
  if (invalidIds.length === 0) {
    return 0;
  }
  const r = await db.product.deleteMany({
    where: { id: { in: invalidIds } },
  });
  return r.count;
}

async function persistCursor(
  db: PrismaClient,
  stateKey: string,
  mode: WbSyncMode,
  next: { updatedAt: string; nmID: number }
): Promise<void> {
  await db.wbSyncState.upsert({
    where: { key: stateKey },
    create: {
      key: stateKey,
      mode,
      cursorUpdatedAt: next.updatedAt,
      cursorNmId: next.nmID,
    },
    update: {
      mode,
      cursorUpdatedAt: next.updatedAt,
      cursorNmId: next.nmID,
    },
  });
}

async function upsertOneCard(
  db: PrismaClient,
  card: unknown,
  cap: number,
  counts: MutableCounts,
  discountsPrice: WbSizePriceInfo | undefined,
  stockAmount?: number
): Promise<WbProductMapped | null> {
  const mapped = mapWbCardToProductData(card, {
    discountsPrice,
    stockAmount,
  });
  if (!mapped) {
    counts.errors += 1;
    counts.errorSamples = counts.errorSamples ?? [];
    if (counts.errorSamples.length < cap) {
      counts.errorSamples.push({
        nmId: null,
        message: "mapWbCardToProductData returned null",
      });
    }
    return null;
  }

  const v = validateWbProductPayload(mapped.createRequest);
  if (v.length > 0) {
    counts.errors += 1;
    counts.errorSamples = counts.errorSamples ?? [];
    if (counts.errorSamples.length < cap) {
      counts.errorSamples.push({
        nmId: mapped.wbNmId,
        message: v.join("; "),
      });
    }
    return null;
  }

  const existing = await db.product.findUnique({
    where: { wbNmId: mapped.wbNmId },
    select: {
      id: true,
      wbCardUpdatedAt: true,
      isActive: true,
      breadcrumbs: true,
      pickupAvailability: true,
      deliveryAvailability: true,
      returnDetails: true,
      characteristics: { select: { key: true } },
    },
  });

  if (existing) {
    if (isMappedUnchanged(existing, mapped)) {
      counts.unchanged += 1;
      return mapped;
    }

    await db.$transaction(async (tx) => {
      await tx.productCharacteristic.deleteMany({
        where: { productId: existing.id },
      });
      const chars = mapped.createRequest.characteristics.map((c) => ({
        productId: existing.id,
        key: c.key,
        value: c.value,
      }));
      await tx.product.update({
        where: { id: existing.id },
        data: toProductUpdate(mapped),
      });
      if (chars.length > 0) {
        await tx.productCharacteristic.createMany({ data: chars });
      }
    });
    counts.updated += 1;
    counts.updatedNmIds = pushCapped(
      counts.updatedNmIds,
      mapped.wbNmId,
      SYNC_RESULT_MAX_NM_IDS
    );
  } else {
    await db.product.create({ data: mapped.prismaCreate });
    counts.added += 1;
    counts.addedNmIds = pushCapped(
      counts.addedNmIds,
      mapped.wbNmId,
      SYNC_RESULT_MAX_NM_IDS
    );
  }
  return mapped;
}

function toOzonCatalogSyncItem(mapped: WbProductMapped): OzonCatalogSyncItem {
  const imageList = mapped.createRequest.images.filter((img) => {
    const t = img.trim();
    return t.length > 0 && !t.startsWith("data:image/svg+xml;utf8,");
  });
  return {
    offerId: `wb-${String(mapped.wbNmId)}`,
    name: mapped.createRequest.name,
    description: mapped.createRequest.description,
    priceRub: Math.max(1, Math.round(mapped.createRequest.price)),
    oldPriceRub:
      mapped.createRequest.oldPrice != null
        ? Math.max(1, Math.round(mapped.createRequest.oldPrice))
        : null,
    images: imageList,
  };
}

/**
 * `wbNmId` not null, not in `seen` → `isActive: false` in batches.
 * Does not change rows with `wbNmId == null` (manual catalog).
 */
export async function deactivateWbProductsNotInSet(
  db: PrismaClient,
  seen: Set<number>
): Promise<{ count: number; ids: string[]; nmIds: number[] }> {
  const withWb = await db.product.findMany({
    where: { wbNmId: { not: null } },
    select: { id: true, wbNmId: true },
  });
  const toOff = withWb.filter(
    (p): p is { id: string; wbNmId: number } =>
      p.wbNmId != null && !seen.has(p.wbNmId)
  );
  if (toOff.length === 0) {
    return { count: 0, ids: [], nmIds: [] };
  }
  const BATCH = 100;
  let count = 0;
  for (let i = 0; i < toOff.length; i += BATCH) {
    const chunk = toOff.slice(i, i + BATCH);
    const r = await db.product.updateMany({
      where: { id: { in: chunk.map((c) => c.id) } },
      data: { isActive: false },
    });
    count += r.count;
  }
  return {
    count,
    ids: toOff.map((p) => p.id),
    nmIds: toOff.map((p) => p.wbNmId),
  };
}

/**
 * Core Wildberries product sync: paginated card fetch, `wbNmId` upsert,
 * incremental cursor persistence, and optional full reconciliation (deactivate
 * removed WB offers).
 */
export async function runWbProductSync(
  options: RunWbProductSyncOptions
): Promise<SyncResult> {
  const t0 = Date.now();
  const db = options.db ?? prisma;
  const client = options.client ?? new WbClient();
  const mode = options.mode;
  const cap = SYNC_RESULT_MAX_NM_IDS;
  const prismaMode =
    mode === "full" ? WbSyncMode.full : WbSyncMode.incremental;
  const reconcile = options.reconcile !== false;
  const stateKey = wbSyncStateKey(mode);
  const seenNmIds: Set<number> | null = mode === "full" ? new Set() : null;
  let totalCardsFromApi = 0;
  const cachedPriceByNm = new Map<number, WbSizePriceInfo>();
  const ozonSyncItemsByNm = new Map<number, OzonCatalogSyncItem>();

  const counts: MutableCounts = {
    added: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    addedNmIds: undefined,
    updatedNmIds: undefined,
    errorSamples: undefined,
  };

  let lastError: string | undefined;
  let cursorForRequest: { updatedAt: string; nmID: number } | undefined;

  if (mode === "incremental") {
    let st = await db.wbSyncState.findUnique({
      where: { key: WB_SYNC_STATE_KEY_INCREMENTAL },
    });
    if (!(st?.cursorUpdatedAt && st.cursorNmId != null)) {
      st = await db.wbSyncState.findUnique({
        where: { key: WB_SYNC_STATE_KEY_LEGACY },
      });
    }
    if (st?.cursorUpdatedAt && st.cursorNmId != null) {
      cursorForRequest = {
        updatedAt: st.cursorUpdatedAt,
        nmID: st.cursorNmId,
      };
    }
  }
  // full: start with empty cursor (no previous boundary in request body)

  await db.wbSyncState.upsert({
    where: { key: stateKey },
    create: { key: stateKey, mode: prismaMode, lastRunAt: new Date() },
    update: { mode: prismaMode, lastRunAt: new Date(), lastError: null },
  });

  const throwIfAborted = (): void => {
    const s = options.signal;
    if (s?.aborted) {
      const err = new Error(s.reason as string);
      err.name = "AbortError";
      throw err;
    }
  };

  let pageIndex = 0;
  let pageErrorAbort = false;
  let skipPricesForRun = false;
  let skipStocksForRun = false;
  const cachedStockByChrt = new Map<number, number>();

  try {
    for (;;) {
      throwIfAborted();
      const page: WbCardsPageResult = await client.fetchCardsPage({
        limit: PAGE_LIMIT,
        cursor: cursorForRequest
          ? { updatedAt: cursorForRequest.updatedAt, nmID: cursorForRequest.nmID }
          : undefined,
      });

      const stop = shouldStopWbCardPagination(PAGE_LIMIT, page);
      logPageSummary(mode, pageIndex, page.cards.length, stop);
      pageIndex += 1;
      totalCardsFromApi += page.cards.length;

      const validCards: unknown[] = [];
      for (const card of page.cards) {
        const hasPhoto = cardHasPhoto(card);
        const hasName = cardHasName(card);
        if (!hasPhoto || !hasName) {
          await deleteWbProductByNmId(db, rawNmIdFromCard(card));
          continue;
        }
        validCards.push(card);
      }

      if (
        !skipPricesForRun &&
        typeof client.fetchGoodsPricesByNmList === "function"
      ) {
        const pageNmIds = validCards
          .map((c) => rawNmIdFromCard(c))
          .filter((n): n is number => n != null);
        const missingNmIds = pageNmIds.filter((nm) => !cachedPriceByNm.has(nm));
        if (missingNmIds.length > 0) {
          try {
            const fetchedPrices = await client.fetchGoodsPricesByNmList(missingNmIds);
            fetchedPrices.forEach((v, k) => cachedPriceByNm.set(k, v));
          } catch (e) {
            skipPricesForRun = true;
            const msg = e instanceof Error ? e.message : String(e);
            logWbSyncError({
              event: "wb_sync_prices_fetch_failed",
              message: msg,
            });
          }
        }
      }

      if (
        !skipStocksForRun &&
        typeof client.fetchStocksByChrtIds === "function"
      ) {
        const pageChrtIds = validCards.flatMap((c) => rawChrtIdsFromCard(c));
        const missingChrtIds = pageChrtIds.filter(
          (id) => !cachedStockByChrt.has(id)
        );
        if (missingChrtIds.length > 0) {
          try {
            const fetchedStocks = await client.fetchStocksByChrtIds(missingChrtIds);
            fetchedStocks.forEach((v, k) => cachedStockByChrt.set(k, v));
          } catch (e) {
            skipStocksForRun = true;
            const msg = e instanceof Error ? e.message : String(e);
            logWbSyncError({
              event: "wb_sync_stocks_fetch_failed",
              message: msg,
            });
          }
        }
      }

      const priceByNm = cachedPriceByNm;

      let pageErrors = 0;
      for (const card of validCards) {
        throwIfAborted();
        if (mode === "full" && seenNmIds) {
          const rawNm = rawNmIdFromCard(card);
          if (rawNm != null) seenNmIds.add(rawNm);
        }
        try {
          const beforeErr = counts.errors;
          const nm = rawNmIdFromCard(card);
          const dp =
            nm != null ? priceByNm.get(nm) : undefined;
          const chrtIds = rawChrtIdsFromCard(card);
          const stockAmount =
            chrtIds.length > 0
              ? chrtIds.reduce(
                  (sum, chrtId) => sum + (cachedStockByChrt.get(chrtId) ?? 0),
                  0
                )
              : undefined;
          const mapped = await upsertOneCard(
            db,
            card,
            cap,
            counts,
            dp,
            stockAmount
          );
          if (mapped) {
            ozonSyncItemsByNm.set(mapped.wbNmId, toOzonCatalogSyncItem(mapped));
          }
          if (counts.errors > beforeErr) pageErrors += 1;
        } catch (e) {
          pageErrors += 1;
          counts.errors += 1;
          const msg = e instanceof Error ? e.message : String(e);
          lastError = msg;
          const nm =
            mapWbCardToProductData(card)?.wbNmId ?? rawNmIdFromCard(card);
          logWbSyncError({
            event: "wb_sync_card_error",
            nmId: nm,
            message: msg,
          });
          counts.errorSamples = counts.errorSamples ?? [];
          if (counts.errorSamples.length < cap) {
            counts.errorSamples.push({ nmId: nm, message: msg });
          }
        }
      }

      // Partial page failure: do not advance the incremental cursor to avoid
      // skipping uncommitted (unprocessed) cards on the same API page.
      if (pageErrors > 0) {
        lastError = `Page ${String(pageIndex - 1)}: ${String(pageErrors)} card error(s); cursor not advanced`;
        await db.wbSyncState
          .update({
            where: { key: stateKey },
            data: { lastError },
          })
          .catch(() => undefined);
        pageErrorAbort = true;
        break;
      }
      if (page.nextCursor) {
        await persistCursor(db, stateKey, prismaMode, page.nextCursor);
        cursorForRequest = { ...page.nextCursor };
      }

      if (stop) break;
      if (!page.nextCursor) break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastError = msg;
    await db.wbSyncState
      .update({
        where: { key: stateKey },
        data: { lastError: lastError },
      })
      .catch(() => undefined);
    const durationMs = Date.now() - t0;
    logWbSyncError({
      event: "wb_sync_run_error",
      mode,
      message: msg,
      durationMs,
    });
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw e;
  }

  let deactivated = 0;
  let deactivatedNmIds: number[] | undefined;
  let reconcileSkippedReason: string | undefined;
  let purgedInvalid = 0;
  let ozonCatalogSync: SyncResult["ozonCatalogSync"];

  // Full reconciliation: only if every fetched page was fully committed without
  // card errors; otherwise the collected nm set may be unsafe for deactivations.
  //
  // If the API returned no cards, or we never recorded a nmID from the payload
  // (`seen` empty), running deactivate would mark the entire WB-linked catalog
  // inactive — skip instead (broken/empty API or stripped nmIDs).
  if (mode === "full" && reconcile && seenNmIds && !pageErrorAbort) {
    if (totalCardsFromApi === 0 || seenNmIds.size === 0) {
      reconcileSkippedReason =
        totalCardsFromApi === 0
          ? "Full reconcile skipped: Wildberries API returned no cards across all pages."
          : "Full reconcile skipped: no nmID values on API cards; refusing mass deactivation.";
    } else {
      const de = await deactivateWbProductsNotInSet(db, seenNmIds);
      deactivated = de.count;
      if (de.nmIds.length > 0) {
        deactivatedNmIds = de.nmIds.slice(0, SYNC_RESULT_MAX_NM_IDS);
      }
    }
  }

  if (!pageErrorAbort) {
    await db.wbSyncState
      .update({
        where: { key: stateKey },
        data: { lastSuccessAt: new Date(), lastError: null },
      })
      .catch(() => undefined);
  }
  if (
    typeof client.syncProductsToOzonCatalog === "function" &&
    ozonSyncItemsByNm.size > 0
  ) {
    try {
      ozonCatalogSync = await client.syncProductsToOzonCatalog([
        ...ozonSyncItemsByNm.values(),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ozonCatalogSync = {
        enabled: true,
        synced: 0,
        skipped: ozonSyncItemsByNm.size,
        error: msg,
      };
      logWbSyncError({
        event: "ozon_catalog_sync_failed",
        message: msg,
      });
    }
  }
  purgedInvalid = await purgeInvalidWbProductsFromDb(db);

  const durationMs = Date.now() - t0;
  logWbSyncInfoSummary({
    mode,
    added: counts.added,
    updated: counts.updated,
    unchanged: counts.unchanged,
    errors: counts.errors,
    deactivated,
    purgedInvalid,
    durationMs,
    pageErrorAbort,
    reconcileSkippedReason,
    ozonCatalogSync,
  });

  return {
    added: counts.added,
    updated: counts.updated,
    deactivated,
    unchanged: counts.unchanged,
    errors: counts.errors,
    durationMs,
    addedNmIds: counts.addedNmIds,
    updatedNmIds: counts.updatedNmIds,
    deactivatedNmIds,
    errorSamples: counts.errorSamples,
    reconcileSkippedReason,
    ozonCatalogSync,
  };
}
