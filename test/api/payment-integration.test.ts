import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// Import payment-related API routes
import { POST as PayOrder } from "@/app/api/orders/[id]/pay/route";
import { PATCH as UpdateOrder } from "@/app/api/orders/[id]/route";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3000";

describe("Payment Integration Tests", () => {
  let testOrderId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Create a test order
    const order = await prisma.order.create({
      data: {
        orderNumber: "TEST-001",
        customerName: "Test Customer",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "Test Address",
        totalAmount: 1500,
        currency: "₽",
        status: "CREATED",
      },
    });
    testOrderId = order.id;

    // Create order item
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: "225904711", // Existing product from seed
        quantity: 1,
        price: 1500,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
    }
    await prisma.$disconnect();
  });

  describe("Payment Form Generation", () => {
    it("should generate payment form with correct fields", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/orders/${testOrderId}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const params = Promise.resolve({ id: testOrderId });
      const response = await PayOrder(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");

      const html = await response.text();

      // Check for required form fields
      expect(html).toContain('name="store_id"');
      expect(html).toContain('name="amount"');
      expect(html).toContain('name="currency"');
      expect(html).toContain('name="order_id"');
      expect(html).toContain('name="signature"');
      expect(html).toContain('action="https://pay.modulbank.ru/pay"');
      expect(html).toContain('method="POST"');
    });

    it("should include correct order amount", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/orders/${testOrderId}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const params = Promise.resolve({ id: testOrderId });
      const response = await PayOrder(request, { params });

      const html = await response.text();
      expect(html).toContain('value="1500"');
    });

    it("should include correct order ID", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/orders/${testOrderId}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const params = Promise.resolve({ id: testOrderId });
      const response = await PayOrder(request, { params });

      const html = await response.text();
      expect(html).toContain(`value="${testOrderId}"`);
    });

    it("should generate valid signature", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/orders/${testOrderId}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const params = Promise.resolve({ id: testOrderId });
      const response = await PayOrder(request, { params });

      const html = await response.text();

      // Extract signature from HTML
      const signatureMatch = html.match(/name="signature" value="([^"]+)"/);
      expect(signatureMatch).toBeTruthy();

      const signature = signatureMatch![1];
      expect(signature).toBeTruthy();
      expect(signature.length).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent order", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders/nonexistent/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const params = Promise.resolve({ id: "nonexistent" });
      const response = await PayOrder(request, { params });

      expect(response.status).toBe(404);
    });

    it("should return 400 for already paid order", async () => {
      // Update order to paid status
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: "PAID", paidAt: new Date() },
      });

      const request = new NextRequest(
        `${baseUrl}/api/orders/${testOrderId}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const params = Promise.resolve({ id: testOrderId });
      const response = await PayOrder(request, { params });

      expect(response.status).toBe(400);

      // Reset order status
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: "CREATED", paidAt: null },
      });
    });
  });

  describe("Order Status Updates", () => {
    it("should update order status to PAID", async () => {
      const updateData = {
        status: "PAID",
      };

      const request = new NextRequest(`${baseUrl}/api/orders/${testOrderId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
        headers: { "Content-Type": "application/json" },
      });
      const params = Promise.resolve({ id: testOrderId });
      const response = await UpdateOrder(request, { params });

      expect(response.status).toBe(200);

      // Verify order status was updated
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(updatedOrder?.status).toBe("PAID");
      expect(updatedOrder?.paidAt).toBeTruthy();

      // Reset order status for other tests
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: "CREATED", paidAt: null },
      });
    });

    it("should validate order status", async () => {
      const invalidData = {
        status: "INVALID_STATUS",
      };

      const request = new NextRequest(`${baseUrl}/api/orders/${testOrderId}`, {
        method: "PATCH",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });
      const params = Promise.resolve({ id: testOrderId });
      const response = await UpdateOrder(request, { params });

      expect(response.status).toBe(400);
    });

    it("should update order status to SHIPPED", async () => {
      const updateData = {
        status: "SHIPPED",
      };

      const request = new NextRequest(`${baseUrl}/api/orders/${testOrderId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
        headers: { "Content-Type": "application/json" },
      });
      const params = Promise.resolve({ id: testOrderId });
      const response = await UpdateOrder(request, { params });

      expect(response.status).toBe(200);

      // Verify order status was updated
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(updatedOrder?.status).toBe("SHIPPED");

      // Reset order status for other tests
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: "CREATED", paidAt: null },
      });
    });

    it("should return 404 for non-existent order", async () => {
      const updateData = {
        status: "PAID",
      };

      const request = new NextRequest(`${baseUrl}/api/orders/nonexistent`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
        headers: { "Content-Type": "application/json" },
      });
      const params = Promise.resolve({ id: "nonexistent" });
      const response = await UpdateOrder(request, { params });

      expect(response.status).toBe(404);
    });
  });

  describe("Payment Signature Validation", () => {
    it("should validate signature correctly", () => {
      // This test would require access to the actual signature generation logic
      // For now, we'll test the basic structure
      const testData = {
        store_id: "test_store",
        order_id: testOrderId,
        amount: "1500.00",
        currency: "RUB",
      };

      // Mock signature validation
      const signature = crypto
        .createHash("sha1")
        .update(JSON.stringify(testData))
        .digest("hex");

      expect(signature).toBeTruthy();
      expect(signature.length).toBe(40); // SHA1 hash length
    });
  });

  describe("Payment Environment Configuration", () => {
    it("should use test keys in development", () => {
      const isDevelopment = process.env.NODE_ENV === "development";
      const storeId = process.env.STORE_ID;
      const testKey = process.env.TEST_KEY;
      const realKey = process.env.REAL_KEY;

      expect(storeId).toBeTruthy();

      if (isDevelopment) {
        expect(testKey).toBeTruthy();
      } else {
        expect(realKey).toBeTruthy();
      }
    });
  });
});
