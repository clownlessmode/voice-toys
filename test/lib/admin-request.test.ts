import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { assertAdmin, isAdminAuthenticatedRequest } from "@/lib/admin-request";
import { ADMIN_AUTH_COOKIE, createAdminSessionCookie } from "@/lib/admin-auth";

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-admin-pass";
process.env.ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "test-admin-session-secret";

async function createAuthenticatedRequest(): Promise<NextRequest> {
  const session = await createAdminSessionCookie();

  return new NextRequest("http://localhost/api/x", {
    headers: { cookie: `${ADMIN_AUTH_COOKIE}=${session}` },
  });
}

describe("admin-request", () => {
  it("is true when admin-auth cookie has a valid signature", async () => {
    const request = await createAuthenticatedRequest();
    await expect(isAdminAuthenticatedRequest(request)).resolves.toBe(true);
  });

  it("is false without cookie", async () => {
    const request = new NextRequest("http://localhost/api/x");
    await expect(isAdminAuthenticatedRequest(request)).resolves.toBe(false);
  });

  it("is false for wrong or empty cookie value", async () => {
    const wrong = new NextRequest("http://localhost/api/x", {
      headers: { cookie: "admin-auth=no" },
    });
    const empty = new NextRequest("http://localhost/api/x", {
      headers: { cookie: "admin-auth=" },
    });
    await expect(isAdminAuthenticatedRequest(wrong)).resolves.toBe(false);
    await expect(isAdminAuthenticatedRequest(empty)).resolves.toBe(false);
  });

  it("is true when admin-auth is set alongside other cookies", async () => {
    const session = await createAdminSessionCookie();
    const request = new NextRequest("http://localhost/api/x", {
      headers: { cookie: `foo=1; ${ADMIN_AUTH_COOKIE}=${session}; bar=2` },
    });
    await expect(isAdminAuthenticatedRequest(request)).resolves.toBe(true);
  });

  describe("assertAdmin", () => {
    it("returns null when cookie is valid", async () => {
      const request = await createAuthenticatedRequest();
      await expect(assertAdmin(request)).resolves.toBeNull();
    });

    it("returns 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost/api/x");
      const res = await assertAdmin(request);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);
      const body = (await res?.json()) as { error: string };
      expect(body.error).toBe("Unauthorized");
    });
  });
});
