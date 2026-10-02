import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique } } }));

beforeEach(() => { vi.clearAllMocks(); });

it("returns only payment status and type, with caching disabled", async () => {
  const { GET } = await import("@/app/api/orders/[id]/payment-status/route");
  findUnique.mockResolvedValue({
    status: "CREATED", paymentType: "online", customerName: "Private name",
    customerPhone: "Private phone", paymentTransactionId: "private-transaction",
  });
  const response = await GET(new NextRequest("http://localhost/api/orders/order-one/payment-status"), {
    params: Promise.resolve({ id: "order-one" }),
  });
  expect(await response.json()).toEqual({ status: "CREATED", paymentType: "online" });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(findUnique).toHaveBeenCalledWith({
    where: { id: "order-one" }, select: { status: true, paymentType: true },
  });
});

it("returns 404 for a nonexistent order", async () => {
  const { GET } = await import("@/app/api/orders/[id]/payment-status/route");
  findUnique.mockResolvedValue(null);
  const response = await GET(new NextRequest("http://localhost/api/orders/missing/payment-status"), {
    params: Promise.resolve({ id: "missing" }),
  });
  expect(response.status).toBe(404);
});
