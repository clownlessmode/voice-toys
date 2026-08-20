import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionCookie,
  isAdminAuthConfigured,
  isValidAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!isAdminAuthConfigured()) {
      console.error("Admin auth is not configured");
      return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
    }

    if (await isValidAdminPassword(password)) {
      // Создаем ответ с установкой cookie
      const response = NextResponse.json({ success: true });
      const sessionCookie = await createAdminSessionCookie();

      // Устанавливаем cookie на 24 часа
      response.cookies.set(ADMIN_AUTH_COOKIE, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: ADMIN_SESSION_MAX_AGE_SECONDS, // 24 часа
        path: "/",
      });

      return response;
    } else {
      return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
