import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  prepareCdekData,
  calculateDeliveryPrice,
  registerCdekOrder,
} from "../src/app/api/orders/[id]/pay/route";

// Мокаем fetchCdekToken
vi.mock("../src/app/api/cdek/offices/route", () => ({
  fetchCdekToken: vi.fn(() => Promise.resolve("mock-token")),
}));

// Мокаем fetch
global.fetch = vi.fn();

describe("CDEK Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prepare CDEK data correctly", async () => {
    // Мокаем fetch для calculateDeliveryPrice
    const mockResponse = { total_sum: 500 };
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const mockOrder = {
      id: "order-123",
      orderNumber: "2024-001",
      customerName: "Иван Иванов",
      customerPhone: "+7 (999) 123-45-67",
      deliveryAddress: "123456", // код города
      items: [
        {
          product: {
            id: "product-1",
            name: "Игрушка 1",
          },
          quantity: 2,
          price: 1000,
        },
        {
          product: {
            id: "product-2",
            name: "Игрушка 2",
          },
          quantity: 1,
          price: 1500,
        },
      ],
    };

    const cdekData = await prepareCdekData(mockOrder as any);

    expect(cdekData).toMatchObject({
      recipient: {
        name: "Иван Иванов",
        phones: [{ number: "+79991234567" }],
      },
      shipment_point: "LSG6",
      delivery_point: "123456",
      tariff_code: 136,
      packages: [
        {
          number: "2024-001",
          weight: 1500, // 2 * 500 + 1 * 500
          items: [
            {
              name: "Игрушка 1",
              ware_key: "product-1",
              cost: 1000,
              weight: 500,
              amount: 2,
              payment: { value: 0 },
            },
            {
              name: "Игрушка 2",
              ware_key: "product-2",
              cost: 1500,
              weight: 500,
              amount: 1,
              payment: { value: 0 },
            },
          ],
        },
      ],
    });
  });

  it("should calculate delivery price", async () => {
    const mockResponse = { total_sum: 500 };
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const price = await calculateDeliveryPrice(123456, 1000);

    expect(price).toBe(500);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.cdek.ru/v2/calculator/tariff",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-token",
        },
        body: JSON.stringify({
          tariff_code: 136,
          from_location: {
            address:
              "Центральная улица, 65/1, дачный посёлок Лесной Городок, Одинцовский городской округ, Московская область",
          },
          to_location: {
            code: 123456,
          },
          packages: [
            {
              weight: 1000,
            },
          ],
        }),
      })
    );
  });

  it("should register CDEK order successfully", async () => {
    const mockCdekResponse = { order_id: "cdek-order-123" };
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockCdekResponse),
    });

    const cdekData = {
      recipient: {
        name: "Иван Иванов",
        phones: [{ number: "+79991234567" }],
      },
      shipment_point: "LSG6",
      delivery_point: "123456",
      tariff_code: 136,
      packages: [
        {
          number: "2024-001",
          weight: 1000,
          items: [
            {
              name: "Игрушка",
              ware_key: "product-1",
              cost: 1000,
              weight: 500,
              amount: 1,
              payment: { value: 0 },
            },
          ],
        },
      ],
    };

    const result = await registerCdekOrder(cdekData);

    expect(result).toEqual({
      success: true,
      order: { order_id: "cdek-order-123" },
    });
  });

  it("should handle CDEK registration error", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const cdekData = {
      recipient: { name: "Test", phones: [{ number: "+79991234567" }] },
      shipment_point: "LSG6",
      delivery_point: "123456",
      tariff_code: 136,
      packages: [{ number: "test", weight: 1000, items: [] }],
    };

    const result = await registerCdekOrder(cdekData);

    expect(result).toEqual({
      success: false,
      error: "Unable to process CDEK order registration",
    });
  });
});
