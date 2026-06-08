import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { assertAdmin, isAdminAuthenticatedRequest } from "@/lib/admin-request";

describe("admin-request", () => {
  it("is true when admin-auth cookie matches middleware", () => {
    const request = new NextRequest("http://localhost/api/x", {
      headers: { cookie: "admin-auth=authenticated" },
    });
    expect(isAdminAuthenticatedRequest(request)).toBe(true);
  });

  it("is false without cookie", () => {
    const request = new NextRequest("http://localhost/api/x");
    expect(isAdminAuthenticatedRequest(request)).toBe(false);
  });

  it("is false for wrong or empty cookie value", () => {
    const wrong = new NextRequest("http://localhost/api/x", {
      headers: { cookie: "admin-auth=no" },
    });
    const empty = new NextRequest("http://localhost/api/x", {
      headers: { cookie: "admin-auth=" },
    });
    expect(isAdminAuthenticatedRequest(wrong)).toBe(false);
    expect(isAdminAuthenticatedRequest(empty)).toBe(false);
  });

  it("is true when admin-auth is set alongside other cookies", () => {
    const request = new NextRequest("http://localhost/api/x", {
      headers: { cookie: "foo=1; admin-auth=authenticated; bar=2" },
    });
    expect(isAdminAuthenticatedRequest(request)).toBe(true);
  });

  describe("assertAdmin", () => {
    it("returns null when cookie is valid", () => {
      const request = new NextRequest("http://localhost/api/x", {
        headers: { cookie: "admin-auth=authenticated" },
      });
      expect(assertAdmin(request)).toBeNull();
    });

    it("returns 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost/api/x");
      const res = assertAdmin(request);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);
      const body = (await res?.json()) as { error: string };
      expect(body.error).toBe("Unauthorized");
    });
  });
});
