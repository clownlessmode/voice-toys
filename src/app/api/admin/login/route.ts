import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = "123456";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      // Создаем ответ с установкой cookie
      const response = NextResponse.json({ success: true });

      // Устанавливаем cookie на 24 часа
      response.cookies.set("admin-auth", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 часа
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
