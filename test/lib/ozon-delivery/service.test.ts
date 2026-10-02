import { describe, expect, it, vi } from "vitest";
import {
  buildOzonParcel,
  quoteOzonDelivery,
  createOzonDeliveryOrder,
} from "@/lib/ozon-delivery/service";

const products = [{
  id: "toy", name: "Toy", price: 1000,
  characteristics: [
    { key: "Вес", value: "0.4 кг" }, { key: "Длина", value: "30 см" },
    { key: "Ширина", value: "20 см" }, { key: "Высота", value: "10 см" },
  ],
}];

describe("Ozon Delivery service", () => {
  it("builds one conservative parcel from trusted product data", () => {
    expect(buildOzonParcel(products, [{ productId: "toy", quantity: 2 }], 1800)).toEqual({
      requestId: 1,
      declaredValue: "1800.00",
      dimensions: { weight_g: 800, length_mm: 300, width_mm: 200, height_mm: 200 },
      description: "Toy × 2",
    });
  });

  it("quotes delivery and includes delivery plus insurance", async () => {
    const client = {
      checkout: vi.fn().mockResolvedValue({ results: [{ request_id: 1, posting: {
        estimated_delivery_cost: { amount: "299.50", currency_code: "RUB" },
        estimated_insurance_cost: { amount: "10.50", currency_code: "RUB" },
        estimated_delivery_days: 3, cutoff_at: "2030-01-01T12:00:00Z",
      } }] }),
      getDeliveryPoints: vi.fn().mockResolvedValue([{
        delivery_point_id: 7, name: "Ozon", full_address: "Москва, улица 1",
        type: "PVZ", is_active: true,
      }]),
    };
    await expect(quoteOzonDelivery({
      client: client as never, phone: "+79001234567", deliveryPointId: 7,
      shipmentMethodId: 42, products, items: [{ productId: "toy", quantity: 2 }],
      declaredValueRub: 1800,
    })).resolves.toMatchObject({
      deliveryPointId: 7, shipmentMethodId: 42, address: "Москва, улица 1",
      deliveryCost: 310, estimatedDeliveryDays: 3,
    });
  });

  it("rejects an inactive point or a provider-level quote error", async () => {
    const inactive = {
      getDeliveryPoints: vi.fn().mockResolvedValue([{ delivery_point_id: 7, name: "x", full_address: "x", type: "PVZ", is_active: false }]),
      checkout: vi.fn(),
    };
    await expect(quoteOzonDelivery({
      client: inactive as never, phone: "+79001234567", deliveryPointId: 7,
      shipmentMethodId: 42, products, items: [{ productId: "toy", quantity: 1 }], declaredValueRub: 1000,
    })).rejects.toThrow(/inactive/i);

    const providerError = {
      getDeliveryPoints: vi.fn().mockResolvedValue([{ delivery_point_id: 7, name: "x", full_address: "x", type: "PVZ", is_active: true }]),
      checkout: vi.fn().mockResolvedValue({ results: [{ request_id: 1, error: { code: "UNAVAILABLE" } }] }),
    };
    await expect(quoteOzonDelivery({
      client: providerError as never, phone: "+79001234567", deliveryPointId: 7,
      shipmentMethodId: 42, products, items: [{ productId: "toy", quantity: 1 }], declaredValueRub: 1000,
    })).rejects.toThrow(/unavailable/i);
  });

  it("creates a provider order with the persisted quote and idempotency key", async () => {
    const client = { createOrder: vi.fn().mockResolvedValue({
      order_number: "ozon-order", postings: [{ request_id: 1, posting_number: "posting-1" }],
    }) };
    const result = await createOzonDeliveryOrder({
      client: client as never,
      order: {
        id: "site-order", orderNumber: "2026-1", customerName: "Buyer",
        customerPhone: "+79001234567", totalAmount: 2110, deliveryCost: 310,
        ozonDeliveryPointId: "7", ozonShipmentMethodId: "42",
        ozonCutoffAt: "2030-01-01T12:00:00Z",
        ozonIdempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
        items: [{ productId: "toy", quantity: 2, price: 1000, product: products[0] }],
      },
    });
    expect(result).toEqual({ orderNumber: "ozon-order", postingNumber: "posting-1" });
    expect(client.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      order_external_id: "site-order",
      delivery: { delivery_point: { delivery_point_id: 7 } },
      postings: [expect.objectContaining({ cutoff_at: null })],
    }), "123e4567-e89b-42d3-a456-426614174000");
  });
});
