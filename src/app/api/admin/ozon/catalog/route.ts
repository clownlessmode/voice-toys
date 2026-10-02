import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-request";
import { prisma } from "@/lib/prisma";
import { isOzonConfigured } from "@/lib/ozon/config";
import { OzonClient, OzonClientError } from "@/lib/ozon/client";
import { compareOzonCatalog } from "@/lib/ozon/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request);
  if (auth) return auth;
  if (!isOzonConfigured()) {
    return NextResponse.json({ error: "Укажите OZON_CLIENT_ID и OZON_API_KEY на сервере" }, { status: 503 });
  }
  try {
    const [products, ozon] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: {
        id: true, name: true, wbNmId: true, characteristics: { select: { key: true, value: true } },
      } }),
      new OzonClient().listProducts(),
    ]);
    return NextResponse.json(compareOzonCatalog(products, ozon), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof OzonClientError && [401, 403].includes(error.status)
        ? "Ozon отказал в доступе к каталогу. Проверьте кабинет и разрешения ключа."
        : "Не удалось получить полный каталог Ozon. Повторите сверку позже.",
    }, { status: 502 });
  }
}
