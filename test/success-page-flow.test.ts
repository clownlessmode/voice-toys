import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config({ path: ".env.local" });

describe("🎉 Success Page Payment Flow Test", () => {
  let testOrderId: string;

  beforeAll(async () => {
    // Получаем первый продукт из базы
    const firstProduct = await prisma.product.findFirst();
    if (!firstProduct) {
      throw new Error(
        "❌ No products found! Create at least one product first."
      );
    }

    // Создаем тестовый заказ
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: "SUCCESS-TEST-" + Date.now(),
        customerName: "Success Test User",
        customerPhone: "+7900000000",
        customerEmail: "success-test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "Test Success Address",
        totalAmount: 2000,
        currency: "₽",
        status: "CREATED",
        items: {
          create: [
            {
              productId: firstProduct.id,
              quantity: 2,
              price: 1000,
            },
          ],
        },
      },
    });

    testOrderId = testOrder.id;
    console.log("✅ Created test order:", testOrderId);
  });

  afterAll(async () => {
    // Очистка
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrderId },
    });

    await prisma.order.delete({
      where: { id: testOrderId },
    });

    console.log("🗑️ Test order cleaned up");
  });

  it("📋 Should start with CREATED status", async () => {
    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
    });

    expect(order?.status).toBe("CREATED");
    expect(order?.paidAt).toBeNull();
    console.log("✅ Initial order status:", order?.status);
  });

  it("🎯 Should process payment from success page with transaction_id", async () => {
    console.log("\n🚀 Simulating Modulbank success redirect...");

    // Симулируем данные как будто Модульбанк отправил на success page
    const transactionId = "modulbank_test_" + Date.now();

    console.log("💳 Transaction ID:", transactionId);
    console.log("📦 Order ID:", testOrderId);

    // Отправляем запрос как от success страницы
    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          state: "COMPLETE",
          source: "success_page",
        }),
      }
    );

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.message).toBe("Order paid successfully");

    console.log("✅ API response:", responseData.success);

    // Проверяем что статус заказа изменился
    const paidOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
    });

    expect(paidOrder?.status).toBe("PAID");
    expect(paidOrder?.paidAt).toBeTruthy();
    expect(paidOrder?.paidAt).toBeInstanceOf(Date);

    console.log("✅ Order status changed to:", paidOrder?.status);
    console.log("✅ Payment timestamp:", paidOrder?.paidAt?.toISOString());
  });

  it("🚫 Should reject duplicate payment", async () => {
    console.log("\n🔄 Testing duplicate payment...");

    // Пытаемся оплатить еще раз
    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: "duplicate_test_" + Date.now(),
          state: "COMPLETE",
          source: "success_page",
        }),
      }
    );

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toBe("Order is already paid");

    console.log("✅ Duplicate payment correctly rejected");
  });

  it("🚫 Should reject invalid state", async () => {
    console.log("\n❌ Testing invalid payment state...");

    // Создаем новый заказ для теста
    const firstProduct = await prisma.product.findFirst();
    const newOrder = await prisma.order.create({
      data: {
        orderNumber: "INVALID-TEST-" + Date.now(),
        customerName: "Invalid Test User",
        customerPhone: "+7900000001",
        customerEmail: "invalid-test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "Test Invalid Address",
        totalAmount: 500,
        currency: "₽",
        status: "CREATED",
        items: {
          create: [
            {
              productId: firstProduct!.id,
              quantity: 1,
              price: 500,
            },
          ],
        },
      },
    });

    try {
      // Отправляем с неправильным state
      const response = await fetch(
        `http://localhost:3000/api/orders/${newOrder.id}/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_id: "failed_test_" + Date.now(),
            state: "FAILED", // Неправильный статус
            source: "success_page",
          }),
        }
      );

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe("Payment not completed");

      console.log("✅ Invalid state correctly rejected");

      // Проверяем что статус заказа не изменился
      const unchangedOrder = await prisma.order.findUnique({
        where: { id: newOrder.id },
      });

      expect(unchangedOrder?.status).toBe("CREATED");
      console.log("✅ Order status unchanged:", unchangedOrder?.status);
    } finally {
      // Очищаем тестовый заказ
      await prisma.orderItem.deleteMany({
        where: { orderId: newOrder.id },
      });

      await prisma.order.delete({
        where: { id: newOrder.id },
      });
    }
  });

  it("📊 Summary: Real payment flow simulation", () => {
    console.log("\n🎉 SUCCESS PAGE FLOW TEST SUMMARY:");
    console.log("✅ Order created with CREATED status");
    console.log("✅ Success page payment processing works");
    console.log("✅ Order status changes to PAID after transaction_id");
    console.log("✅ Payment timestamp recorded");
    console.log("✅ Duplicate payments rejected");
    console.log("✅ Invalid payment states rejected");
    console.log("\n🚀 REAL MODULBANK FLOW TESTED SUCCESSFULLY!");
    console.log("🔗 Next step: Test with real URL like:");
    console.log(
      `   http://localhost:3000/order/success/${testOrderId}?transaction_id=test123`
    );
  });
});
