// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), configured: vi.fn(), products: vi.fn(), list: vi.fn(),
}));
vi.mock("@/lib/admin-request", () => ({ assertAdmin: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany: mocks.products } } }));
vi.mock("@/lib/ozon/config", () => ({ isOzonConfigured: mocks.configured }));
vi.mock("@/lib/ozon/client", () => ({
  OzonClient: class { listProducts = mocks.list; },
  OzonClientError: class extends Error {},
}));
import { GET } from "@/app/api/admin/ozon/catalog/route";
const request = () => new NextRequest("http://localhost/api/admin/ozon/catalog");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.configured.mockReturnValue(true);
  mocks.products.mockResolvedValue([]);
  mocks.list.mockResolvedValue([]);
});

describe("Ozon catalog report authorization and completeness", () => {
  it("rejects unauthenticated access before querying either catalog", async () => {
    mocks.auth.mockResolvedValueOnce(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await GET(request())).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.products).not.toHaveBeenCalled();
  });
  it("reports missing configuration without trying a marketplace request", async () => {
    mocks.configured.mockReturnValueOnce(false);
    expect((await GET(request())).status).toBe(503);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("does not expose a partial comparison or upstream error body", async () => {
    mocks.list.mockRejectedValueOnce(new Error("upstream private error"));
    const result = await GET(request());
    expect(result.status).toBe(502);
    expect(await result.text()).not.toContain("upstream private error");
  });
  it("returns an uncached report for an authenticated administrator", async () => {
    const result = await GET(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.json()).toMatchObject({ siteTotal: 0, ozonTotal: 0, matched: 0 });
  });
});
