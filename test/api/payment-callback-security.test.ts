import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const fixtures = vi.hoisted(() => {
  process.env.STORE_ID = "test-merchant";
  process.env.TEST_KEY = "test-callback-secret";
  process.env.REAL_KEY = "test-callback-secret";
  return {
    db: {
      order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      promoCode: { update: vi.fn() },
      $transaction: vi.fn(),
    },
    notify: vi.fn(),
    createOzon: vi.fn(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: fixtures.db }));
vi.mock("@/lib/telegram", () => ({ sendOrderNotification: fixtures.notify }));
vi.mock("@/lib/ozon-delivery/service", () => ({ createOzonDeliveryOrder: fixtures.createOzon }));

import { POST } from "@/app/api/orders/[id]/pay/route";

const initialOrder = () => ({
  id: "order-one", orderNumber: "2026-0001", status: "CREATED", paidAt: null as Date | null,
  paymentType: "online", paymentTransactionId: null as string | null,
  customerName: "Test buyer", customerPhone: "79001234567", customerEmail: null,
  deliveryType: "pickup", deliveryAddress: null as string | null,
  deliveryCost: 0, ozonDeliveryPointId: null as string | null,
  ozonShipmentMethodId: null as string | null, ozonCutoffAt: null as string | null,
  ozonIdempotencyKey: null as string | null,
  totalAmount: 1250.5, currency: "₽", promoCodeId: "promo-one",
  createdAt: new Date(), updatedAt: new Date(), items: [],
});
let order: ReturnType<typeof initialOrder>;
let promoUses: number;

// Independent fixture signer follows the provider's documented key=base64(value) algorithm.
function signed(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    order_id: "order-one", transaction_id: "transaction-one", state: "COMPLETE",
    amount: "1250.50", currency: "RUB", merchant: "test-merchant",
    testing: process.env.NODE_ENV === "production" ? "0" : "1", ...overrides,
  };
  const values = Object.entries(fields).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${Buffer.from(value).toString("base64")}`).join("&");
  const sha1 = (input: string) => createHash("sha1").update(input).digest("hex");
  return { ...fields, signature: sha1("test-callback-secret" + sha1("test-callback-secret" + values)) };
}

function submit(fields: Record<string, string>, json = false) {
  return POST(new NextRequest("http://localhost/api/orders/order-one/pay", {
    method: "POST",
    headers: { "Content-Type": json ? "application/json" : "application/x-www-form-urlencoded" },
    body: json ? JSON.stringify(fields) : new URLSearchParams(fields),
  }), { params: Promise.resolve({ id: "order-one" }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  order = initialOrder();
  promoUses = 0;
  fixtures.db.order.findUnique.mockImplementation(async () => ({ ...order }));
  fixtures.db.order.update.mockImplementation(async ({ data }) => Object.assign(order, data));
  fixtures.db.order.updateMany.mockImplementation(async ({ where, data }) => {
    if (order.status !== where.status || order.paymentTransactionId !== where.paymentTransactionId || order.paidAt !== where.paidAt) {
      return { count: 0 };
    }
    Object.assign(order, data);
    return { count: 1 };
  });
  fixtures.db.promoCode.update.mockImplementation(async () => { promoUses += 1; return {}; });
  let queue = Promise.resolve();
  fixtures.db.$transaction.mockImplementation((callback) => {
    const result = queue.then(async () => {
      const snapshot = { ...order };
      const uses = promoUses;
      try { return await callback(fixtures.db); }
      catch (error) { order = snapshot; promoUses = uses; throw error; }
    });
    queue = result.catch(() => undefined);
    return result;
  });
  fixtures.notify.mockResolvedValue(undefined);
  fixtures.createOzon.mockResolvedValue({ orderNumber: "ozon-order", postingNumber: "posting-one" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected network request")));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("verified payment callbacks", () => {
  it.each([
    [true, { source: "success_page", transaction_id: "invented", state: "COMPLETE" }],
    [false, {}],
    [false, { state: "COMPLETE", transaction_id: "invented" }],
  ] as const)("rejects unsigned requests (JSON=%s)", async (json, fields) => {
    expect((await submit(fields, json)).status).toBe(400);
    expect(order.status).toBe("CREATED");
    expect(promoUses).toBe(0);
    expect(fixtures.notify).not.toHaveBeenCalled();
  });

  it.each<Record<string, string>>([
    { order_id: "other-order" }, { amount: "1.00" }, { amount: "1250.501" },
    { currency: "USD" }, { merchant: "other-merchant" }, { testing: "0" },
    { state: "FAILED" }, { transaction_id: "" },
  ])("rejects mismatched payment data %j", async (overrides) => {
    expect((await submit(signed(overrides))).status).toBe(400);
    expect(order.status).toBe("CREATED");
    expect(promoUses).toBe(0);
  });

  it("rejects a signature altered after signing", async () => {
    const callback = signed();
    expect((await submit({ ...callback, signature: "0".repeat(40) })).status).toBe(400);
    expect(order.status).toBe("CREATED");
  });

  it.each([false, true])("accepts a signed COMPLETE callback (JSON=%s)", async (json) => {
    const result = await submit(signed(), json);
    expect(result.status).toBe(200);
    expect(order.status).toBe("PAID");
    expect(order.paymentTransactionId).toBe("transaction-one");
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(promoUses).toBe(1);
    expect(await result.json()).toEqual({ success: true });
  });

  it("acknowledges concurrent duplicate callbacks without repeating shipment or promo use", async () => {
    const responses = await Promise.all([submit(signed()), submit(signed())]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(promoUses).toBe(1);
    expect(fixtures.notify).toHaveBeenCalledTimes(1);
    expect(fixtures.createOzon).not.toHaveBeenCalled();
  });

  it("creates one Ozon shipment after a verified payment", async () => {
    order.deliveryType = "ozon_pvz";
    order.deliveryCost = 250;
    order.ozonDeliveryPointId = "7";
    order.ozonShipmentMethodId = "42";
    order.ozonIdempotencyKey = "123e4567-e89b-42d3-a456-426614174000";
    const result = await submit(signed());
    expect(result.status).toBe(200);
    expect(fixtures.createOzon).toHaveBeenCalledTimes(1);
    expect(fixtures.db.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ozonOrderNumber: "ozon-order", ozonPostingNumber: "posting-one", ozonDeliveryStatus: "CREATED",
      }),
    }));
  });

  it.each(["SHIPPED", "DELIVERED"])("acknowledges an old callback without regressing %s", async (status) => {
    order.status = status;
    order.paidAt = new Date();
    order.paymentTransactionId = "transaction-one";
    expect((await submit(signed())).status).toBe(200);
    expect(order.status).toBe(status);
    expect(promoUses).toBe(0);
    expect(fixtures.notify).not.toHaveBeenCalled();
  });

  it("rejects a different transaction for an already paid order", async () => {
    order.status = "PAID";
    order.paymentTransactionId = "prior-transaction";
    expect((await submit(signed())).status).toBe(409);
    expect(order.paymentTransactionId).toBe("prior-transaction");
  });

  it("rejects a callback for a cancelled order", async () => {
    order.status = "CANCELLED";
    expect((await submit(signed())).status).toBe(409);
    expect(order.status).toBe("CANCELLED");
  });

  it("rolls back payment if promo accounting fails", async () => {
    fixtures.db.promoCode.update.mockRejectedValueOnce(new Error("Database unavailable"));
    expect((await submit(signed())).status).toBe(500);
    expect(order.status).toBe("CREATED");
    expect(order.paymentTransactionId).toBeNull();
    expect(fixtures.notify).not.toHaveBeenCalled();
  });
});
