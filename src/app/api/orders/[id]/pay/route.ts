import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformOrderFromDB } from "@/lib/order-utils";

// POST - Оплата заказа (webhook для платежной системы)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Проверяем, что заказ еще не оплачен
    if (existingOrder.status === "PAID") {
      return NextResponse.json(
        { error: "Order is already paid" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ не отменен
    if (existingOrder.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot pay for cancelled order" },
        { status: 400 }
      );
    }

    // Обновляем статус на оплачен
    const paidOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const transformedOrder = transformOrderFromDB(paidOrder);

    return NextResponse.json({
      success: true,
      message: "Order paid successfully",
      order: transformedOrder,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      {
        error: "Failed to process payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
