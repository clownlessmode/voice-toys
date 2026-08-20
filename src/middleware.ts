import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_AUTH_COOKIE, isValidAdminSessionCookie } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  // Проверяем, если это админ маршрут (но не страница логина)
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login")
  ) {
    // Проверяем, есть ли cookie с паролем
    const adminAuth = request.cookies.get(ADMIN_AUTH_COOKIE);

    // Если нет cookie или он неверный, перенаправляем на страницу входа
    if (!(await isValidAdminSessionCookie(adminAuth?.value))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
