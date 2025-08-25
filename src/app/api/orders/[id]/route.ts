import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformOrderFromDB } from "@/lib/order-utils";
import { UpdateOrderStatusRequest } from "@/components/entities/order/model/types";
import { sendOrderNotification } from "@/lib/telegram";

// GET - Получение заказа по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                characteristics: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const transformedOrder = transformOrderFromDB(order);

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Обновление статуса заказа
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateOrderStatusRequest = await request.json();

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Валидация статуса
    const validStatuses = [
      "CREATED",
      "PAID",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: { status: string; paidAt?: Date } = {
      status: body.status,
    };

    // Если статус "PAID", устанавливаем paidAt
    if (body.status === "PAID" && existingOrder.status !== "PAID") {
      updateData.paidAt = new Date();
    }

    // Обновляем заказ
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              include: {
                characteristics: true,
              },
            },
          },
        },
      },
    });

    const transformedOrder = transformOrderFromDB(updatedOrder);

    // Отправляем уведомление в Telegram при смене статуса на PAID
    if (body.status === "PAID" && existingOrder.status !== "PAID") {
      try {
        await sendOrderNotification(transformedOrder, "paid");
      } catch (error) {
        console.error("Ошибка отправки уведомления в Telegram:", error);
        // Не блокируем обновление заказа из-за ошибки уведомления
      }
    }

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      {
        error: "Failed to update order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Отмена заказа (мягкое удаление)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Проверяем, можно ли отменить заказ
    if (["SHIPPED", "DELIVERED"].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: "Cannot cancel shipped or delivered order" },
        { status: 400 }
      );
    }

    // Устанавливаем статус CANCELLED
    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const transformedOrder = transformOrderFromDB(cancelledOrder);

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
