import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createPaymentData,
  generatePaymentForm,
  ReceiptItem,
} from "@/lib/modulbank";

// GET - Создание платежа через Modulbank (для прямого редиректа)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Получаем заказ
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Проверяем, что заказ еще не оплачен
    if (order.status === "PAID") {
      return NextResponse.json(
        { error: "Order is already paid" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ не отменен
    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot pay for cancelled order" },
        { status: 400 }
      );
    }

    // Подготавливаем данные чека (временно отключено для отладки)
    const receiptItems: ReceiptItem[] = [];
    // const receiptItems: ReceiptItem[] = order.items.map((item) => ({
    //   name: item.product.name,
    //   payment_method: "full_prepayment",
    //   payment_object: "commodity",
    //   price: item.price,
    //   quantity: item.quantity,
    //   sno: "osn",
    //   vat: "vat20", // 20% НДС
    // }));

    // Создаем URL для callback
    const baseUrl = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const callbackUrl = `${protocol}://${baseUrl}/api/orders/${id}/pay`;

    // Создаем URL для успешной оплаты
    const successUrl = `${protocol}://${baseUrl}/order/success/${id}`;

    // Создаем данные для платежа с правильным success_url
    const paymentData = createPaymentData({
      orderId: order.id,
      amount: order.totalAmount,
      description: `Заказ №${order.orderNumber}`,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      receiptItems,
      customOrderId: order.orderNumber,
      callbackUrl,
      successUrl, // Передаем правильный URL сразу
    });

    console.log("=== PAYMENT DATA ===");
    console.log("Order:", {
      id: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
    });
    console.log("Payment data:", paymentData);
    console.log("==================");

    // Генерируем HTML форму
    const paymentForm = generatePaymentForm(paymentData);

    // Возвращаем HTML страницу с автоматической отправкой формы
    return new NextResponse(paymentForm, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error creating Modulbank payment:", error);
    return NextResponse.json(
      {
        error: "Failed to create payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
