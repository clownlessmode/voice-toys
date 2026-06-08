import { describe, it, expect, afterEach, vi } from "vitest";
import { getWbContentToken, getWbSyncCronSecret } from "@/lib/wb/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("wb/config", () => {
  describe("getWbContentToken", () => {
    it("throws with a clear message when all token env vars are missing", () => {
      vi.stubEnv("WILDBERRIES_CONTENT_API_TOKEN", "");
      vi.stubEnv("WB_API_TOKEN", "");
      vi.stubEnv("WB_API_KEY", "");

      expect(() => getWbContentToken()).toThrow(
        "Missing Wildberries API token. Set WILDBERRIES_CONTENT_API_TOKEN (or WB_API_TOKEN or WB_API_KEY) in the environment."
      );
    });

    it("throws when all token env vars are whitespace-only", () => {
      vi.stubEnv("WILDBERRIES_CONTENT_API_TOKEN", "  \t  ");
      vi.stubEnv("WB_API_TOKEN", "   ");
      vi.stubEnv("WB_API_KEY", "  ");

      expect(() => getWbContentToken()).toThrow(/Missing Wildberries API token/);
    });

    it("returns WILDBERRIES_CONTENT_API_TOKEN when set (trimmed)", () => {
      vi.stubEnv("WILDBERRIES_CONTENT_API_TOKEN", "  primary-token  ");
      vi.stubEnv("WB_API_TOKEN", "other");
      vi.stubEnv("WB_API_KEY", "key-other");

      expect(getWbContentToken()).toBe("primary-token");
    });

    it("falls back to WB_API_TOKEN when primary is empty", () => {
      vi.stubEnv("WILDBERRIES_CONTENT_API_TOKEN", "");
      vi.stubEnv("WB_API_TOKEN", "  fallback-token  ");
      vi.stubEnv("WB_API_KEY", "key-should-not-win");

      expect(getWbContentToken()).toBe("fallback-token");
    });

    it("falls back to WB_API_KEY when primary and WB_API_TOKEN are empty", () => {
      vi.stubEnv("WILDBERRIES_CONTENT_API_TOKEN", "");
      vi.stubEnv("WB_API_TOKEN", "");
      vi.stubEnv("WB_API_KEY", "  key-token  ");

      expect(getWbContentToken()).toBe("key-token");
    });
  });

  describe("getWbSyncCronSecret", () => {
    it("returns undefined when unset or empty", () => {
      vi.stubEnv("WB_SYNC_CRON_SECRET", "");
      expect(getWbSyncCronSecret()).toBeUndefined();
    });

    it("returns trimmed secret when set", () => {
      vi.stubEnv("WB_SYNC_CRON_SECRET", "  cron-secret  ");
      expect(getWbSyncCronSecret()).toBe("cron-secret");
    });
  });
});
