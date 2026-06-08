import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import * as mapCard from "@/lib/wb/map-card-to-product";
import {
  deactivateWbProductsNotInSet,
  runWbProductSync,
  WB_SYNC_STATE_KEY_FULL,
  WB_SYNC_STATE_KEY_INCREMENTAL,
} from "@/lib/wb/sync-products";
import type { WbCardsPageResult } from "@/lib/wb/client";
import { WbClient } from "@/lib/wb/client";

const fixturePath = join(
  __dirname,
  "fixtures",
  "sample-wb-card.json"
);
const sampleCard: unknown = JSON.parse(
  readFileSync(fixturePath, "utf-8")
) as unknown;
const cardNm = (sampleCard as { nmID: number }).nmID;

function pageFromCards(
  cards: unknown[],
  next: { updatedAt: string; nmID: number },
  lastPage: boolean
): WbCardsPageResult {
  return {
    status: 200,
    cards,
    cursor: {
      updatedAt: next.updatedAt,
      nmID: next.nmID,
      total: lastPage ? 0 : 100,
    },
    nextCursor: next,
    raw: {},
  };
}

describe("runWbProductSync", () => {
  const orphanNm = 9_000_100;
  const manualName = "SYNC-TEST-MANUAL-NM-NULL";

  beforeEach(async () => {
    await prisma.product.deleteMany({
      where: { OR: [{ wbNmId: cardNm }, { wbNmId: orphanNm }, { name: manualName }] },
    });
    await prisma.wbSyncState.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("full: upserts from WB card, then second full run is mostly unchanged", async () => {
    const c = { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 1 };
    const page: WbCardsPageResult = pageFromCards([sampleCard], c, true);
    const client = { fetchCardsPage: vi.fn().mockResolvedValue(page) } as unknown as WbClient;

    const a = await runWbProductSync({
      mode: "full",
      client,
      db: prisma,
      reconcile: false,
    });
    expect(a.added).toBe(1);
    expect(a.unchanged).toBe(0);
    expect(a.errors).toBe(0);

    const b = await runWbProductSync({
      mode: "full",
      client,
      db: prisma,
      reconcile: false,
    });
    expect(b.added).toBe(0);
    expect(b.updated).toBe(0);
    expect(b.unchanged).toBe(1);
    expect(b.errors).toBe(0);
  }, 20_000);

  it("full: deactivates wb-linked product not in catalog; leaves wbNmId null active", async () => {
    await prisma.product.create({
      data: {
        name: "SYNC-TEST-ORPHAN",
        description: "x",
        price: 1,
        images: "[]",
        breadcrumbs: "[]",
        pickupAvailability: "x",
        deliveryAvailability: "x",
        returnDetails: "x",
        categories: "[]",
        ageGroups: "[]",
        isActive: true,
        wbNmId: orphanNm,
      },
    });
    await prisma.product.create({
      data: {
        name: manualName,
        description: "manual",
        price: 1,
        images: "[]",
        breadcrumbs: "[]",
        pickupAvailability: "x",
        deliveryAvailability: "x",
        returnDetails: "x",
        categories: "[]",
        ageGroups: "[]",
        isActive: true,
        wbNmId: null,
      },
    });

    const c = { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 1 };
    const page: WbCardsPageResult = pageFromCards([sampleCard], c, true);
    const client = { fetchCardsPage: vi.fn().mockResolvedValue(page) } as unknown as WbClient;

    const r = await runWbProductSync({
      mode: "full",
      client,
      db: prisma,
      reconcile: true,
    });
    expect(r.deactivated).toBeGreaterThanOrEqual(1);
    expect(r.deactivatedNmIds).toContain(orphanNm);

    const ghost = await prisma.product.findFirst({ where: { wbNmId: orphanNm } });
    expect(ghost?.isActive).toBe(false);

    const manual = await prisma.product.findFirst({ where: { name: manualName } });
    expect(manual?.isActive).toBe(true);
  }, 20_000);

  it("incremental: advances cursor on clean page; page error does not move cursor", async () => {
    const c = { updatedAt: "2025-12-12T00:00:00.000Z", nmID: 99 };
    const page: WbCardsPageResult = pageFromCards([sampleCard], c, true);
    const client = { fetchCardsPage: vi.fn().mockResolvedValue(page) } as unknown as WbClient;

    await runWbProductSync({ mode: "incremental", client, db: prisma });
    const st1 = await prisma.wbSyncState.findUnique({
      where: { key: WB_SYNC_STATE_KEY_INCREMENTAL },
    });
    expect(st1?.cursorUpdatedAt).toBe(c.updatedAt);
    expect(st1?.cursorNmId).toBe(c.nmID);

    const err = new Error("network boom");
    const errClient = {
      fetchCardsPage: vi.fn().mockRejectedValue(err),
    } as unknown as WbClient;

    await expect(
      runWbProductSync({ mode: "incremental", client: errClient, db: prisma })
    ).rejects.toThrow(err);

    const st2 = await prisma.wbSyncState.findUnique({
      where: { key: WB_SYNC_STATE_KEY_INCREMENTAL },
    });
    expect(st2?.cursorUpdatedAt).toBe(c.updatedAt);
    expect(st2?.cursorNmId).toBe(c.nmID);
    expect(st2?.lastError).toBe("network boom");
  }, 20_000);

  it("incremental: reads cursor from legacy default row when wb_sync_incremental is absent", async () => {
    const legacyCursor = { updatedAt: "2018-05-05T00:00:00.000Z", nmID: 12_121 };
    await prisma.wbSyncState.create({
      data: {
        key: "default",
        mode: "incremental",
        cursorUpdatedAt: legacyCursor.updatedAt,
        cursorNmId: legacyCursor.nmID,
      },
    });

    const c = { updatedAt: "2025-12-12T00:00:00.000Z", nmID: 99 };
    const page: WbCardsPageResult = pageFromCards([sampleCard], c, true);
    let requestedCursor: { updatedAt: string; nmID: number } | undefined;
    const client = {
      fetchCardsPage: vi.fn().mockImplementation(async (req: { cursor?: typeof requestedCursor }) => {
        requestedCursor = req.cursor;
        return page;
      }),
    } as unknown as WbClient;

    await runWbProductSync({ mode: "incremental", client, db: prisma });

    expect(requestedCursor).toEqual(legacyCursor);
  }, 20_000);

  it("full: raw nmID is recorded before mapping (mapper null → page errors, no reconcile run)", async () => {
    await prisma.product.create({
      data: {
        name: "SYNC-TEST-MAPPER-FAIL",
        description: "x",
        price: 1,
        images: "[]",
        breadcrumbs: "[]",
        pickupAvailability: "x",
        deliveryAvailability: "x",
        returnDetails: "x",
        categories: "[]",
        ageGroups: "[]",
        isActive: true,
        wbNmId: cardNm,
      },
    });
    const spy = vi.spyOn(mapCard, "mapWbCardToProductData").mockReturnValue(null);

    const c = { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 1 };
    const page: WbCardsPageResult = pageFromCards([sampleCard], c, true);
    const client = { fetchCardsPage: vi.fn().mockResolvedValue(page) } as unknown as WbClient;

    const r = await runWbProductSync({
      mode: "full",
      client,
      db: prisma,
      reconcile: true,
    });
    spy.mockRestore();

    expect(r.errors).toBeGreaterThanOrEqual(1);
    expect(r.deactivated).toBe(0);
    const row = await prisma.product.findFirst({ where: { wbNmId: cardNm } });
    expect(row?.isActive).toBe(true);
  }, 20_000);

  it("full: does not overwrite incremental sync cursor row", async () => {
    await prisma.wbSyncState.create({
      data: {
        key: WB_SYNC_STATE_KEY_INCREMENTAL,
        mode: "incremental",
        cursorUpdatedAt: "1999-06-01T00:00:00.000Z",
        cursorNmId: 77_777,
      },
    });

    const c = { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 1 };
    const page: WbCardsPageResult = pageFromCards([sampleCard], c, true);
    const client = { fetchCardsPage: vi.fn().mockResolvedValue(page) } as unknown as WbClient;

    await runWbProductSync({
      mode: "full",
      client,
      db: prisma,
      reconcile: false,
    });

    const inc = await prisma.wbSyncState.findUnique({
      where: { key: WB_SYNC_STATE_KEY_INCREMENTAL },
    });
    expect(inc?.cursorUpdatedAt).toBe("1999-06-01T00:00:00.000Z");
    expect(inc?.cursorNmId).toBe(77_777);

    const fullRow = await prisma.wbSyncState.findUnique({
      where: { key: WB_SYNC_STATE_KEY_FULL },
    });
    expect(fullRow?.cursorUpdatedAt).toBe(c.updatedAt);
    expect(fullRow?.cursorNmId).toBe(c.nmID);
  }, 20_000);

  it("full: string nmID is in seenNmIds; reconcile deactivates orphan (no spurious no-nmID skip)", async () => {
    await prisma.product.create({
      data: {
        name: "SYNC-TEST-ORPHAN-STR-NM",
        description: "x",
        price: 1,
        images: "[]",
        breadcrumbs: "[]",
        pickupAvailability: "x",
        deliveryAvailability: "x",
        returnDetails: "x",
        categories: "[]",
        ageGroups: "[]",
        isActive: true,
        wbNmId: orphanNm,
      },
    });

    const stringNmCard: unknown = {
      ...(sampleCard as Record<string, unknown>),
      nmID: String(cardNm),
    };

    const c = { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 1 };
    const page: WbCardsPageResult = pageFromCards([stringNmCard], c, true);
    const client = { fetchCardsPage: vi.fn().mockResolvedValue(page) } as unknown as WbClient;

    const r = await runWbProductSync({
      mode: "full",
      client,
      db: prisma,
      reconcile: true,
    });

    expect(r.reconcileSkippedReason).toBeUndefined();
    expect(r.deactivated).toBeGreaterThanOrEqual(1);
    expect(r.deactivatedNmIds).toContain(orphanNm);
    const ghost = await prisma.product.findFirst({ where: { wbNmId: orphanNm } });
    expect(ghost?.isActive).toBe(false);
  }, 20_000);

  it("full: empty API response skips reconcile (no deactivate-all)", async () => {
    await prisma.product.create({
      data: {
        name: "SYNC-TEST-EMPTY-API-ORPHAN",
        description: "x",
        price: 1,
        images: "[]",
        breadcrumbs: "[]",
        pickupAvailability: "x",
        deliveryAvailability: "x",
        returnDetails: "x",
        categories: "[]",
        ageGroups: "[]",
        isActive: true,
        wbNmId: orphanNm,
      },
    });

    const c = { updatedAt: "2020-01-01T00:00:00.000Z", nmID: 1 };
    const page: WbCardsPageResult = pageFromCards([], c, true);
    const client = { fetchCardsPage: vi.fn().mockResolvedValue(page) } as unknown as WbClient;

    const r = await runWbProductSync({
      mode: "full",
      client,
      db: prisma,
      reconcile: true,
    });

    expect(r.deactivated).toBe(0);
    expect(r.reconcileSkippedReason).toContain("no cards");
    const ghost = await prisma.product.findFirst({ where: { wbNmId: orphanNm } });
    expect(ghost?.isActive).toBe(true);
  }, 20_000);
});

describe("deactivateWbProductsNotInSet", () => {
  it("deactivates only missing nmIDs", async () => {
    const a = 9_000_201;
    const b = 9_000_202;
    await prisma.product.deleteMany({
      where: { wbNmId: { in: [a, b] } },
    });
    await prisma.product.create({
      data: {
        name: "deact-a",
        description: "x",
        price: 1,
        images: "[]",
        breadcrumbs: "[]",
        pickupAvailability: "x",
        deliveryAvailability: "x",
        returnDetails: "x",
        categories: "[]",
        ageGroups: "[]",
        wbNmId: a,
        isActive: true,
      },
    });
    await prisma.product.create({
      data: {
        name: "deact-b",
        description: "x",
        price: 1,
        images: "[]",
        breadcrumbs: "[]",
        pickupAvailability: "x",
        deliveryAvailability: "x",
        returnDetails: "x",
        categories: "[]",
        ageGroups: "[]",
        wbNmId: b,
        isActive: true,
      },
    });
    // Global helper: "seen" must list every other wbNmId in the DB, or this test DB would
    // also deactivate unrelated catalog rows. Exclude only `b` from the set.
    const allNms = (
      await prisma.product.findMany({
        where: { wbNmId: { not: null } },
        select: { wbNmId: true },
      })
    )
      .map((p) => p.wbNmId!)
      .filter((n) => n !== b);
    const seen = new Set(allNms);
    const r = await deactivateWbProductsNotInSet(prisma, seen);
    expect(r.count).toBe(1);
    const left = await prisma.product.findFirst({ where: { wbNmId: a } });
    const off = await prisma.product.findFirst({ where: { wbNmId: b } });
    expect(left?.isActive).toBe(true);
    expect(off?.isActive).toBe(false);
    await prisma.product.deleteMany({ where: { wbNmId: { in: [a, b] } } });
  });
});
