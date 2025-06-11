import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Проверяем, если это админ маршрут (но не страница логина)
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login")
  ) {
    // Проверяем, есть ли cookie с паролем
    const adminAuth = request.cookies.get("admin-auth");

    // Если нет cookie или он неверный, перенаправляем на страницу входа
    if (!adminAuth || adminAuth.value !== "authenticated") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
