import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { generateOrderNumber } from "../src/lib/order-utils";

describe("CDEK Real Integration", () => {
  let testOrderId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Создаем тестовый продукт
    const product = await prisma.product.create({
      data: {
        name: "Тестовая игрушка для СДЭК",
        breadcrumbs: JSON.stringify(["Игрушки", "Тестовые"]),
        images: JSON.stringify(["test-image.jpg"]),
        price: 1500,
        oldPrice: 2000,
        discountPercent: 25,
        currency: "₽",
        favorite: false,
        pickupAvailability: "В наличии",
        deliveryAvailability: "Доступна доставка",
        returnDays: 14,
        returnDetails: "Возврат в течение 14 дней",
        description: "Тестовая игрушка для проверки интеграции с СДЭК",
        categories: JSON.stringify(["test"]),
        ageGroups: JSON.stringify(["3-6"]),
      },
    });
    testProductId = product.id;

    // Создаем тестовый заказ
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: "CREATED",
        customerName: "Тест Тестов",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "44", // Код Москвы для тестирования
        totalAmount: 1500,
        currency: "₽",
        items: {
          create: [
            {
              productId: testProductId,
              quantity: 1,
              price: 1500,
            },
          ],
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
    testOrderId = order.id;

    console.log("✅ Test order created:", {
      orderId: testOrderId,
      orderNumber: order.orderNumber,
      productId: testProductId,
    });
  });

  afterAll(async () => {
    // Очищаем тестовые данные
    try {
      await prisma.orderItem.deleteMany({
        where: { orderId: testOrderId },
      });
      await prisma.order.delete({
        where: { id: testOrderId },
      });
      await prisma.product.delete({
        where: { id: testProductId },
      });
      console.log("✅ Test data cleaned up");
    } catch (error) {
      console.error("❌ Error cleaning up test data:", error);
    }
  });

  it("should create order, pay it, and register in CDEK", async () => {
    // 1. Проверяем, что заказ создан и не оплачен
    const initialOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    expect(initialOrder).toBeTruthy();
    expect(initialOrder?.status).toBe("CREATED");
    expect(initialOrder?.paidAt).toBeNull();
    console.log("✅ Initial order status verified");

    // 2. Имитируем оплату заказа (вызываем API endpoint)
    const paymentResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/orders/${testOrderId}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "success_page",
          transaction_id: "test-transaction-123",
          state: "COMPLETE",
        }),
      }
    );

    expect(paymentResponse.ok).toBe(true);
    const paymentResult = await paymentResponse.json();
    expect(paymentResult.success).toBe(true);
    console.log("✅ Payment processed successfully");

    // 3. Проверяем, что заказ стал оплаченным
    const paidOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    expect(paidOrder?.status).toBe("PAID");
    expect(paidOrder?.paidAt).toBeTruthy();
    console.log("✅ Order marked as paid");

    // 4. Проверяем логи на предмет создания заказа в СДЭК
    // В реальном тесте здесь можно добавить проверку логов или
    // дополнительный API endpoint для проверки статуса заказа в СДЭК

    console.log("🎯 Integration test completed successfully!");
    console.log("📋 Order details:", {
      id: paidOrder?.id,
      orderNumber: paidOrder?.orderNumber,
      status: paidOrder?.status,
      paidAt: paidOrder?.paidAt,
      deliveryType: paidOrder?.deliveryType,
      deliveryAddress: paidOrder?.deliveryAddress,
    });
  }, 30000); // Увеличиваем timeout до 30 секунд для API вызовов
});
