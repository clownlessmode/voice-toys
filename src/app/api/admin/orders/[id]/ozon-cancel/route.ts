import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-request";
import { prisma } from "@/lib/prisma";
import { getOzonDeliveryClient } from "@/lib/ozon-delivery/client";

async function loadPosting(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      deliveryType: true,
      ozonPostingNumber: true,
      ozonDeliveryStatus: true,
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request);
  if (auth) return auth;
  const { id } = await params;
  const order = await loadPosting(id);
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  if (order.deliveryType !== "ozon_pvz" || !order.ozonPostingNumber) {
    return NextResponse.json({ error: "У заказа нет отправления Ozon" }, { status: 409 });
  }
  if (["CANCEL_REQUESTED", "CANCELLED"].includes(order.ozonDeliveryStatus ?? "")) {
    return NextResponse.json({ status: order.ozonDeliveryStatus, alreadyRequested: true });
  }

  try {
    const client = getOzonDeliveryClient();
    await client.cancelPosting(order.ozonPostingNumber);
    await prisma.order.update({
      where: { id },
      data: { ozonDeliveryStatus: "CANCELLED", ozonDeliveryError: null },
    });
    return NextResponse.json({ status: "CANCELLED", alreadyRequested: false });
  } catch {
    await prisma.order.update({
      where: { id },
      data: { ozonDeliveryError: "Ozon не принял запрос на отмену отправления." },
    });
    return NextResponse.json({ error: "Ozon не принял отмену отправления" }, { status: 502 });
  }
}
