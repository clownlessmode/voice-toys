// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
  promoCode: { findUnique: vi.fn() },
  order: { create: vi.fn() },
}));
const ozonQuote = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/telegram", () => ({ sendOrderNotification: vi.fn() }));
vi.mock("@/lib/ozon-delivery/service", () => ({ quoteOzonDelivery: ozonQuote }));
import { POST } from "@/app/api/orders/create/route";

const payload = {
  customerName: "Покупатель", customerPhone: "+79001234567",
  deliveryType: "pickup", paymentType: "online",
  items: [{ productId: "toy", quantity: 2 }],
};
const submit = (body: unknown) => POST(new NextRequest("http://localhost/api/orders/create", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));

beforeEach(() => {
  vi.clearAllMocks();
  db.product.findMany.mockResolvedValue([{ id: "toy", price: 100, isActive: true }]);
  db.promoCode.findUnique.mockResolvedValue({
    id: "promo", isActive: true, type: "PERCENTAGE", value: 10,
    validFrom: new Date("2020-01-01"), validUntil: new Date("2100-01-01"),
    maxUses: 10, currentUses: 0, minOrderAmount: 100,
  });
  db.order.create.mockImplementation(async ({ data }) => ({
    ...data, id: "order", status: "CREATED", createdAt: new Date(), updatedAt: new Date(),
    paidAt: null, items: [],
  }));
  ozonQuote.mockResolvedValue({
    deliveryPointId: 7, shipmentMethodId: 42, pointName: "Ozon ПВЗ",
    address: "Москва, улица 1", deliveryCost: 310,
    estimatedDeliveryDays: 2, cutoffAt: "2030-01-01T12:00:00Z",
  });
});

describe("server-priced checkout", () => {
  it("ignores a forged client discount without a promo code", async () => {
    const result = await submit({ ...payload, discountAmount: 199 });
    expect(result.status).toBe(201);
    expect(await result.json()).toMatchObject({ totalAmount: 200, discountAmount: 0 });
  });
  it("recalculates the discount using the stored promo and product prices", async () => {
    const result = await submit({ ...payload, promoCodeId: "promo", discountAmount: 199, originalAmount: 1 });
    expect(result.status).toBe(201);
    expect(await result.json()).toMatchObject({ totalAmount: 180, discountAmount: 20, originalAmount: 200 });
  });
  it("rejects expired promos instead of accepting the browser calculation", async () => {
    db.promoCode.findUnique.mockResolvedValueOnce({ isActive: true, validFrom: new Date("2020-01-01"), validUntil: new Date("2021-01-01") });
    expect((await submit({ ...payload, promoCodeId: "promo" })).status).toBe(400);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it("rejects an exhausted promo", async () => {
    const promo = await db.promoCode.findUnique();
    db.promoCode.findUnique.mockResolvedValueOnce({ ...promo, currentUses: 10 });
    expect((await submit({ ...payload, promoCodeId: "promo" })).status).toBe(400);
  });
  it("persists the actual payment type", async () => {
    const result = await submit({ ...payload, paymentType: "cash_on_delivery" });
    expect(result.status).toBe(201);
    expect(db.order.create.mock.calls[0][0].data.paymentType).toBe("cash_on_delivery");
  });
  it("rejects cash on delivery for a carrier shipment", async () => {
    expect((await submit({ ...payload, paymentType: "cash_on_delivery", deliveryType: "delivery", deliveryAddress: "Адрес" })).status).toBe(400);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, "2", null])("rejects invalid quantity %s", async (quantity) => {
    expect((await submit({ ...payload, items: [{ productId: "toy", quantity }] })).status).toBe(400);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it.each([null, [], { ...payload, items: {} }, { ...payload, items: [null] }])("rejects malformed request data", async (body) => {
    expect((await submit(body)).status).toBe(400);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it("server-quotes Ozon delivery and includes it in the payable total", async () => {
    const result = await submit({
      ...payload, deliveryType: "ozon_pvz", ozonDeliveryPointId: 7, ozonShipmentMethodId: 42,
    });
    expect(result.status).toBe(201);
    expect(await result.json()).toMatchObject({ totalAmount: 510, deliveryCost: 310 });
    expect(db.order.create.mock.calls[0][0].data).toMatchObject({
      deliveryAddress: "Ozon Ozon ПВЗ: Москва, улица 1",
      ozonDeliveryPointId: "7", ozonShipmentMethodId: "42",
      ozonDeliveryStatus: "AWAITING_PAYMENT",
    });
  });
  it("allows a sub-100 RUB product for pickup", async () => {
    db.product.findMany.mockResolvedValueOnce([{ id: "toy", price: 99, isActive: true }]);
    const result = await submit({ ...payload, items: [{ productId: "toy", quantity: 1 }] });
    expect(result.status).toBe(201);
    expect(await result.json()).toMatchObject({ totalAmount: 99, deliveryType: "pickup" });
  });
  it("rejects a sub-100 RUB product for Ozon even when multiple units exceed 100 RUB", async () => {
    db.product.findMany.mockResolvedValueOnce([{ id: "toy", price: 99, isActive: true }]);
    const result = await submit({
      ...payload, deliveryType: "ozon_pvz", ozonDeliveryPointId: 7, ozonShipmentMethodId: 42,
    });
    expect(result.status).toBe(400);
    expect(await result.json()).toMatchObject({ error: expect.stringContaining("100 ₽") });
    expect(ozonQuote).not.toHaveBeenCalled();
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it("does not create an order when Ozon rejects the quote", async () => {
    ozonQuote.mockRejectedValueOnce(new Error("unavailable"));
    expect((await submit({
      ...payload, deliveryType: "ozon_pvz", ozonDeliveryPointId: 7, ozonShipmentMethodId: 42,
    })).status).toBe(422);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it("rejects zero-value online payments instead of redirecting to the bank", async () => {
    const promo = await db.promoCode.findUnique();
    db.promoCode.findUnique.mockResolvedValueOnce({ ...promo, value: 100 });
    expect((await submit({ ...payload, promoCodeId: "promo" })).status).toBe(400);
  });
});
