import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrderData, generateOrderNumber } from "@/lib/order-utils";
import { sendOrderNotification } from "@/lib/telegram";

interface OrderItem {
  productId: string;
  quantity: number;
}

interface CreateOrderData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: "pickup" | "delivery" | "cdek_office";
  deliveryAddress?: string;
  currency?: string;
  paymentType?: "online" | "cash_on_delivery";
  items: OrderItem[];
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateOrderData = await request.json();

    // Валидация данных
    const errors = validateOrderData(data);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: errors },
        { status: 400 }
      );
    }

    // Проверяем существование товаров и получаем их цены
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Некоторые товары не найдены" },
        { status: 400 }
      );
    }

    // Создаем мапу цен продуктов
    const productPriceMap = new Map<string, number>();
    products.forEach((product) => {
      productPriceMap.set(product.id, product.price);
    });

    // Подготавливаем данные для создания заказа
    const orderNumber = generateOrderNumber();

    // Подсчитываем общую сумму
    let totalAmount = 0;
    const orderItems = data.items.map((item) => {
      const price = productPriceMap.get(item.productId) || 0;
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: price,
      };
    });

    // Создаем заказ напрямую в базе данных
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        deliveryType: data.deliveryType,
        deliveryAddress: data.deliveryAddress,
        totalAmount,
        currency: data.currency || "₽",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Добавляем paymentType в ответ, чтобы фронтенд мог его использовать
    const orderWithPaymentType = {
      ...order,
      paymentType: data.paymentType,
    };

    // Отправляем уведомление в Telegram для заказов с оплатой при получении
    if (data.paymentType === "cash_on_delivery") {
      try {
        // Приводим к нужному типу для уведомления
        const orderForNotification = {
          ...order,
          status: order.status as "CREATED",
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          paidAt: order.paidAt?.toISOString() || null,
        };

        await sendOrderNotification(orderForNotification, "created");
      } catch (error) {
        console.error("Ошибка отправки уведомления в Telegram:", error);
        // Не блокируем создание заказа из-за ошибки уведомления
      }
    }

    return NextResponse.json(orderWithPaymentType, { status: 201 });
  } catch (error) {
    console.error("Ошибка создания заказа:", error);
    return NextResponse.json(
      { error: "Ошибка создания заказа" },
      { status: 500 }
    );
  }
}
