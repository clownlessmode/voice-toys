import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique } } }));
vi.mock("@/lib/modulbank", () => ({
  createPaymentData: (data: { orderId: string; amount: number }) => data,
  generatePaymentForm: (data: { orderId: string; amount: number }) =>
    `<form action="https://pay.modulbank.ru/pay"><input name="order_id" value="${data.orderId}"><input name="amount" value="${data.amount}"></form>`,
}));

import { GET } from "@/app/api/orders/[id]/pay/modulbank/route";

const payableOrder = {
  id: "order-one", orderNumber: "2026-0001", status: "CREATED", paymentType: "online",
  paidAt: null, paymentTransactionId: null, totalAmount: 1250.5,
  customerName: "Test buyer", customerPhone: "79001234567", customerEmail: null,
  items: [],
};

beforeEach(() => { vi.clearAllMocks(); });

function initiate() {
  return GET(new NextRequest("http://localhost/api/orders/order-one/pay/modulbank", {
    headers: { host: "localhost" },
  }), { params: Promise.resolve({ id: "order-one" }) });
}

it.each([
  { paymentType: "cash_on_delivery" },
  { status: "SHIPPED" },
  { status: "DELIVERED" },
  { paidAt: new Date("2026-09-22T00:00:00Z") },
  { paymentTransactionId: "already-processed" },
])("does not open a bank payment for an ineligible order %j", async (changes) => {
  findUnique.mockResolvedValue({ ...payableOrder, ...changes });
  const response = await initiate();
  expect(response.status).toBe(409);
  expect(response.headers.get("Content-Type")).toContain("application/json");
  expect(await response.text()).not.toContain("<form");
});

it("opens the bank form for an unpaid CREATED online order", async () => {
  findUnique.mockResolvedValue(payableOrder);
  const response = await initiate();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toContain("text/html");
  const html = await response.text();
  expect(html).toContain('name="amount" value="1250.5"');
  expect(html).toContain('name="order_id" value="order-one"');
});
