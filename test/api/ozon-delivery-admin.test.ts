// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), find: vi.fn(), update: vi.fn(), create: vi.fn(),
}));
vi.mock("@/lib/admin-request", () => ({ assertAdmin: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique: mocks.find, update: mocks.update } } }));
vi.mock("@/lib/ozon-delivery/service", () => ({ createOzonDeliveryOrder: mocks.create }));

import { POST } from "@/app/api/admin/orders/[id]/ozon-shipment/route";

const request = () => POST(
  new NextRequest("http://localhost/api/admin/orders/order-one/ozon-shipment", { method: "POST" }),
  { params: Promise.resolve({ id: "order-one" }) },
);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.find.mockResolvedValue({
    id: "order-one", status: "PAID", paidAt: new Date(), deliveryType: "ozon_pvz",
    ozonPostingNumber: null, items: [],
  });
  mocks.create.mockResolvedValue({ orderNumber: "ozon-order", postingNumber: "posting-one" });
  mocks.update.mockResolvedValue({});
});

describe("admin Ozon shipment retry", () => {
  it("requires an authenticated admin before loading the order", async () => {
    mocks.auth.mockResolvedValueOnce(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await request()).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("uses the same persisted order and records the provider identifiers", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      ozonOrderNumber: "ozon-order", ozonPostingNumber: "posting-one", ozonDeliveryStatus: "CREATED",
    }) }));
  });

  it("does not create a duplicate when a posting is already stored", async () => {
    mocks.find.mockResolvedValueOnce({
      id: "order-one", status: "PAID", paidAt: new Date(), deliveryType: "ozon_pvz",
      ozonOrderNumber: "ozon-order", ozonPostingNumber: "posting-one", items: [],
    });
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ alreadyCreated: true, postingNumber: "posting-one" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
