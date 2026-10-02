// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(), list: vi.fn(), info: vi.fn(), quote: vi.fn(), products: vi.fn(),
}));
vi.mock("@/lib/ozon-delivery/config", () => ({ isOzonDeliveryConfigured: mocks.configured }));
vi.mock("@/lib/ozon-delivery/client", () => ({
  getOzonDeliveryClient: () => ({ listDeliveryPoints: mocks.list, getDeliveryPoints: mocks.info }),
  OzonDeliveryError: class extends Error { constructor(message: string, readonly status: number) { super(message); } },
}));
vi.mock("@/lib/ozon-delivery/service", () => ({ quoteOzonDelivery: mocks.quote }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findMany: mocks.products } } }));

import { GET as points } from "@/app/api/ozon-delivery/points/route";
import { POST as quote } from "@/app/api/ozon-delivery/quote/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.list.mockResolvedValue({ deliveryPoints: [], nextCursor: null });
  mocks.info.mockResolvedValue([]);
  mocks.products.mockResolvedValue([{ id: "toy", name: "Toy", price: 100, characteristics: [] }]);
  mocks.quote.mockResolvedValue({
    deliveryPointId: 7, shipmentMethodId: 42, pointName: "Ozon", address: "Address",
    deliveryCost: 250, estimatedDeliveryDays: 2, cutoffAt: null,
  });
});

describe("public Ozon Delivery routes", () => {
  it("reports the currently empty live point set without inventing points", async () => {
    const response = await points(new NextRequest("http://localhost/api/ozon-delivery/points"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ points: [], nextCursor: null, available: false });
    expect(mocks.info).not.toHaveBeenCalled();
  });

  it("joins point summaries with safe public details", async () => {
    mocks.list.mockResolvedValueOnce({
      deliveryPoints: [{ delivery_point_id: 7, shipment_method_ids: [42] }], nextCursor: "next",
    });
    mocks.info.mockResolvedValueOnce([{
      delivery_point_id: 7, name: "Ozon", full_address: "Address", type: "PVZ", is_active: true,
      restrictions: { private: "not returned" },
    }]);
    const response = await points(new NextRequest("http://localhost/api/ozon-delivery/points"));
    expect(await response.json()).toEqual({
      available: true, nextCursor: "next",
      points: [{ id: 7, name: "Ozon", address: "Address", type: "PVZ", shipmentMethodIds: [42] }],
    });
  });

  it("prices only active server-side products", async () => {
    const response = await quote(new NextRequest("http://localhost/api/ozon-delivery/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+79001234567", deliveryPointId: 7, shipmentMethodId: 42,
        items: [{ productId: "toy", quantity: 2 }] }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.products).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: { in: ["toy"] }, isActive: true,
    } }));
    expect(mocks.quote).toHaveBeenCalledWith(expect.objectContaining({ declaredValueRub: 200 }));
  });

  it("rejects Ozon delivery when any product costs less than 100 RUB", async () => {
    mocks.products.mockResolvedValueOnce([{ id: "cheap", name: "Cheap", price: 99.99, characteristics: [] }]);
    const response = await quote(new NextRequest("http://localhost/api/ozon-delivery/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+79001234567", deliveryPointId: 7, shipmentMethodId: 42,
        items: [{ productId: "cheap", quantity: 2 }] }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("100 ₽") });
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it("rejects malformed quote inputs before database or provider calls", async () => {
    const response = await quote(new NextRequest("http://localhost/api/ozon-delivery/quote", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [] }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.quote).not.toHaveBeenCalled();
  });
});
