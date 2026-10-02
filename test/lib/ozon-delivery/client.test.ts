import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OzonDeliveryClient,
  OzonDeliveryError,
  normalizeOzonDeliveryPhone,
} from "@/lib/ozon-delivery/client";

afterEach(() => vi.restoreAllMocks());

describe("OzonDeliveryClient", () => {
  it("normalizes Russian phone numbers", () => {
    expect(normalizeOzonDeliveryPhone("8 (900) 123-45-67")).toBe("+79001234567");
    expect(() => normalizeOzonDeliveryPhone("123")).toThrow(/phone/i);
  });

  it("gets and caches an OAuth token with the delivery scope", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: "access-token", token_type: "bearer", expires_in: Math.floor(Date.now() / 1000) + 3600,
    }), { status: 200 }));
    const client = new OzonDeliveryClient({
      getClientId: () => "client", getClientSecret: () => "secret", fetchImpl,
    });

    expect(await client.getAccessToken()).toBe("access-token");
    expect(await client.getAccessToken()).toBe("access-token");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      grant_type: "client_credentials", scope: ["delivery-api.all"],
    });
  });

  it("replays Ozon's same-origin test-cookie redirect without changing the request", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "access-token", expires_in: Math.floor(Date.now() / 1000) + 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response("redirect", {
        status: 307,
        headers: {
          location: "https://api-delivery.ozon.ru/v1/delivery-point/list?__rr=1",
          "set-cookie": "__Secure-ETC=cookie-value; Path=/; Secure",
        },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ delivery_points: [] }), { status: 200 }));
    const client = new OzonDeliveryClient({
      getClientId: () => "client", getClientSecret: () => "secret", fetchImpl,
    });

    expect(await client.listDeliveryPoints()).toEqual({ deliveryPoints: [], nextCursor: null });
    const redirected = fetchImpl.mock.calls[2];
    expect(redirected[0]).toBe("https://api-delivery.ozon.ru/v1/delivery-point/list?__rr=1");
    expect(redirected[1]).toMatchObject({ method: "POST", body: JSON.stringify({ pagination: { cursor: null, limit: 100 } }) });
    expect(new Headers(redirected[1]?.headers).get("cookie")).toBe("__Secure-ETC=cookie-value");
  });

  it("rejects cross-origin redirects", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "access-token", expires_in: Math.floor(Date.now() / 1000) + 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response("redirect", {
        status: 307, headers: { location: "https://attacker.example/steal" },
      }));
    const client = new OzonDeliveryClient({
      getClientId: () => "client", getClientSecret: () => "secret", fetchImpl,
    });
    await expect(client.listDeliveryPoints()).rejects.toThrow(/redirect/i);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not expose credentials in provider errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      code: 3, message: "client secret is invalid",
    }), { status: 401 }));
    const client = new OzonDeliveryClient({
      getClientId: () => "client-id", getClientSecret: () => "very-secret", fetchImpl,
    });
    const promise = client.getAccessToken();
    await expect(promise).rejects.toBeInstanceOf(OzonDeliveryError);
    await expect(promise).rejects.not.toThrow(/very-secret/);
  });

  it("sends checkout and create payloads to the business API", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "access-token", expires_in: Math.floor(Date.now() / 1000) + 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ request_id: 1, posting: {
        estimated_delivery_cost: { amount: "299.00", currency_code: "RUB" },
        estimated_insurance_cost: { amount: "10.00", currency_code: "RUB" },
        estimated_delivery_days: 2, cutoff_at: "2030-01-01T12:00:00Z",
      } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order_number: "ozon-order", order_external_id: "site-order",
        postings: [{ request_id: 1, posting_number: "posting-1" }],
      }), { status: 200 }));
    const client = new OzonDeliveryClient({
      getClientId: () => "client", getClientSecret: () => "secret", fetchImpl,
    });
    const posting = {
      request_id: 1, shipment_method_id: 42, cutoff_at: null,
      declared_value: { amount: "1000.00", currency_code: "RUB" as const },
      dimensions: { weight_g: 500, length_mm: 300, width_mm: 200, height_mm: 100 },
    };
    const quote = await client.checkout({
      recipient: { phone_number: "+79001234567" }, postings: [posting],
      delivery: { delivery_point: { delivery_point_id: 7 } },
    });
    expect(quote.results[0]?.posting?.estimated_delivery_cost?.amount).toBe("299.00");
    const created = await client.createOrder({
      order_external_id: "site-order",
      recipient: { phone_number: "+79001234567", full_name: "Buyer" },
      delivery: { delivery_point: { delivery_point_id: 7 } },
      postings: [{ ...posting, posting_external_id: "site-order-1", description: "Toys" }],
    }, "123e4567-e89b-42d3-a456-426614174000");
    expect(created.postings[0].posting_number).toBe("posting-1");
    expect(new Headers(fetchImpl.mock.calls[2][1]?.headers).get("idempotency-key"))
      .toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  it("cancels an Ozon Delivery for Business posting", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "access-token", expires_in: Math.floor(Date.now() / 1000) + 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: true }), { status: 200 }));
    const client = new OzonDeliveryClient({
      getClientId: () => "client", getClientSecret: () => "secret", fetchImpl,
    });

    await client.cancelPosting("posting-1");
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body))).toEqual({ posting_number: "posting-1" });
  });
});
