import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformOrderFromDB } from "@/lib/order-utils";
import { verifyCallback } from "@/lib/modulbank";
import { sendOrderNotification } from "@/lib/telegram";

// POST - Оплата заказа (webhook для платежной системы)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type");
    let callbackData: Record<string, string> = {};

    // Обработка разных типов запросов
    if (contentType?.includes("application/json")) {
      // JSON запрос от success страницы
      const jsonData = await request.json();
      console.log("📥 JSON payment data:", jsonData);

      if (jsonData.source === "success_page" && jsonData.transaction_id) {
        // Валидация данных от success страницы
        if (jsonData.state !== "COMPLETE") {
          return NextResponse.json(
            { error: "Payment not completed" },
            { status: 400 }
          );
        }
        // Для запросов от success страницы не проверяем подпись
        callbackData = jsonData;
      } else {
        return NextResponse.json(
          { error: "Invalid payment data" },
          { status: 400 }
        );
      }
    } else {
      // FormData запрос от Modulbank webhook
      const formData = await request.formData();

      // Преобразуем FormData в объект
      for (const [key, value] of formData.entries()) {
        callbackData[key] = value.toString();
      }

      console.log("📥 Form payment data:", callbackData);

      // Если есть данные callback от Modulbank, проверяем подпись
      if (Object.keys(callbackData).length > 0 && callbackData.signature) {
        const isValidSignature = verifyCallback(callbackData);

        if (!isValidSignature) {
          console.error("Invalid Modulbank callback signature", callbackData);
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
          );
        }

        // Проверяем статус платежа от Modulbank
        if (callbackData.state !== "COMPLETE") {
          console.log("Payment not completed", callbackData);
          return NextResponse.json(
            { error: "Payment not completed" },
            { status: 400 }
          );
        }
      }
    }

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

    // Отправляем уведомление в Telegram
    try {
      await sendOrderNotification(transformedOrder, "paid");
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
      // Не блокируем обработку платежа из-за ошибки уведомления
    }

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
