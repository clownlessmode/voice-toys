import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrderData, generateOrderNumber, transformOrderFromDB } from "@/lib/order-utils";
import { randomUUID } from "node:crypto";
import { quoteOzonDelivery } from "@/lib/ozon-delivery/service";
import { isOzonDeliveryProductEligible } from "@/lib/ozon-delivery/rules";

interface OrderItem {
  productId: string;
  quantity: number;
}

interface CreateOrderData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: "pickup" | "ozon_pvz";
  deliveryAddress?: string;
  ozonDeliveryPointId?: number;
  ozonShipmentMethodId?: number;
  currency?: string;
  paymentType?: "online" | "cash_on_delivery";
  promoCodeId?: string | null;
  items: OrderItem[];
}

const HIDDEN_PLACEHOLDER_PRICE_RUB = 1;

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
      where: { id: { in: productIds }, isActive: true },
      include: { characteristics: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Некоторые товары не найдены" },
        { status: 400 }
      );
    }
    const blockedProduct = products.find(
      (product) => !Number.isFinite(product.price) || product.price <= HIDDEN_PLACEHOLDER_PRICE_RUB
    );
    if (blockedProduct) {
      return NextResponse.json(
        {
          error:
            "Некоторые товары временно недоступны для покупки. Обновите каталог и попробуйте снова.",
        },
        { status: 400 }
      );
    }
    if (data.deliveryType === "ozon_pvz" &&
        products.some((product) => !isOzonDeliveryProductEligible(product.price))) {
      return NextResponse.json(
        { error: "Ozon Доставка недоступна для товаров дешевле 100 ₽. Выберите самовывоз." },
        { status: 400 },
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
    let originalAmount = 0;
    const orderItems = data.items.map((item) => {
      const price = productPriceMap.get(item.productId) || 0;
      const itemTotal = price * item.quantity;
      originalAmount += itemTotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: price,
      };
    });

    originalAmount = Math.round(originalAmount * 100) / 100;
    let discountAmount = 0;
    if (data.promoCodeId) {
      const promo = await prisma.promoCode.findUnique({ where: { id: data.promoCodeId } });
      const now = new Date();
      if (!promo || !promo.isActive || now < promo.validFrom || now > promo.validUntil ||
          (promo.maxUses !== null && promo.currentUses >= promo.maxUses) ||
          (promo.minOrderAmount !== null && originalAmount < promo.minOrderAmount) ||
          !Number.isFinite(promo.value) || promo.value < 0 ||
          !["PERCENTAGE", "FIXED_AMOUNT"].includes(promo.type)) {
        return NextResponse.json({ error: "Промокод недействителен для этого заказа" }, { status: 400 });
      }
      // Preserve the storefront's whole-ruble discount rounding, using trusted inputs.
      discountAmount = Math.min(originalAmount, Math.round(
        promo.type === "PERCENTAGE" ? originalAmount * promo.value / 100 : promo.value
      ));
    }
    let deliveryCost = 0;
    let deliveryAddress = data.deliveryAddress;
    let ozonCutoffAt: string | null = null;
    let ozonIdempotencyKey: string | null = null;
    if (data.deliveryType === "ozon_pvz") {
      try {
        const quote = await quoteOzonDelivery({
          phone: data.customerPhone,
          deliveryPointId: data.ozonDeliveryPointId!,
          shipmentMethodId: data.ozonShipmentMethodId!,
          products,
          items: data.items,
          declaredValueRub: originalAmount,
        });
        deliveryCost = quote.deliveryCost;
        deliveryAddress = `Ozon ${quote.pointName}: ${quote.address}`;
        ozonCutoffAt = quote.cutoffAt;
        ozonIdempotencyKey = randomUUID();
      } catch {
        return NextResponse.json(
          { error: "Ozon не подтвердил выбранный ПВЗ или стоимость доставки" },
          { status: 422 }
        );
      }
    }
    const totalAmount = Math.round((originalAmount - discountAmount + deliveryCost) * 100) / 100;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: "Сумма заказа должна быть больше нуля" }, { status: 400 });
    }

    // Создаем заказ напрямую в базе данных
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        deliveryType: data.deliveryType,
        deliveryAddress,
        deliveryCost,
        ozonDeliveryPointId: data.deliveryType === "ozon_pvz" ? String(data.ozonDeliveryPointId) : null,
        ozonShipmentMethodId: data.deliveryType === "ozon_pvz" ? String(data.ozonShipmentMethodId) : null,
        ozonCutoffAt,
        ozonIdempotencyKey,
        ozonDeliveryStatus: data.deliveryType === "ozon_pvz" ? "AWAITING_PAYMENT" : null,
        totalAmount,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        promoCodeId: data.promoCodeId || null,
        currency: "₽",
        paymentType: data.paymentType || "online",
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
      paymentType: order.paymentType,
    };

    // Отправляем уведомление в Telegram для заказов с оплатой при получении
    if (
      data.paymentType === "cash_on_delivery" &&
      process.env.DISABLE_ORDER_NOTIFICATIONS !== "true"
    ) {
      try {
        const { sendOrderNotification } = await import("@/lib/telegram");
        await sendOrderNotification(transformOrderFromDB(order), "created");
      } catch (error) {
        console.error("Ошибка отправки уведомления в Telegram:", error);
        // Не блокируем создание заказа из-за ошибки уведомления
      }
    }

    return NextResponse.json(orderWithPaymentType, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    console.error("Ошибка создания заказа:", error);
    return NextResponse.json(
      { error: "Ошибка создания заказа" },
      { status: 500 }
    );
  }
}
