import { describe, it, expect, vi, afterEach } from "vitest";
import {
  OzonClient,
  normalizeOzonClientPhone,
  OzonClientError,
} from "@/lib/ozon/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ozon/client", () => {
  describe("normalizeOzonClientPhone", () => {
    it("normalizes +7 (900) 123-45-67 to 79001234567", () => {
      expect(normalizeOzonClientPhone("+7 (900) 123-45-67")).toBe("79001234567");
    });

    it("rejects too short numbers", () => {
      expect(() => normalizeOzonClientPhone("900")).toThrow(/Invalid phone/);
    });
  });

  describe("OzonClient.checkDelivery", () => {
    it("returns isPossible when API responds 200", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ is_possible: true }), { status: 200 })
      );
      const client = new OzonClient({
        getClientId: () => "client-id",
        getApiKey: () => "api-key",
        fetchImpl,
      });

      const result = await client.checkDelivery("79001234567");
      expect(result.ok).toBe(true);
      expect(result.isPossible).toBe(true);
      expect(fetchImpl).toHaveBeenCalledWith(
        "https://api-seller.ozon.ru/v1/delivery/check",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ client_phone: "79001234567" }),
        })
      );
    });

    it("returns ok:false on HTTP error without throwing", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 5,
            message: "Invalid Api-Key, please check the key and try again",
          }),
          { status: 404 }
        )
      );
      const client = new OzonClient({
        getClientId: () => "client-id",
        getApiKey: () => "bad-key",
        fetchImpl,
      });

      const result = await client.checkDelivery("79001234567");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.bodyTextPreview).toMatch(/Invalid Api-Key/);
    });

    it("request throws OzonClientError with details", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        new Response("forbidden", { status: 403 })
      );
      const client = new OzonClient({
        getClientId: () => "client-id",
        getApiKey: () => "api-key",
        fetchImpl,
      });

      await expect(
        client.request("/v1/roles", {}, "roles")
      ).rejects.toBeInstanceOf(OzonClientError);
    });
  });
});
