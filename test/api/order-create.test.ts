import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/orders/create/route";
import { NextRequest } from "next/server";

describe("Order Create API", () => {
  const baseUrl = "http://localhost:3000";

  describe("POST /api/orders/create", () => {
    it("should create order with cash on delivery", async () => {
      const orderData = {
        customerName: "Тестовый Клиент",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test@example.com",
        deliveryType: "pickup",
        paymentType: "cash_on_delivery",
        items: [
          { productId: "225904711", quantity: 1 },
          { productId: "225904712", quantity: 2 },
        ],
      };

      const request = new NextRequest(`${baseUrl}/api/orders/create`, {
        method: "POST",
        body: JSON.stringify(orderData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("orderNumber");
      expect(data.customerName).toBe(orderData.customerName);
      expect(data.status).toBe("CREATED");
    });

    it("should create order with online payment", async () => {
      const orderData = {
        customerName: "Тестовый Клиент 2",
        customerPhone: "+7 (999) 123-45-68",
        customerEmail: "test2@example.com",
        deliveryType: "delivery",
        deliveryAddress: "Тестовый адрес, д. 123",
        paymentType: "online",
        items: [{ productId: "225904711", quantity: 1 }],
      };

      const request = new NextRequest(`${baseUrl}/api/orders/create`, {
        method: "POST",
        body: JSON.stringify(orderData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data.deliveryType).toBe("delivery");
      expect(data.deliveryAddress).toBe(orderData.deliveryAddress);
    });

    it("should validate required fields", async () => {
      const invalidData = {
        // Отсутствует customerName
        customerPhone: "+7 (999) 123-45-67",
        deliveryType: "pickup",
        items: [{ productId: "225904711", quantity: 1 }],
      };

      const request = new NextRequest(`${baseUrl}/api/orders/create`, {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should validate delivery address for delivery type", async () => {
      const invalidData = {
        customerName: "Тестовый Клиент",
        customerPhone: "+7 (999) 123-45-67",
        deliveryType: "delivery",
        // Отсутствует deliveryAddress
        items: [{ productId: "225904711", quantity: 1 }],
      };

      const request = new NextRequest(`${baseUrl}/api/orders/create`, {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
