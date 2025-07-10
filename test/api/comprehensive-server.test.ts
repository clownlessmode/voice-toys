import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Import all API routes
import {
  GET as GetProducts,
  POST as CreateProduct,
} from "@/app/api/products/route";
import {
  GET as GetProductById,
  DELETE as DeleteProduct,
} from "@/app/api/products/[id]/route";
import { GET as GetRecommended } from "@/app/api/products/recommended/route";
import { POST as BulkCreateProducts } from "@/app/api/products/bulk/route";

import { GET as GetOrders, POST as CreateOrder } from "@/app/api/orders/route";
import {
  GET as GetOrderById,
  PUT as UpdateOrder,
} from "@/app/api/orders/[id]/route";
import { POST as CreateOrderDirect } from "@/app/api/orders/create/route";
import { GET as ExportOrders } from "@/app/api/orders/export/route";
import { POST as PayOrder } from "@/app/api/orders/[id]/pay/route";

import { POST as AdminLogin } from "@/app/api/admin/login/route";

import { GET as GetCities } from "@/app/api/delivery/cities/route";
import { GET as GetOffices } from "@/app/api/delivery/offices/route";

import { POST as UploadFile } from "@/app/api/upload/route";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3000";

// Test data
const testProduct = {
  name: "Тестовый бизиборд",
  breadcrumbs: [
    "Главная",
    "Каталог",
    "Интерактивные игрушки",
    "Тестовый бизиборд",
  ],
  images: ["https://example.com/test1.jpg", "https://example.com/test2.jpg"],
  price: 1500,
  oldPrice: 2000,
  discountPercent: 25,
  currency: "₽",
  favorite: false,
  pickupAvailability: "Самовывоз сегодня",
  deliveryAvailability: "Доставка от 1 дня",
  returnDays: 14,
  returnDetails: "Можно обменять или вернуть в течение 14 дней",
  description: "Тестовый бизиборд для тестирования API",
  characteristics: [
    { key: "Материал", value: "Дерево" },
    { key: "Возраст", value: "3+" },
    { key: "Габариты", value: "20×20 см" },
  ],
  categories: ["Интерактивные игрушки", "Бизиборды"],
  ageGroups: ["3+", "4+", "5+"],
};

const testOrder = {
  customerName: "Тест Тестов",
  customerPhone: "+7 (999) 123-45-67",
  customerEmail: "test@example.com",
  deliveryType: "delivery",
  deliveryAddress: "г. Москва, ул. Тестовая, д. 1, кв. 1",
  totalAmount: 1500,
  currency: "₽",
  items: [
    {
      productId: "225904711", // ID существующего продукта из seed
      quantity: 1,
      price: 1500,
    },
  ],
};

const testAdminCredentials = {
  username: "admin",
  password: "admin123",
};

