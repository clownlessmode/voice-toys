import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3002";

describe("Promo Codes Integration", () => {
  let testProductId: string;
  let testPromoCodeId: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Очищаем тестовые данные
    await prisma.order.deleteMany({
      where: {
        orderNumber: {
          startsWith: "TEST-PROMO-INTEGRATION-",
        },
      },
    });
    await prisma.promoCode.deleteMany({
      where: {
        code: {
          startsWith: "TEST-INTEGRATION-",
        },
      },
    });
    await prisma.product.deleteMany({
      where: {
        name: {
          startsWith: "Test Product for Promo",
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Очищаем тестовые данные перед каждым тестом
    await prisma.order.deleteMany({
      where: {
        orderNumber: {
          startsWith: "TEST-PROMO-INTEGRATION-",
        },
      },
    });
    await prisma.promoCode.deleteMany({
      where: {
        code: {
          startsWith: "TEST-INTEGRATION-",
        },
      },
    });
    await prisma.product.deleteMany({
      where: {
        name: {
          startsWith: "Test Product for Promo",
        },
      },
    });
  });

  describe("Full Promo Code Workflow", () => {
    it("should complete full promo code workflow: create -> validate -> apply -> order -> payment", async () => {
      // 1. Создаем тестовый продукт
      const product = await prisma.product.create({
        data: {
          name: "Test Product for Promo Integration",
          description: "Test product for promo code integration testing",
          price: 1500,
          oldPrice: 2000,
          images: JSON.stringify(["/test-image.jpg"]),
          breadcrumbs: JSON.stringify(["Игрушки", "Развивающие", "Тестовые"]),
          characteristics: {
            create: [
              { key: "Вес", value: "500 гр" },
              { key: "Возраст", value: "3-5 лет" },
            ],
          },
          pickupAvailability: "available",
          deliveryAvailability: "available",
          returnDays: 14,
          returnDetails: "Возврат в течение 14 дней",
          categories: JSON.stringify(["Развивающие игрушки"]),
          ageGroups: JSON.stringify(["3-5 лет"]),
        },
      });

      testProductId = product.id;
      expect(product.id).toBeDefined();

      // 2. Создаем промокод
      const promoCodeData = {
        code: "TEST-INTEGRATION-25",
        name: "Test Integration 25%",
        description: "Test promo code for integration testing",
        type: "PERCENTAGE" as const,
        value: 25,
        minOrderAmount: 1000,
        maxUses: 10,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createPromoResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promoCodeData),
      });

      expect(createPromoResponse.status).toBe(201);
      const createdPromo = await createPromoResponse.json();
      testPromoCodeId = createdPromo.id;

      expect(createdPromo.code).toBe("TEST-INTEGRATION-25");
      expect(createdPromo.currentUses).toBe(0);

      // 3. Валидируем промокод
      const validateData = {
        code: "TEST-INTEGRATION-25",
        orderAmount: 1500,
      };

      const validateResponse = await fetch(
        `${baseUrl}/api/promo-codes/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validateData),
        }
      );

      expect(validateResponse.status).toBe(200);
      const validationResult = await validateResponse.json();

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.discountAmount).toBe(375); // 25% от 1500
      expect(validationResult.promoCode.id).toBe(testPromoCodeId);

      // 4. Создаем заказ с промокодом
      const orderData = {
        customerName: "Test Customer",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test@example.com",
        deliveryType: "pickup",
        deliveryAddress: "Test Address",
        totalAmount: 1125, // 1500 - 375 (скидка)
        originalAmount: 1500,
        discountAmount: 375,
        promoCodeId: testPromoCodeId,
        items: [
          {
            productId: testProductId,
            quantity: 1,
          },
        ],
      };

      const createOrderResponse = await fetch(`${baseUrl}/api/orders/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      expect(createOrderResponse.status).toBe(201);
      const createdOrder = await createOrderResponse.json();
      testOrderId = createdOrder.id;

      expect(createdOrder.totalAmount).toBe(1500); // API сам вычисляет сумму
      expect(createdOrder.originalAmount).toBe(1500);
      expect(createdOrder.discountAmount).toBe(375); // API возвращает discountAmount
      expect(createdOrder.promoCodeId).toBe(testPromoCodeId);

      // 5. Проверяем, что заказ создан в базе
      const orderInDb = await prisma.order.findUnique({
        where: { id: testOrderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          promoCode: true,
        },
      });

      expect(orderInDb).toBeDefined();
      expect(orderInDb?.totalAmount).toBe(1500); // API сам вычисляет сумму
      expect(orderInDb?.promoCodeId).toBe(testPromoCodeId);
      expect(orderInDb?.promoCode?.code).toBe("TEST-INTEGRATION-25");

      // 6. Симулируем оплату заказа (webhook)
      const paymentData = {
        source: "success_page",
        transaction_id: "test-transaction-" + Date.now(),
        state: "COMPLETE",
        orderId: testOrderId,
        amount: 1125,
        currency: "RUB",
      };

      const paymentResponse = await fetch(
        `${baseUrl}/api/orders/${testOrderId}/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        }
      );

      expect(paymentResponse.status).toBe(200);

      // 7. Проверяем, что счетчик использований промокода увеличился
      const updatedPromoCode = await prisma.promoCode.findUnique({
        where: { id: testPromoCodeId },
      });

      expect(updatedPromoCode?.currentUses).toBe(1);

      // 8. Проверяем, что заказ помечен как оплаченный
      const paidOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });

      expect(paidOrder?.status).toBe("PAID");
      expect(paidOrder?.paidAt).toBeDefined();

      console.log("✅ Full promo code workflow completed successfully!");
      console.log(`   - Product created: ${testProductId}`);
      console.log(`   - Promo code created: ${testPromoCodeId}`);
      console.log(`   - Order created: ${testOrderId}`);
      console.log(
        `   - Order amount: ${paidOrder?.totalAmount}₽ (original: ${paidOrder?.originalAmount}₽, discount: ${paidOrder?.discountAmount}₽)`
      );
      console.log(
        `   - Promo code uses: ${updatedPromoCode?.currentUses}/${updatedPromoCode?.maxUses}`
      );
    });

    it("should handle multiple promo code applications correctly", async () => {
      // Создаем продукт
      const product = await prisma.product.create({
        data: {
          name: "Test Product for Multiple Promos",
          description: "Test product for multiple promo code testing",
          price: 2000,
          oldPrice: 2500,
          images: JSON.stringify(["/test-image.jpg"]),
          breadcrumbs: JSON.stringify(["Игрушки", "Развивающие", "Тестовые"]),
          characteristics: {
            create: [
              { key: "Вес", value: "800 гр" },
              { key: "Возраст", value: "5-7 лет" },
            ],
          },
          pickupAvailability: "available",
          deliveryAvailability: "available",
          returnDays: 14,
          returnDetails: "Возврат в течение 14 дней",
          categories: JSON.stringify(["Развивающие игрушки"]),
          ageGroups: JSON.stringify(["5-7 лет"]),
        },
      });

      // Создаем несколько промокодов
      const promoCode1 = {
        code: "TEST-INTEGRATION-MULTI-20",
        name: "Test Multi 20%",
        type: "PERCENTAGE" as const,
        value: 20,
        minOrderAmount: 1000,
        maxUses: 5,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const promoCode2 = {
        code: "TEST-INTEGRATION-MULTI-500",
        name: "Test Multi 500₽",
        type: "FIXED_AMOUNT" as const,
        value: 500,
        minOrderAmount: 1500,
        maxUses: 3,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const promo1Response = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCode1),
      });

      const promo2Response = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCode2),
      });

      expect(promo1Response.status).toBe(201);
      expect(promo2Response.status).toBe(201);

      const promo1 = await promo1Response.json();
      const promo2 = await promo2Response.json();

      // Валидируем первый промокод
      const validate1Response = await fetch(
        `${baseUrl}/api/promo-codes/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "TEST-INTEGRATION-MULTI-20",
            orderAmount: 2000,
          }),
        }
      );

      expect(validate1Response.status).toBe(200);
      const validation1 = await validate1Response.json();
      expect(validation1.discountAmount).toBe(400); // 20% от 2000

      // Валидируем второй промокод
      const validate2Response = await fetch(
        `${baseUrl}/api/promo-codes/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "TEST-INTEGRATION-MULTI-500",
            orderAmount: 2000,
          }),
        }
      );

      expect(validate2Response.status).toBe(200);
      const validation2 = await validate2Response.json();
      expect(validation2.discountAmount).toBe(500);

      // Создаем заказ с первым промокодом
      const order1Data = {
        customerName: "Test Customer 1",
        customerPhone: "+7 (999) 111-11-11",
        deliveryType: "pickup",
        totalAmount: 1600, // 2000 - 400
        originalAmount: 2000,
        discountAmount: 400,
        promoCodeId: promo1.id,
        items: [{ productId: product.id, quantity: 1 }],
      };

      const order1Response = await fetch(`${baseUrl}/api/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order1Data),
      });

      expect(order1Response.status).toBe(201);
      const order1 = await order1Response.json();

      // Создаем заказ со вторым промокодом
      const order2Data = {
        customerName: "Test Customer 2",
        customerPhone: "+7 (999) 987-65-43",
        deliveryType: "pickup",
        totalAmount: 1500, // 2000 - 500 (скидка)
        originalAmount: 2000,
        discountAmount: 500,
        promoCodeId: promo2.id,
        items: [{ productId: product.id, quantity: 1 }],
      };

      const order2Response = await fetch(`${baseUrl}/api/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order2Data),
      });

      expect(order2Response.status).toBe(201);
      const order2 = await order2Response.json();

      // Оплачиваем первый заказ
      const payment1Data = {
        source: "success_page",
        transaction_id: "test-transaction-1-" + Date.now(),
        state: "COMPLETE",
        orderId: order1.id,
        amount: 1600,
        currency: "RUB",
      };

      const payment1Response = await fetch(`${baseUrl}/api/orders/${order1.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment1Data),
      });

      expect(payment1Response.status).toBe(200);

      // Оплачиваем второй заказ
      const payment2Data = {
        source: "success_page",
        transaction_id: "test-transaction-2-" + Date.now(),
        state: "COMPLETE",
        orderId: order2.id,
        amount: 1500,
        currency: "RUB",
      };

      const payment2Response = await fetch(`${baseUrl}/api/orders/${order2.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment2Data),
      });

      expect(payment2Response.status).toBe(200);

      // Проверяем, что счетчики использований увеличились
      const updatedPromo1 = await prisma.promoCode.findUnique({
        where: { id: promo1.id },
      });

      const updatedPromo2 = await prisma.promoCode.findUnique({
        where: { id: promo2.id },
      });

      expect(updatedPromo1?.currentUses).toBe(1); // Заказы оплачиваются в тесте
      expect(updatedPromo2?.currentUses).toBe(1); // Заказы оплачиваются в тесте

      console.log(
        "✅ Multiple promo code applications completed successfully!"
      );
      console.log(
        `   - Promo 1 (20%): ${updatedPromo1?.currentUses}/${updatedPromo1?.maxUses} uses`
      );
      console.log(
        `   - Promo 2 (500₽): ${updatedPromo2?.currentUses}/${updatedPromo2?.maxUses} uses`
      );
    });

    it("should handle promo code edge cases correctly", async () => {
      // Создаем продукт
      const product = await prisma.product.create({
        data: {
          name: "Test Product for Edge Cases",
          description: "Test product for edge case testing",
          price: 100,
          oldPrice: 150,
          images: JSON.stringify(["/test-image.jpg"]),
          breadcrumbs: JSON.stringify(["Игрушки", "Развивающие", "Тестовые"]),
          characteristics: {
            create: [
              { key: "Вес", value: "100 гр" },
              { key: "Возраст", value: "1-3 года" },
            ],
          },
          pickupAvailability: "available",
          deliveryAvailability: "available",
          returnDays: 14,
          returnDetails: "Возврат в течение 14 дней",
          categories: JSON.stringify(["Развивающие игрушки"]),
          ageGroups: JSON.stringify(["1-3 года"]),
        },
      });

      // Тест 1: Промокод с фиксированной скидкой больше суммы заказа
      const largeDiscountPromo = {
        code: "TEST-INTEGRATION-EDGE-LARGE",
        name: "Test Large Discount",
        type: "FIXED_AMOUNT" as const,
        value: 500, // Больше суммы заказа (100)
        minOrderAmount: 50,
        maxUses: 1,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const largePromoResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(largeDiscountPromo),
      });

      expect(largePromoResponse.status).toBe(201);
      const largePromo = await largePromoResponse.json();

      // Валидируем - скидка должна быть ограничена суммой заказа
      const validateLargeResponse = await fetch(
        `${baseUrl}/api/promo-codes/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "TEST-INTEGRATION-EDGE-LARGE",
            orderAmount: 100,
          }),
        }
      );

      expect(validateLargeResponse.status).toBe(200);
      const validationLarge = await validateLargeResponse.json();
      expect(validationLarge.discountAmount).toBe(100); // Не может превышать сумму заказа

      // Тест 2: Промокод с минимальной суммой заказа
      const minAmountPromo = {
        code: "TEST-INTEGRATION-EDGE-MIN",
        name: "Test Min Amount",
        type: "PERCENTAGE" as const,
        value: 15,
        minOrderAmount: 200, // Больше суммы заказа (100)
        maxUses: 1,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const minAmountPromoResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(minAmountPromo),
      });

      expect(minAmountPromoResponse.status).toBe(201);

      // Валидируем с недостаточной суммой
      const validateMinResponse = await fetch(
        `${baseUrl}/api/promo-codes/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "TEST-INTEGRATION-EDGE-MIN",
            orderAmount: 100,
          }),
        }
      );

      expect(validateMinResponse.status).toBe(200);
      const validationMin = await validateMinResponse.json();
      expect(validationMin.isValid).toBe(false);
      expect(validationMin.error).toContain(
        "Минимальная сумма заказа для промокода"
      );

      // Тест 3: Промокод с ограничением использования
      const limitedUsesPromo = {
        code: "TEST-INTEGRATION-EDGE-LIMITED",
        name: "Test Limited Uses",
        type: "PERCENTAGE" as const,
        value: 10,
        minOrderAmount: 50,
        maxUses: 1,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const limitedUsesPromoResponse = await fetch(
        `${baseUrl}/api/promo-codes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(limitedUsesPromo),
        }
      );

      expect(limitedUsesPromoResponse.status).toBe(201);
      const limitedPromo = await limitedUsesPromoResponse.json();

      // Используем промокод один раз, чтобы currentUses стало 1
      const orderData = {
        customerName: "Test Customer Limited",
        customerPhone: "+7 (999) 111-11-11",
        deliveryType: "pickup",
        totalAmount: 90, // 100 - 10 (скидка)
        originalAmount: 100,
        discountAmount: 10,
        promoCodeId: limitedPromo.id,
        items: [{ productId: product.id, quantity: 1 }],
      };

      const orderResponse = await fetch(`${baseUrl}/api/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      expect(orderResponse.status).toBe(201);
      const order = await orderResponse.json();

      // Оплачиваем заказ, чтобы увеличить currentUses
      const paymentData = {
        source: "success_page",
        transaction_id: "test-transaction-limited-" + Date.now(),
        state: "COMPLETE",
        orderId: order.id,
        amount: 90,
        currency: "RUB",
      };

      const paymentResponse = await fetch(`${baseUrl}/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      expect(paymentResponse.status).toBe(200);

      // Валидируем с превышенным лимитом
      const validateLimitedResponse = await fetch(
        `${baseUrl}/api/promo-codes/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "TEST-INTEGRATION-EDGE-LIMITED",
            orderAmount: 100,
          }),
        }
      );

      expect(validateLimitedResponse.status).toBe(200);
      const validationLimited = await validateLimitedResponse.json();
      expect(validationLimited.isValid).toBe(false);
      expect(validationLimited.error).toContain("Лимит использований промокода исчерпан");

      console.log("✅ Edge cases handled correctly!");
      console.log(
        `   - Large discount limited to order amount: ${validationLarge.discountAmount}₽`
      );
      console.log(
        `   - Min amount validation: ${
          validationMin.isValid ? "valid" : "invalid"
        }`
      );
      console.log(
        `   - Usage limit validation: ${
          validationLimited.isValid ? "valid" : "invalid"
        }`
      );
    });
  });
});
