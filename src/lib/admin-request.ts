import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_AUTH_COOKIE = "admin-auth";
const AUTHENTICATED_VALUE = "authenticated";

/** True when the request carries the same admin session cookie as `/admin` routes. */
export function isAdminAuthenticatedRequest(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_AUTH_COOKIE)?.value === AUTHENTICATED_VALUE;
}

/**
 * @returns `NextResponse` with 401 when the request is not an authenticated admin; otherwise `null` (continue).
 */
export function assertAdmin(request: NextRequest): NextResponse | null {
  if (!isAdminAuthenticatedRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
