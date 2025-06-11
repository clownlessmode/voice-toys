import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/orders/route";
import { GET as GetOrderById, PATCH } from "@/app/api/orders/[id]/route";
import { POST as PayOrder } from "@/app/api/orders/[id]/pay/route";
import { NextRequest } from "next/server";

describe("Orders API", () => {
  const baseUrl = "http://localhost:3000";

  describe("GET /api/orders", () => {
    it("should return orders list", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("orders");
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("page");
      expect(data).toHaveProperty("limit");
      expect(Array.isArray(data.orders)).toBe(true);
    });

    it("should filter orders by status", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders?status=PAID`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.orders.every((o: { status: string }) => o.status === "PAID")
      ).toBe(true);
    });

    it("should search orders", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders?search=2025-0001`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.orders.length > 0) {
        expect(
          data.orders.some((o: { orderNumber: string }) =>
            o.orderNumber.includes("2025-0001")
          )
        ).toBe(true);
      }
    });

    it("should respect pagination", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders?page=1&limit=3`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders.length).toBeLessThanOrEqual(3);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(3);
    });
  });

  describe("POST /api/orders", () => {
    it("should create a new order", async () => {
      const orderData = {
        customerName: "Тестовый Клиент",
        customerPhone: "+7 (999) 000-00-00",
        customerEmail: "test@example.com",
        deliveryType: "pickup",
        items: [
          { productId: "225904711", quantity: 1 },
          { productId: "225904712", quantity: 2 },
        ],
      };

      const request = new NextRequest(`${baseUrl}/api/orders`, {
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
      expect(data.items).toHaveLength(2);
      expect(data.totalAmount).toBeGreaterThan(0);
    });

    it("should validate required fields", async () => {
      const invalidData = {
        // Отсутствует customerName
        customerPhone: "+7 (999) 000-00-00",
        deliveryType: "pickup",
        items: [{ productId: "225904711", quantity: 1 }],
      };

      const request = new NextRequest(`${baseUrl}/api/orders`, {
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
        customerPhone: "+7 (999) 000-00-00",
        deliveryType: "delivery",
        // Отсутствует deliveryAddress
        items: [{ productId: "225904711", quantity: 1 }],
      };

      const request = new NextRequest(`${baseUrl}/api/orders`, {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/orders/[id]", () => {
    it("should return order details", async () => {
      // Сначала получаем список заказов чтобы взять существующий ID
      const listRequest = new NextRequest(`${baseUrl}/api/orders?limit=1`);
      const listResponse = await GET(listRequest);
      const listData = await listResponse.json();

      if (listData.orders.length > 0) {
        const orderId = listData.orders[0].id;
        const request = new NextRequest(`${baseUrl}/api/orders/${orderId}`);
        const params = Promise.resolve({ id: orderId });
        const response = await GetOrderById(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("id", orderId);
        expect(data).toHaveProperty("orderNumber");
        expect(data).toHaveProperty("customerName");
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("items");
        expect(Array.isArray(data.items)).toBe(true);
      }
    });

    it("should return 404 for non-existent order", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders/nonexistent`);
      const params = Promise.resolve({ id: "nonexistent" });
      const response = await GetOrderById(request, { params });

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/orders/[id]", () => {
    it("should update order status", async () => {
      // Получаем существующий заказ
      const listRequest = new NextRequest(
        `${baseUrl}/api/orders?limit=1&status=CREATED`
      );
      const listResponse = await GET(listRequest);
      const listData = await listResponse.json();

      if (listData.orders.length > 0) {
        const orderId = listData.orders[0].id;
        const request = new NextRequest(`${baseUrl}/api/orders/${orderId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "SHIPPED" }),
          headers: { "Content-Type": "application/json" },
        });
        const params = Promise.resolve({ id: orderId });
        const response = await PATCH(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe("SHIPPED");
      }
    });

    it("should validate status values", async () => {
      const listRequest = new NextRequest(`${baseUrl}/api/orders?limit=1`);
      const listResponse = await GET(listRequest);
      const listData = await listResponse.json();

      if (listData.orders.length > 0) {
        const orderId = listData.orders[0].id;
        const request = new NextRequest(`${baseUrl}/api/orders/${orderId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "INVALID_STATUS" }),
          headers: { "Content-Type": "application/json" },
        });
        const params = Promise.resolve({ id: orderId });
        const response = await PATCH(request, { params });

        expect(response.status).toBe(400);
      }
    });
  });

  describe("POST /api/orders/[id]/pay", () => {
    it("should mark order as paid", async () => {
      // Получаем неоплаченный заказ
      const listRequest = new NextRequest(
        `${baseUrl}/api/orders?limit=1&status=CREATED`
      );
      const listResponse = await GET(listRequest);
      const listData = await listResponse.json();

      if (listData.orders.length > 0) {
        const orderId = listData.orders[0].id;
        const request = new NextRequest(
          `${baseUrl}/api/orders/${orderId}/pay`,
          {
            method: "POST",
          }
        );
        const params = Promise.resolve({ id: orderId });
        const response = await PayOrder(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.order.status).toBe("PAID");
        expect(data.order.paidAt).toBeDefined();
      }
    });

    it("should not pay already paid order", async () => {
      // Получаем уже оплаченный заказ
      const listRequest = new NextRequest(
        `${baseUrl}/api/orders?limit=1&status=PAID`
      );
      const listResponse = await GET(listRequest);
      const listData = await listResponse.json();

      if (listData.orders.length > 0) {
        const orderId = listData.orders[0].id;
        const request = new NextRequest(
          `${baseUrl}/api/orders/${orderId}/pay`,
          {
            method: "POST",
          }
        );
        const params = Promise.resolve({ id: orderId });
        const response = await PayOrder(request, { params });

        expect(response.status).toBe(400);
      }
    });
  });
});
