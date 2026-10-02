// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), find: vi.fn(), update: vi.fn(), cancel: vi.fn(),
}));
vi.mock("@/lib/admin-request", () => ({ assertAdmin: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique: mocks.find, update: mocks.update } } }));
vi.mock("@/lib/ozon-delivery/client", () => ({
  getOzonDeliveryClient: () => ({
    cancelPosting: mocks.cancel,
  }),
}));

import { POST } from "@/app/api/admin/orders/[id]/ozon-cancel/route";

const context = { params: Promise.resolve({ id: "order-one" }) };
const postRequest = () => POST(new NextRequest(
  "http://localhost/api/admin/orders/order-one/ozon-cancel",
  { method: "POST" },
), context);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.find.mockResolvedValue({
    id: "order-one", deliveryType: "ozon_pvz", ozonPostingNumber: "posting-one",
    ozonDeliveryStatus: "CREATED",
  });
  mocks.cancel.mockResolvedValue(undefined);
  mocks.update.mockResolvedValue({});
});

describe("admin Ozon posting cancellation", () => {
  it("requires admin authentication", async () => {
    mocks.auth.mockResolvedValueOnce(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await postRequest()).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("requests cancellation and records the pending provider status", async () => {
    const response = await postRequest();
    expect(response.status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith("posting-one");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "order-one" },
      data: { ozonDeliveryStatus: "CANCELLED", ozonDeliveryError: null },
    });
  });
});