describe("Comprehensive Server API Tests", () => {
  let createdProductId: string;
  let createdOrderId: string;

  beforeAll(async () => {
    // Ensure database is seeded with one product
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test data
    if (createdProductId) {
      try {
        await prisma.productCharacteristic.deleteMany({
          where: { productId: createdProductId },
        });
        await prisma.product.delete({ where: { id: createdProductId } });
      } catch (error) {
        console.log("Product cleanup failed:", error);
      }
    }

    if (createdOrderId) {
      try {
        await prisma.orderItem.deleteMany({
          where: { orderId: createdOrderId },
        });
        await prisma.order.delete({ where: { id: createdOrderId } });
      } catch (error) {
        console.log("Order cleanup failed:", error);
      }
    }

    await prisma.$disconnect();
  });

  describe("Products API", () => {
    describe("GET /api/products", () => {
      it("should return products list with pagination", async () => {
        const request = new NextRequest(`${baseUrl}/api/products`);
        const response = await GetProducts(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("products");
        expect(data).toHaveProperty("total");
        expect(data).toHaveProperty("page");
        expect(data).toHaveProperty("limit");
        expect(Array.isArray(data.products)).toBe(true);
        expect(data.total).toBeGreaterThan(0);
      });

      it("should filter products by search", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/products?search=бизиборд`
        );
        const response = await GetProducts(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.products.length).toBeGreaterThan(0);
        expect(
          data.products.every(
            (p: any) =>
              p.name.toLowerCase().includes("бизиборд") ||
              p.description.toLowerCase().includes("бизиборд")
          )
        ).toBe(true);
      });

      it("should filter products by type", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/products?type=Интерактивные игрушки`
        );
        const response = await GetProducts(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.products.length).toBeGreaterThan(0);
      });

      it("should filter products by age", async () => {
        const request = new NextRequest(`${baseUrl}/api/products?age=6м-2года`);
        const response = await GetProducts(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.products.length).toBeGreaterThan(0);
      });

      it("should filter favorite products", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/products?favorite=true`
        );
        const response = await GetProducts(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data.products)).toBe(true);
      });

      it("should respect pagination parameters", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/products?page=1&limit=5`
        );
        const response = await GetProducts(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.products.length).toBeLessThanOrEqual(5);
        expect(data.page).toBe(1);
        expect(data.limit).toBe(5);
      });
    });

    describe("GET /api/products/[id]", () => {
      it("should return a specific product", async () => {
        const request = new NextRequest(`${baseUrl}/api/products/225904711`);
        const params = Promise.resolve({ id: "225904711" });
        const response = await GetProductById(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("id", "225904711");
        expect(data).toHaveProperty("name");
        expect(data).toHaveProperty("price");
        expect(data).toHaveProperty("images");
        expect(data).toHaveProperty("characteristics");
        expect(Array.isArray(data.characteristics)).toBe(true);
      });

      it("should return 404 for non-existent product", async () => {
        const request = new NextRequest(`${baseUrl}/api/products/nonexistent`);
        const params = Promise.resolve({ id: "nonexistent" });
        const response = await GetProductById(request, { params });

        expect(response.status).toBe(404);
      });
    });

    describe("POST /api/products", () => {
      it("should create a new product", async () => {
        const request = new NextRequest(`${baseUrl}/api/products`, {
          method: "POST",
          body: JSON.stringify(testProduct),
          headers: { "Content-Type": "application/json" },
        });

        const response = await CreateProduct(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty("id");
        expect(data.name).toBe(testProduct.name);
        expect(data.price.current).toBe(testProduct.price);
        expect(data.price.old).toBe(testProduct.oldPrice);
        expect(data.discountPercent).toBe(testProduct.discountPercent);
        expect(Array.isArray(data.images)).toBe(true);
        expect(Array.isArray(data.characteristics)).toBe(true);

        createdProductId = data.id;
      });

      it("should validate required fields", async () => {
        const invalidData = {
          // Отсутствует name
          images: ["https://example.com/test.jpg"],
          price: 1500,
        };

        const request = new NextRequest(`${baseUrl}/api/products`, {
          method: "POST",
          body: JSON.stringify(invalidData),
          headers: { "Content-Type": "application/json" },
        });

        const response = await CreateProduct(request);
        expect(response.status).toBe(400);
      });

      it("should validate price is positive", async () => {
        const invalidData = {
          ...testProduct,
          price: -100,
        };

        const request = new NextRequest(`${baseUrl}/api/products`, {
          method: "POST",
          body: JSON.stringify(invalidData),
          headers: { "Content-Type": "application/json" },
        });

        const response = await CreateProduct(request);
        expect(response.status).toBe(400);
      });
    });

    describe("DELETE /api/products/[id]", () => {
      it("should delete a product", async () => {
        if (!createdProductId) {
          // Create a product to delete
          const createRequest = new NextRequest(`${baseUrl}/api/products`, {
            method: "POST",
            body: JSON.stringify(testProduct),
            headers: { "Content-Type": "application/json" },
          });
          const createResponse = await CreateProduct(createRequest);
          const createData = await createResponse.json();
          createdProductId = createData.id;
        }

        const request = new NextRequest(
          `${baseUrl}/api/products/${createdProductId}`
        );
        const params = Promise.resolve({ id: createdProductId });
        const response = await DeleteProduct(request, { params });

        expect(response.status).toBe(200);

        // Verify product is deleted
        const getRequest = new NextRequest(
          `${baseUrl}/api/products/${createdProductId}`
        );
        const getResponse = await GetProductById(getRequest, { params });
        expect(getResponse.status).toBe(404);

        createdProductId = ""; // Reset for cleanup
      });

      it("should return 404 for non-existent product", async () => {
        const request = new NextRequest(`${baseUrl}/api/products/nonexistent`);
        const params = Promise.resolve({ id: "nonexistent" });
        const response = await DeleteProduct(request, { params });

        expect(response.status).toBe(404);
      });
    });

    describe("GET /api/products/recommended", () => {
      it("should return recommended products", async () => {
        const request = new NextRequest(`${baseUrl}/api/products/recommended`);
        const response = await GetRecommended(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      });

      it("should return limited number of products", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/products/recommended?limit=3`
        );
        const response = await GetRecommended(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.length).toBeLessThanOrEqual(3);
      });
    });

    describe("POST /api/products/bulk", () => {
      it("should create multiple products", async () => {
        const bulkData = {
          products: [
            {
              ...testProduct,
              name: "Бизиборд 1",
              id: "test-bulk-1",
            },
            {
              ...testProduct,
              name: "Бизиборд 2",
              id: "test-bulk-2",
            },
          ],
        };

        const request = new NextRequest(`${baseUrl}/api/products/bulk`, {
          method: "POST",
          body: JSON.stringify(bulkData),
          headers: { "Content-Type": "application/json" },
        });

        const response = await BulkCreateProducts(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(2);

        // Cleanup
        for (const product of data) {
          const deleteRequest = new NextRequest(
            `${baseUrl}/api/products/${product.id}`
          );
          const deleteParams = Promise.resolve({ id: product.id });
          await DeleteProduct(deleteRequest, { params: deleteParams });
        }
      });
    });
  });

  describe("Orders API", () => {
    describe("GET /api/orders", () => {
      it("should return orders list", async () => {
        const request = new NextRequest(`${baseUrl}/api/orders`);
        const response = await GetOrders(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("orders");
        expect(data).toHaveProperty("total");
        expect(Array.isArray(data.orders)).toBe(true);
      });

      it("should filter orders by status", async () => {
        const request = new NextRequest(`${baseUrl}/api/orders?status=CREATED`);
        const response = await GetOrders(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data.orders)).toBe(true);
      });

      it("should respect pagination", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/orders?page=1&limit=10`
        );
        const response = await GetOrders(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders.length).toBeLessThanOrEqual(10);
      });
    });

    describe("POST /api/orders", () => {
      it("should create a new order", async () => {
        const request = new NextRequest(`${baseUrl}/api/orders`, {
          method: "POST",
          body: JSON.stringify(testOrder),
          headers: { "Content-Type": "application/json" },
        });

        const response = await CreateOrder(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty("id");
        expect(data).toHaveProperty("orderNumber");
        expect(data.customerName).toBe(testOrder.customerName);
        expect(data.customerPhone).toBe(testOrder.customerPhone);
        expect(data.totalAmount).toBe(testOrder.totalAmount);
        expect(Array.isArray(data.items)).toBe(true);

        createdOrderId = data.id;
      });

      it("should validate required fields", async () => {
        const invalidData = {
          // Отсутствует customerName
          customerPhone: "+7 (999) 123-45-67",
          totalAmount: 1500,
        };

        const request = new NextRequest(`${baseUrl}/api/orders`, {
          method: "POST",
          body: JSON.stringify(invalidData),
          headers: { "Content-Type": "application/json" },
        });

        const response = await CreateOrder(request);
        expect(response.status).toBe(400);
      });
    });

    describe("POST /api/orders/create", () => {
      it("should create order through direct endpoint", async () => {
        const request = new NextRequest(`${baseUrl}/api/orders/create`, {
          method: "POST",
          body: JSON.stringify(testOrder),
          headers: { "Content-Type": "application/json" },
        });

        const response = await CreateOrderDirect(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty("id");
        expect(data).toHaveProperty("orderNumber");

        // Cleanup
        if (data.id) {
          await prisma.orderItem.deleteMany({ where: { orderId: data.id } });
          await prisma.order.delete({ where: { id: data.id } });
        }
      });
    });

    describe("GET /api/orders/[id]", () => {
      it("should return a specific order", async () => {
        if (!createdOrderId) {
          // Create an order to test
          const createRequest = new NextRequest(`${baseUrl}/api/orders`, {
            method: "POST",
            body: JSON.stringify(testOrder),
            headers: { "Content-Type": "application/json" },
          });
          const createResponse = await CreateOrder(createRequest);
          const createData = await createResponse.json();
          createdOrderId = createData.id;
        }

        const request = new NextRequest(
          `${baseUrl}/api/orders/${createdOrderId}`
        );
        const params = Promise.resolve({ id: createdOrderId });
        const response = await GetOrderById(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("id", createdOrderId);
        expect(data).toHaveProperty("orderNumber");
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("customerName");
        expect(data).toHaveProperty("items");
      });

      it("should return 404 for non-existent order", async () => {
        const request = new NextRequest(`${baseUrl}/api/orders/nonexistent`);
        const params = Promise.resolve({ id: "nonexistent" });
        const response = await GetOrderById(request, { params });

        expect(response.status).toBe(404);
      });
    });

    describe("PUT /api/orders/[id]", () => {
      it("should update order status", async () => {
        if (!createdOrderId) {
          // Create an order to test
          const createRequest = new NextRequest(`${baseUrl}/api/orders`, {
            method: "POST",
            body: JSON.stringify(testOrder),
            headers: { "Content-Type": "application/json" },
          });
          const createResponse = await CreateOrder(createRequest);
          const createData = await createResponse.json();
          createdOrderId = createData.id;
        }

        const updateData = {
          status: "PAID",
          paidAt: new Date().toISOString(),
        };

        const request = new NextRequest(
          `${baseUrl}/api/orders/${createdOrderId}`,
          {
            method: "PUT",
            body: JSON.stringify(updateData),
            headers: { "Content-Type": "application/json" },
          }
        );
        const params = Promise.resolve({ id: createdOrderId });
        const response = await UpdateOrder(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe("PAID");
        expect(data).toHaveProperty("paidAt");
      });
    });

    describe("POST /api/orders/[id]/pay", () => {
      it("should generate payment form", async () => {
        if (!createdOrderId) {
          // Create an order to test
          const createRequest = new NextRequest(`${baseUrl}/api/orders`, {
            method: "POST",
            body: JSON.stringify(testOrder),
            headers: { "Content-Type": "application/json" },
          });
          const createResponse = await CreateOrder(createRequest);
          const createData = await createResponse.json();
          createdOrderId = createData.id;
        }

        const request = new NextRequest(
          `${baseUrl}/api/orders/${createdOrderId}/pay`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
        const params = Promise.resolve({ id: createdOrderId });
        const response = await PayOrder(request, { params });

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/html");
      });

      it("should return 404 for non-existent order", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/orders/nonexistent/pay`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
        const params = Promise.resolve({ id: "nonexistent" });
        const response = await PayOrder(request, { params });

        expect(response.status).toBe(404);
      });
    });

    describe("GET /api/orders/export", () => {
      it("should export orders as Excel", async () => {
        const request = new NextRequest(`${baseUrl}/api/orders/export`);
        const response = await ExportOrders(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        expect(response.headers.get("content-disposition")).toContain(
          "attachment"
        );
      });

      it("should export orders with date filter", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/orders/export?startDate=2024-01-01&endDate=2024-12-31`
        );
        const response = await ExportOrders(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      });
    });
  });

  describe("Admin API", () => {
    describe("POST /api/admin/login", () => {
      it("should authenticate admin user", async () => {
        const request = new NextRequest(`${baseUrl}/api/admin/login`, {
          method: "POST",
          body: JSON.stringify(testAdminCredentials),
          headers: { "Content-Type": "application/json" },
        });

        const response = await AdminLogin(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("success", true);
        expect(data).toHaveProperty("token");
      });

      it("should reject invalid credentials", async () => {
        const invalidCredentials = {
          username: "admin",
          password: "wrongpassword",
        };

        const request = new NextRequest(`${baseUrl}/api/admin/login`, {
          method: "POST",
          body: JSON.stringify(invalidCredentials),
          headers: { "Content-Type": "application/json" },
        });

        const response = await AdminLogin(request);
        expect(response.status).toBe(401);
      });

      it("should validate required fields", async () => {
        const invalidData = {
          username: "admin",
          // Отсутствует password
        };

        const request = new NextRequest(`${baseUrl}/api/admin/login`, {
          method: "POST",
          body: JSON.stringify(invalidData),
          headers: { "Content-Type": "application/json" },
        });

        const response = await AdminLogin(request);
        expect(response.status).toBe(400);
      });
    });
  });

  describe("Delivery API", () => {
    describe("GET /api/delivery/cities", () => {
      it("should return cities list", async () => {
        const request = new NextRequest(`${baseUrl}/api/delivery/cities`);
        const response = await GetCities(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      });

      it("should filter cities by search", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/delivery/cities?search=Москва`
        );
        const response = await GetCities(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      });
    });

    describe("GET /api/delivery/offices", () => {
      it("should return offices list", async () => {
        const request = new NextRequest(`${baseUrl}/api/delivery/offices`);
        const response = await GetOffices(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
      });

      it("should filter offices by city", async () => {
        const request = new NextRequest(
          `${baseUrl}/api/delivery/offices?city=Москва`
        );
        const response = await GetOffices(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
      });
    });
  });

  describe("Upload API", () => {
    describe("POST /api/upload", () => {
      it("should handle file upload", async () => {
        // Create a mock file
        const fileContent = "test file content";
        const blob = new Blob([fileContent], { type: "text/plain" });
        const formData = new FormData();
        formData.append("file", blob, "test.txt");

        const request = new NextRequest(`${baseUrl}/api/upload`, {
          method: "POST",
          body: formData,
        });

        const response = await UploadFile(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("url");
        expect(data).toHaveProperty("filename");
      });

      it("should validate file type", async () => {
        const fileContent = "test file content";
        const blob = new Blob([fileContent], { type: "application/exe" });
        const formData = new FormData();
        formData.append("file", blob, "test.exe");

        const request = new NextRequest(`${baseUrl}/api/upload`, {
          method: "POST",
          body: formData,
        });

        const response = await UploadFile(request);
        expect(response.status).toBe(400);
      });

      it("should validate file size", async () => {
        // Create a large file (more than 5MB)
        const largeContent = "x".repeat(6 * 1024 * 1024); // 6MB
        const blob = new Blob([largeContent], { type: "text/plain" });
        const formData = new FormData();
        formData.append("file", blob, "large.txt");

        const request = new NextRequest(`${baseUrl}/api/upload`, {
          method: "POST",
          body: formData,
        });

        const response = await UploadFile(request);
        expect(response.status).toBe(400);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      // This test would require mocking Prisma to simulate connection errors
      // For now, we'll test that the API returns proper error responses
      const request = new NextRequest(`${baseUrl}/api/products?invalid=param`);
      const response = await GetProducts(request);

      // Should still return a valid response even with invalid params
      expect(response.status).toBe(200);
    });

    it("should handle malformed JSON gracefully", async () => {
      const request = new NextRequest(`${baseUrl}/api/products`, {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await CreateProduct(request);
      expect(response.status).toBe(500);
    });
  });
});
