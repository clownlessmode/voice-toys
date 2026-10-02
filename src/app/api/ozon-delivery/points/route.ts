import { NextRequest, NextResponse } from "next/server";
import { isOzonDeliveryConfigured } from "@/lib/ozon-delivery/config";
import { getOzonDeliveryClient, OzonDeliveryError } from "@/lib/ozon-delivery/client";
import { extractOzonPointCity } from "@/lib/ozon-delivery/point-city";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isOzonDeliveryConfigured()) {
    return NextResponse.json({ error: "Ozon Доставка не настроена" }, { status: 503 });
  }
  const cursorParam = request.nextUrl.searchParams.get("cursor");
  const cursor = cursorParam?.trim() || null;
  const parsedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  if ((cursor && cursor.length > 500) || !Number.isSafeInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return NextResponse.json({ error: "Некорректная пагинация" }, { status: 400 });
  }
  try {
    const client = getOzonDeliveryClient();
    const page = await client.listDeliveryPoints(cursor, parsedLimit);
    if (!page.deliveryPoints.length) {
      return NextResponse.json({ points: [], nextCursor: page.nextCursor, available: false }, {
        headers: { "Cache-Control": "private, max-age=60" },
      });
    }
    const details = await client.getDeliveryPoints(page.deliveryPoints.map((point) => point.delivery_point_id));
    const methods = new Map(page.deliveryPoints.map((point) => [point.delivery_point_id, point.shipment_method_ids]));
    const points = details
      .filter((point) => point.is_active && methods.has(point.delivery_point_id))
      .map((point) => ({
        id: point.delivery_point_id,
        name: point.name,
        address: point.full_address,
        city: extractOzonPointCity(point.full_address),
        type: point.type,
        latitude: point.coordinates?.latitude ?? null,
        longitude: point.coordinates?.longitude ?? null,
        shipmentMethodIds: methods.get(point.delivery_point_id),
      }));
    return NextResponse.json({ points, nextCursor: page.nextCursor, available: points.length > 0 }, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    const status = error instanceof OzonDeliveryError && [401, 403].includes(error.status) ? 503 : 502;
    return NextResponse.json({ error: "Не удалось получить пункты Ozon. Попробуйте позже." }, { status });
  }
}
