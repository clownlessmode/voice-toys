import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { GET, POST } from "@/app/api/products/route";
import { GET as GetProductById, DELETE } from "@/app/api/products/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

describe("Products API", () => {
  const baseUrl = "http://localhost:3000";

  describe("GET /api/products", () => {
    it("should return products list", async () => {
      const request = new NextRequest(`${baseUrl}/api/products`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("products");
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("page");
      expect(data).toHaveProperty("limit");
      expect(Array.isArray(data.products)).toBe(true);
    });

    it("should filter products by search", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products?search=бизиборд`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.products.every(
          (p: { name: string; description: string }) =>
            p.name.toLowerCase().includes("бизиборд") ||
            p.description.toLowerCase().includes("бизиборд")
        )
      ).toBe(true);
    });

    it("should filter products by type", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products?type=Интерактивные игрушки`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.products.every((p: { breadcrumbs: string[] }) =>
          p.breadcrumbs.includes("Интерактивные игрушки")
        )
      ).toBe(true);
    });

    it("should respect pagination", async () => {
      const request = new NextRequest(`${baseUrl}/api/products?page=1&limit=5`);
      const response = await GET(request);
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
      const productData = {
        name: "Тестовый бизиборд",
        breadcrumbs: [
          "Главная",
          "Каталог",
          "Интерактивные игрушки",
          "Тестовый бизиборд",
        ],
        images: ["https://example.com/test.jpg"],
        price: 1500,
        currency: "₽",
        pickupAvailability: "Самовывоз сегодня",
        deliveryAvailability: "Доставка от 1 дня",
        returnDays: 14,
        returnDetails: "Тестовый возврат",
        description: "Тестовое описание",
        characteristics: [
          { key: "Материал", value: "Дерево" },
          { key: "Возраст", value: "3+" },
        ],
      };

      const request = new NextRequest(`${baseUrl}/api/products`, {
        method: "POST",
        body: JSON.stringify(productData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data.name).toBe(productData.name);
      expect(data.price.current).toBe(productData.price);

      // Cleanup - удаляем созданный продукт
      if (data.id) {
        const deleteRequest = new NextRequest(
          `${baseUrl}/api/products/${data.id}`
        );
        const deleteParams = Promise.resolve({ id: data.id });
        await DELETE(deleteRequest, { params: deleteParams });
      }
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

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  const adminAuthCookie = "admin-auth=authenticated";

  describe("includeInactive (isActive) gating", () => {
    const inactiveName = "TEST-INACTIVE-INCLUDE-WB";
    let inactiveProductId: string;

    beforeAll(async () => {
      const created = await prisma.product.create({
        data: {
          name: inactiveName,
          isActive: false,
          description: "inactive test product",
          price: 1,
          images: JSON.stringify([]),
          breadcrumbs: JSON.stringify(["Тест"]),
          pickupAvailability: "n/a",
          deliveryAvailability: "n/a",
          returnDetails: "n/a",
          categories: JSON.stringify([]),
          ageGroups: JSON.stringify([]),
        },
      });
      inactiveProductId = created.id;
    });

    afterAll(async () => {
      if (inactiveProductId) {
        await prisma.product.deleteMany({
          where: { id: inactiveProductId },
        });
      }
    });

    it("GET /api/products: default (no includeInactive) excludes inactive products", async () => {
      const request = new NextRequest(`${baseUrl}/api/products?limit=100`);
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(
        data.products.some((p: { id: string }) => p.id === inactiveProductId)
      ).toBe(false);
    });

    it("GET /api/products: unauthenticated includeInactive=true does not list inactive", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products?includeInactive=true&limit=100`
      );
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(
        data.products.some((p: { id: string }) => p.id === inactiveProductId)
      ).toBe(false);
    });

    it("GET /api/products: admin cookie + includeInactive=true includes inactive", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products?includeInactive=true&limit=100`,
        { headers: { cookie: adminAuthCookie } }
      );
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      const match = data.products.find(
        (p: { id: string }) => p.id === inactiveProductId
      );
      expect(match).toBeDefined();
      expect(match.name).toBe(inactiveName);
    });

    it("GET /api/products/[id]: unauthenticated includeInactive=true returns 404 for inactive", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products/${inactiveProductId}?includeInactive=true`
      );
      const params = Promise.resolve({ id: inactiveProductId });
      const response = await GetProductById(request, { params });
      expect(response.status).toBe(404);
    });

    it("GET /api/products/[id]: admin cookie + includeInactive=true returns inactive", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products/${inactiveProductId}?includeInactive=true`,
        { headers: { cookie: adminAuthCookie } }
      );
      const params = Promise.resolve({ id: inactiveProductId });
      const response = await GetProductById(request, { params });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.id).toBe(inactiveProductId);
      expect(data.name).toBe(inactiveName);
    });
  });
});
