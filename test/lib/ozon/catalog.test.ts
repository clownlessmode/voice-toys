// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { OzonClient } from "@/lib/ozon/client";
import { compareOzonCatalog } from "@/lib/ozon/catalog";

const offer = (productId: number, offerId: string) => ({
  product_id: productId, offer_id: offerId, sku: productId + 100,
  has_fbo_stocks: true, has_fbs_stocks: false, archived: false,
});
const product = (id: string, article: string) => ({
  id, name: id, wbNmId: 1, characteristics: [{ key: "Артикул", value: article }],
});

describe("Ozon catalog comparison", () => {
  it("matches only exact unique seller articles and returns Ozon identifiers", () => {
    const result = compareOzonCatalog([product("site", "TOY-1")], [offer(1, "TOY-1")]);
    expect(result.matched).toBe(1);
    expect(result.products[0]).toMatchObject({ status: "matched", ozonProductId: "1", ozonSku: "101" });
  });
  it("does not match by title, case folding, or guessed WB offer IDs", () => {
    const result = compareOzonCatalog([product("same title", "toy")], [offer(1, "TOY")]);
    expect(result.matched).toBe(0);
    expect(result.products[0].status).toBe("missing");
  });
  it("requires review when two site products have the same article", () => {
    const result = compareOzonCatalog([product("a", "toy"), product("b", "toy")], [offer(1, "toy")]);
    expect(result.matched).toBe(0);
    expect(result.products.every(p => p.status === "ambiguous")).toBe(true);
  });
  it("does not make an archived Ozon product available", () => {
    const result = compareOzonCatalog([product("a", "toy")], [{ ...offer(1, "toy"), archived: true }]);
    expect(result.products[0].status).toBe("archived");
    expect(result.matched).toBe(0);
  });
  it("does not treat availability flags as a numerical stock balance", () => {
    const result = compareOzonCatalog([product("a", "toy")], [offer(1, "toy")]);
    expect(result.products[0]).toMatchObject({ hasFboStocks: true, hasFbsStocks: false });
    expect(result.products[0]).not.toHaveProperty("stock");
  });
});

describe("Ozon read-only catalog client", () => {
  it("follows last_id until all products are read", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { items: [offer(1, "a")], total: 2, last_id: "next" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { items: [offer(2, "b")], total: 2, last_id: "" } })));
    const client = new OzonClient({ getClientId: () => "client", getApiKey: () => "key", fetchImpl });
    expect(await client.listProducts()).toHaveLength(2);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).last_id).toBe("next");
    expect(fetchImpl.mock.calls.every(([url]) => String(url).endsWith("/v3/product/list"))).toBe(true);
  });
  it("rejects a truncated catalog instead of claiming products are missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { items: [offer(1, "a")], total: 2, last_id: "" } })));
    const client = new OzonClient({ getClientId: () => "client", getApiKey: () => "key", fetchImpl });
    await expect(client.listProducts()).rejects.toThrow(/incomplete/i);
  });
  it("rejects an unexpected HTTP 200 response shape", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: {} })));
    const client = new OzonClient({ getClientId: () => "client", getApiKey: () => "key", fetchImpl });
    await expect(client.listProducts()).rejects.toThrow(/invalid/i);
  });
  it("does not report delivery access for malformed eligibility responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}"));
    const client = new OzonClient({ getClientId: () => "client", getApiKey: () => "key", fetchImpl });
    expect((await client.checkDelivery("79001234567")).ok).toBe(false);
  });
});
