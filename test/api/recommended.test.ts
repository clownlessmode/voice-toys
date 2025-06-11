import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/products/recommended/route";
import { NextRequest } from "next/server";

describe("Recommended Products API", () => {
  const baseUrl = "http://localhost:3000";

  describe("GET /api/products/recommended", () => {
    it("should return recommended products", async () => {
      const request = new NextRequest(`${baseUrl}/api/products/recommended`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("products");
      expect(data).toHaveProperty("total");
      expect(Array.isArray(data.products)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products/recommended?limit=3`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.length).toBeLessThanOrEqual(3);
    });

    it("should include hit information in products", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products/recommended?limit=5`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.products.length > 0) {
        const product = data.products[0];
        expect(product).toHaveProperty("totalSold");
        expect(product).toHaveProperty("isHit");
        expect(typeof product.totalSold).toBe("number");
        expect(typeof product.isHit).toBe("boolean");
      }
    });

    it("should have proper product structure", async () => {
      const request = new NextRequest(
        `${baseUrl}/api/products/recommended?limit=1`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.products.length > 0) {
        const product = data.products[0];
        expect(product).toHaveProperty("id");
        expect(product).toHaveProperty("name");
        expect(product).toHaveProperty("price");
        expect(product).toHaveProperty("images");
        expect(product.price).toHaveProperty("current");
        expect(product.price).toHaveProperty("currency");
        expect(Array.isArray(product.images)).toBe(true);
      }
    });
  });
});
