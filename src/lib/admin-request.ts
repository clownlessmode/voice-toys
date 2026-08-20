import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, isValidAdminSessionCookie } from "@/lib/admin-auth";

/** True when the request carries the same admin session cookie as `/admin` routes. */
export async function isAdminAuthenticatedRequest(
  request: NextRequest
): Promise<boolean> {
  return isValidAdminSessionCookie(
    request.cookies.get(ADMIN_AUTH_COOKIE)?.value
  );
}

/**
 * @returns `NextResponse` with 401 when the request is not an authenticated admin; otherwise `null` (continue).
 */
export async function assertAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!(await isAdminAuthenticatedRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
