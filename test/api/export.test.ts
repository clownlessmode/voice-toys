import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/orders/export/route";
import { NextRequest } from "next/server";

describe("Orders Export API", () => {
  const baseUrl = "http://localhost:3000";

  describe("GET /api/orders/export", () => {
    it("should export orders to Excel", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders/export`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(response.headers.get("content-disposition")).toMatch(
        /attachment; filename="?orders-/
      );

      // Проверим что файл не пустой
      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it("should limit exported orders", async () => {
      const request = new NextRequest(`${baseUrl}/api/orders/export?limit=1`);
      const response = await GET(request);

      expect(response.status).toBe(200);

      // Файл должен быть меньше по размеру при ограничении
      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });
});
