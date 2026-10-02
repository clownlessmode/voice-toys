import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-request";
import { prisma } from "@/lib/prisma";
import { createOzonDeliveryOrder } from "@/lib/ozon-delivery/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request);
  if (auth) return auth;
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: { include: { characteristics: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  if (order.deliveryType !== "ozon_pvz" || !order.paidAt || !["PAID", "SHIPPED"].includes(order.status)) {
    return NextResponse.json({ error: "Заказ не готов к отправке через Ozon" }, { status: 409 });
  }
  if (order.ozonPostingNumber) {
    return NextResponse.json({
      orderNumber: order.ozonOrderNumber, postingNumber: order.ozonPostingNumber, alreadyCreated: true,
    });
  }
  try {
    const shipment = await createOzonDeliveryOrder({ order });
    await prisma.order.update({
      where: { id },
      data: {
        ozonOrderNumber: shipment.orderNumber,
        ozonPostingNumber: shipment.postingNumber,
        ozonDeliveryStatus: "CREATED",
        ozonDeliveryError: null,
        ozonDeliveryCreatedAt: new Date(),
      },
    });
    return NextResponse.json({ ...shipment, alreadyCreated: false });
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : "Неизвестная ошибка Ozon";
    await prisma.order.update({
      where: { id },
      data: { ozonDeliveryStatus: "CREATE_FAILED", ozonDeliveryError: `Не удалось создать отправление Ozon: ${reason}` },
    });
    return NextResponse.json({ error: "Ozon не создал отправление" }, { status: 502 });
  }
}
