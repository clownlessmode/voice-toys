import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-request";
import { isOzonConfigured } from "@/lib/ozon/config";
import { OzonClient } from "@/lib/ozon/client";

export const dynamic = "force-dynamic";

const DEFAULT_TEST_PHONE = "79001234567";

export async function GET(request: NextRequest) {
  const auth = assertAdmin(request);
  if (auth) return auth;

  if (!isOzonConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ozon API is not configured. Set OZON_CLIENT_ID and OZON_API_KEY in the environment.",
      },
      { status: 503 }
    );
  }

  const phone =
    request.nextUrl.searchParams.get("phone")?.trim() || DEFAULT_TEST_PHONE;

  try {
    const client = new OzonClient();
    const result = await client.checkDelivery(phone);
    return NextResponse.json({
      ...result,
      phone,
      endpoint: "/v1/delivery/check",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ozon ping failed";
    return NextResponse.json({ ok: false, error: message, phone }, { status: 502 });
  }
}
