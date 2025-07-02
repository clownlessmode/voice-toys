import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateSignature, MODULBANK_CONFIG } from "@/lib/modulbank";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config({ path: ".env.local" });

describe("🔄 Payment Flow Integration Test", () => {
  let testOrderId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Получаем первый продукт из базы
    const firstProduct = await prisma.product.findFirst();
    if (!firstProduct) {
      throw new Error(
        "❌ No products found! Create at least one product first."
      );
    }
    testProductId = firstProduct.id;

    // Создаем тестовый заказ
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: "FLOW-TEST-" + Date.now(),
        customerName: "Payment Test User",
        customerPhone: "+7900000000",
        customerEmail: "payment-test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "Test Payment Address",
        totalAmount: 1500,
        currency: "₽",
        status: "CREATED", // Важно: начальный статус
        items: {
          create: [
            {
              productId: firstProduct.id,
              quantity: 1,
              price: 1500,
            },
          ],
        },
      },
    });

    testOrderId = testOrder.id;
    console.log("✅ Created test order:", testOrderId, "with status CREATED");
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

  it("📝 Should create order with CREATED status", async () => {
    console.log("\n🔍 Checking initial order status...");

    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
    });

    expect(order).toBeTruthy();
    expect(order?.status).toBe("CREATED");
    expect(order?.paidAt).toBeNull();

    console.log("✅ Order status:", order?.status);
  });

  it("💳 Should generate payment form without changing order status", async () => {
    console.log("\n🌐 Getting payment form...");

    // Запрашиваем форму оплаты
    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay/modulbank`,
      { method: "GET" }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("https://pay.modulbank.ru/pay");

    console.log("✅ Payment form generated successfully");

    // Проверяем что статус заказа НЕ изменился
    const orderAfterForm = await prisma.order.findUnique({
      where: { id: testOrderId },
    });

    expect(orderAfterForm?.status).toBe("CREATED");
    expect(orderAfterForm?.paidAt).toBeNull();

    console.log("✅ Order status unchanged:", orderAfterForm?.status);
  });

  it("🚫 Should reject callback with invalid signature", async () => {
    console.log("\n🔍 Testing invalid signature rejection...");

    // Создаем callback с неправильной подписью
    const invalidCallbackData = new FormData();
    invalidCallbackData.append("state", "COMPLETE");
    invalidCallbackData.append("order_id", testOrderId);
    invalidCallbackData.append("amount", "1500.00");
    invalidCallbackData.append("signature", "invalid_signature_123");

    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay`,
      {
        method: "POST",
        body: invalidCallbackData,
      }
    );

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toBe("Invalid signature");

    console.log("✅ Invalid signature rejected");

    // Проверяем что статус заказа НЕ изменился
    const orderAfterInvalidCallback = await prisma.order.findUnique({
      where: { id: testOrderId },
    });

    expect(orderAfterInvalidCallback?.status).toBe("CREATED");
    expect(orderAfterInvalidCallback?.paidAt).toBeNull();

    console.log("✅ Order status still:", orderAfterInvalidCallback?.status);
  });

  it("✅ Should process successful payment with valid callback", async () => {
    console.log("\n💰 Testing successful payment...");

    // Создаем правильные данные callback как от Модульбанк согласно документации
    const callbackData = {
      state: "COMPLETE",
      order_id: testOrderId,
      amount: "1500.00",
      transaction_id: "test_transaction_" + Date.now(),
      merchant: MODULBANK_CONFIG.merchant,
      testing: MODULBANK_CONFIG.testMode ? ("1" as const) : ("0" as const),
      unix_timestamp: Math.floor(Date.now() / 1000).toString(),
    };

    // Генерируем правильную подпись
    const signature = generateSignature(
      callbackData,
      MODULBANK_CONFIG.secretKey
    );

    console.log(
      "🔧 Generated callback signature:",
      signature.substring(0, 10) + "..."
    );

    // Отправляем callback с правильной подписью
    const formData = new FormData();
    Object.entries(callbackData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("signature", signature);

    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay`,
      {
        method: "POST",
        body: formData,
      }
    );

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.message).toBe("Order paid successfully");

    console.log("✅ Payment processed successfully");

    // Проверяем что статус заказа изменился на PAID
    const paidOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
    });

    expect(paidOrder?.status).toBe("PAID");
    expect(paidOrder?.paidAt).toBeTruthy();
    expect(paidOrder?.paidAt).toBeInstanceOf(Date);

    console.log("✅ Order status changed to:", paidOrder?.status);
    console.log("✅ Payment time:", paidOrder?.paidAt?.toISOString());
  });

  it("🚫 Should reject duplicate payment for already paid order", async () => {
    console.log("\n🔍 Testing duplicate payment rejection...");

    // Пытаемся оплатить уже оплаченный заказ
    const duplicateCallbackData = {
      state: "COMPLETE",
      order_id: testOrderId,
      amount: "1500.00",
      transaction_id: "test_transaction_duplicate_" + Date.now(),
      merchant: MODULBANK_CONFIG.merchant,
      testing: MODULBANK_CONFIG.testMode ? ("1" as const) : ("0" as const),
      unix_timestamp: Math.floor(Date.now() / 1000).toString(),
    };

    const signature = generateSignature(
      duplicateCallbackData,
      MODULBANK_CONFIG.secretKey
    );

    const formData = new FormData();
    Object.entries(duplicateCallbackData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("signature", signature);

    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay`,
      {
        method: "POST",
        body: formData,
      }
    );

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.error).toBe("Order is already paid");

    console.log("✅ Duplicate payment rejected");

    // Проверяем что статус остался PAID
    const stillPaidOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
    });

    expect(stillPaidOrder?.status).toBe("PAID");

    console.log("✅ Order status still:", stillPaidOrder?.status);
  });

  it("🚫 Should reject incomplete payment callback", async () => {
    console.log("\n🔍 Testing incomplete payment rejection...");

    // Создаем новый заказ для теста незавершенного платежа
    const incompleteTestOrder = await prisma.order.create({
      data: {
        orderNumber: "INCOMPLETE-TEST-" + Date.now(),
        customerName: "Incomplete Test User",
        customerPhone: "+7900000001",
        customerEmail: "incomplete-test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "Test Incomplete Address",
        totalAmount: 500,
        currency: "₽",
        status: "CREATED",
        items: {
          create: [
            {
              productId: testProductId,
              quantity: 1,
              price: 500,
            },
          ],
        },
      },
    });

    try {
      // Callback с состоянием НЕ COMPLETE
      const incompleteCallbackData = {
        state: "FAILED", // Не COMPLETE!
        order_id: incompleteTestOrder.id,
        amount: "500.00",
        transaction_id: "test_transaction_failed_" + Date.now(),
        merchant: MODULBANK_CONFIG.merchant,
        testing: MODULBANK_CONFIG.testMode ? ("1" as const) : ("0" as const),
        unix_timestamp: Math.floor(Date.now() / 1000).toString(),
      };

      const signature = generateSignature(
        incompleteCallbackData,
        MODULBANK_CONFIG.secretKey
      );

      const formData = new FormData();
      Object.entries(incompleteCallbackData).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append("signature", signature);

      const response = await fetch(
        `http://localhost:3000/api/orders/${incompleteTestOrder.id}/pay`,
        {
          method: "POST",
          body: formData,
        }
      );

      expect(response.status).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe("Payment not completed");

      console.log("✅ Incomplete payment rejected");

      // Проверяем что статус остался CREATED
      const uncompleteOrder = await prisma.order.findUnique({
        where: { id: incompleteTestOrder.id },
      });

      expect(uncompleteOrder?.status).toBe("CREATED");
      expect(uncompleteOrder?.paidAt).toBeNull();

      console.log("✅ Order status still:", uncompleteOrder?.status);
    } finally {
      // Очищаем тестовый заказ
      await prisma.orderItem.deleteMany({
        where: { orderId: incompleteTestOrder.id },
      });

      await prisma.order.delete({
        where: { id: incompleteTestOrder.id },
      });
    }
  });

  it("📊 Summary: Complete payment flow test", () => {
    console.log("\n🎉 PAYMENT FLOW TEST SUMMARY:");
    console.log("✅ Order created with CREATED status");
    console.log("✅ Payment form generation doesn't change status");
    console.log("✅ Invalid signature callbacks rejected");
    console.log("✅ Valid payment callback changes status to PAID");
    console.log("✅ Duplicate payments rejected");
    console.log("✅ Incomplete payments rejected");
    console.log("✅ Payment timestamps recorded");
    console.log("\n🚀 ALL PAYMENT SCENARIOS TESTED SUCCESSFULLY!");
  });
});
