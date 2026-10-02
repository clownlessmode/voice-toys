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

    // Match the callback eligibility checks before sending the buyer to the bank.
    if (
      order.status !== "CREATED" ||
      order.paymentType !== "online" ||
      order.paidAt !== null ||
      order.paymentTransactionId !== null
    ) {
      return NextResponse.json(
        { error: "Order is not eligible for online payment" },
        { status: 409 }
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
    // Используем totalAmount, который уже содержит сумму с учетом скидки
    const paymentAmount = order.totalAmount;

    const paymentData = createPaymentData({
      orderId: order.id,
      amount: paymentAmount,
      description: `Заказ №${order.orderNumber}`,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      receiptItems,
      customOrderId: order.orderNumber,
      callbackUrl,
      successUrl, // Передаем правильный URL сразу
    });

    // Генерируем HTML форму
    const paymentForm = generatePaymentForm(paymentData);

    // Возвращаем HTML страницу с автоматической отправкой формы
    return new NextResponse(paymentForm, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    console.error("Error creating Modulbank payment");
    return NextResponse.json(
      {
        error: "Failed to create payment",
      },
      { status: 500 }
    );
  }
}
