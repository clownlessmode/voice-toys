import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isOzonDeliveryConfigured } from "@/lib/ozon-delivery/config";
import { quoteOzonDelivery } from "@/lib/ozon-delivery/service";
import { isOzonDeliveryProductEligible } from "@/lib/ozon-delivery/rules";

type QuoteBody = {
  phone?: unknown;
  deliveryPointId?: unknown;
  shipmentMethodId?: unknown;
  items?: unknown;
};

export async function POST(request: NextRequest) {
  if (!isOzonDeliveryConfigured()) {
    return NextResponse.json({ error: "Ozon Доставка не настроена" }, { status: 503 });
  }
  try {
    const body = await request.json() as QuoteBody;
    if (typeof body.phone !== "string" || !Number.isSafeInteger(body.deliveryPointId) ||
        Number(body.deliveryPointId) <= 0 || !Number.isSafeInteger(body.shipmentMethodId) ||
        Number(body.shipmentMethodId) <= 0 || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) {
      return NextResponse.json({ error: "Некорректные данные для расчёта" }, { status: 400 });
    }
    const items = body.items as Array<{ productId?: unknown; quantity?: unknown }>;
    if (items.some((item) => !item || typeof item.productId !== "string" ||
        !Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0 || Number(item.quantity) > 100)) {
      return NextResponse.json({ error: "Некорректные товары" }, { status: 400 });
    }
    const ids = [...new Set(items.map((item) => item.productId as string))];
    if (ids.length !== items.length) return NextResponse.json({ error: "Повторяющиеся товары" }, { status: 400 });
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { characteristics: true },
    });
    if (products.length !== ids.length) {
      return NextResponse.json({ error: "Некоторые товары недоступны" }, { status: 400 });
    }
    if (products.some((product) => !isOzonDeliveryProductEligible(product.price))) {
      return NextResponse.json(
        { error: "Ozon Доставка недоступна для товаров дешевле 100 ₽. Выберите самовывоз." },
        { status: 400 },
      );
    }
    const declaredValueRub = Math.round(items.reduce((sum, item) => {
      const product = products.find((candidate) => candidate.id === item.productId)!;
      return sum + product.price * Number(item.quantity);
    }, 0) * 100) / 100;
    const quote = await quoteOzonDelivery({
      phone: body.phone,
      deliveryPointId: Number(body.deliveryPointId),
      shipmentMethodId: Number(body.shipmentMethodId),
      products,
      items: items.map((item) => ({ productId: item.productId as string, quantity: Number(item.quantity) })),
      declaredValueRub,
    });
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    return NextResponse.json({ error: "Ozon не смог рассчитать доставку для выбранного ПВЗ" }, { status: 422 });
  }
}
