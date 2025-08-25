import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3002"; // Используем порт 3002

describe("Promo Codes API", () => {
  let testPromoCodeId: string;

  beforeAll(async () => {
    // Очищаем тестовые данные
    await prisma.order.deleteMany({
      where: {
        orderNumber: {
          startsWith: "TEST-PROMO-",
        },
      },
    });
    await prisma.promoCode.deleteMany({
      where: {
        code: {
          startsWith: "TEST",
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
          startsWith: "TEST-PROMO-",
        },
      },
    });
    await prisma.promoCode.deleteMany({
      where: {
        code: {
          startsWith: "TEST",
        },
      },
    });
  });

  describe("POST /api/promo-codes", () => {
    it("should create a new promo code", async () => {
      const promoCodeData = {
        code: "TEST20",
        name: "Test 20% Discount",
        description: "Test promo code for 20% discount",
        type: "PERCENTAGE" as const,
        value: 20,
        minOrderAmount: 1000,
        maxUses: 100,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        isActive: true,
      };

      const response = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promoCodeData),
      });

      expect(response.status).toBe(201);
      const result = await response.json();

      expect(result).toBeDefined();
      expect(result.code).toBe("TEST20");
      expect(result.type).toBe("PERCENTAGE");
      expect(result.value).toBe(20);
      expect(result.currentUses).toBe(0);
      expect(result.isActive).toBe(true);

      testPromoCodeId = result.id;
    });

    it("should create a fixed amount promo code", async () => {
      const promoCodeData = {
        code: "TEST500",
        name: "Test 500₽ Discount",
        description: "Test promo code for 500₽ discount",
        type: "FIXED_AMOUNT" as const,
        value: 500,
        minOrderAmount: 2000,
        maxUses: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const response = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promoCodeData),
      });

      expect(response.status).toBe(201);
      const result = await response.json();

      expect(result.type).toBe("FIXED_AMOUNT");
      expect(result.value).toBe(500);
    });

    it("should reject duplicate promo code", async () => {
      // Создаем первый промокод
      const promoCodeData = {
        code: "TESTDUPLICATE",
        name: "Test Duplicate",
        type: "PERCENTAGE" as const,
        value: 10,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      // Пытаемся создать дубликат
      const response = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain("already exists");
    });
  });

  describe("GET /api/promo-codes", () => {
    it("should list all promo codes", async () => {
      // Создаем несколько тестовых промокодов
      const promoCode1 = {
        code: "TESTLIST1",
        name: "Test List 1",
        type: "PERCENTAGE" as const,
        value: 15,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const promoCode2 = {
        code: "TESTLIST2",
        name: "Test List 2",
        type: "FIXED_AMOUNT" as const,
        value: 300,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCode1),
      });

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCode2),
      });

      const response = await fetch(`${baseUrl}/api/promo-codes`);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.promoCodes).toBeDefined();
      expect(Array.isArray(result.promoCodes)).toBe(true);

      // Проверяем, что наши тестовые промокоды есть в списке
      const testCodes = result.promoCodes.filter((pc: any) =>
        pc.code.startsWith("TESTLIST")
      );
      expect(testCodes).toHaveLength(2);
    });

    it("should filter promo codes by type", async () => {
      const response = await fetch(
        `${baseUrl}/api/promo-codes?type=PERCENTAGE`
      );
      expect(response.status).toBe(200);

      const result = await response.json();
      const percentageCodes = result.promoCodes.filter(
        (pc: any) => pc.type === "PERCENTAGE"
      );
      expect(percentageCodes.length).toBeGreaterThan(0);
      expect(percentageCodes.every((pc: any) => pc.type === "PERCENTAGE")).toBe(
        true
      );
    });

    it("should filter promo codes by status", async () => {
      const response = await fetch(`${baseUrl}/api/promo-codes?status=active`);
      expect(response.status).toBe(200);

      const result = await response.json();
      const activeCodes = result.promoCodes.filter(
        (pc: any) => pc.isActive === true
      );
      expect(activeCodes.length).toBeGreaterThan(0);
      expect(activeCodes.every((pc: any) => pc.isActive === true)).toBe(true);
    });
  });

  describe("GET /api/promo-codes/[id]", () => {
    it("should get promo code by ID", async () => {
      // Создаем промокод для теста
      const promoCodeData = {
        code: "TESTGET",
        name: "Test Get",
        type: "PERCENTAGE" as const,
        value: 25,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      const created = await createResponse.json();
      const promoCodeId = created.id;

      // Получаем промокод по ID
      const response = await fetch(`${baseUrl}/api/promo-codes/${promoCodeId}`);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.id).toBe(promoCodeId);
      expect(result.code).toBe("TESTGET");
    });

    it("should return 404 for non-existent promo code", async () => {
      const response = await fetch(
        `${baseUrl}/api/promo-codes/non-existent-id`
      );
      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/promo-codes/[id]", () => {
    it("should update promo code", async () => {
      // Создаем промокод для обновления
      const promoCodeData = {
        code: "TESTUPDATE",
        name: "Test Update",
        type: "PERCENTAGE" as const,
        value: 30,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      const created = await createResponse.json();
      const promoCodeId = created.id;

      // Обновляем промокод
      const updateData = {
        name: "Updated Test Name",
        value: 35,
        isActive: false,
      };

      const response = await fetch(
        `${baseUrl}/api/promo-codes/${promoCodeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.name).toBe("Updated Test Name");
      expect(result.value).toBe(35);
      expect(result.isActive).toBe(false);
    });
  });

  describe("DELETE /api/promo-codes/[id]", () => {
    it("should delete promo code", async () => {
      // Создаем промокод для удаления
      const promoCodeData = {
        code: "TESTDELETE",
        name: "Test Delete",
        type: "PERCENTAGE" as const,
        value: 40,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      const created = await createResponse.json();
      const promoCodeId = created.id;

      // Удаляем промокод
      const response = await fetch(
        `${baseUrl}/api/promo-codes/${promoCodeId}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(200);

      // Проверяем, что промокод действительно удален
      const getResponse = await fetch(
        `${baseUrl}/api/promo-codes/${promoCodeId}`
      );
      expect(getResponse.status).toBe(404);
    });
  });

  describe("POST /api/promo-codes/validate", () => {
    it("should validate valid promo code", async () => {
      // Создаем активный промокод
      const promoCodeData = {
        code: "TESTVALID",
        name: "Test Valid",
        type: "PERCENTAGE" as const,
        value: 25,
        minOrderAmount: 1000,
        maxUses: 100,
        validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Вчера
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      const created = await createResponse.json();
      const promoCodeId = created.id;

      // Валидируем промокод
      const validateData = {
        code: "TESTVALID",
        orderAmount: 1500, // Больше минимальной суммы
      };

      const response = await fetch(`${baseUrl}/api/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validateData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.isValid).toBe(true);
      expect(result.promoCode.id).toBe(promoCodeId);
      expect(result.discountAmount).toBe(375); // 25% от 1500
    });

    it("should reject expired promo code", async () => {
      // Создаем истекший промокод
      const promoCodeData = {
        code: "TESTEXPIRED",
        name: "Test Expired",
        type: "PERCENTAGE" as const,
        value: 20,
        validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 дней назад
        validUntil: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 дней назад
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      // Валидируем истекший промокод
      const validateData = {
        code: "TESTEXPIRED",
        orderAmount: 1000,
      };

      const response = await fetch(`${baseUrl}/api/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validateData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("недействителен");
    });

    it("should reject inactive promo code", async () => {
      // Создаем неактивный промокод
      const promoCodeData = {
        code: "TESTINACTIVE",
        name: "Test Inactive",
        type: "PERCENTAGE" as const,
        value: 15,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      // Валидируем неактивный промокод
      const validateData = {
        code: "TESTINACTIVE",
        orderAmount: 1000,
      };

      const response = await fetch(`${baseUrl}/api/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validateData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("неактивен");
    });

    it("should reject promo code for insufficient order amount", async () => {
      // Создаем промокод с минимальной суммой
      const promoCodeData = {
        code: "TESTMINAMOUNT",
        name: "Test Min Amount",
        type: "PERCENTAGE" as const,
        value: 20,
        minOrderAmount: 2000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      // Валидируем с недостаточной суммой
      const validateData = {
        code: "TESTMINAMOUNT",
        orderAmount: 1500, // Меньше минимальной суммы
      };

      const response = await fetch(`${baseUrl}/api/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validateData),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Минимальная сумма заказа");
    });

    it("should reject promo code that exceeded max uses", async () => {
      // Создаем тестовый продукт
      const productData = {
        name: "Test Product for Max Uses",
        description: "Test product for max uses testing",
        price: 1000,
        oldPrice: 1200,
        images: ["/test-image.jpg"],
        breadcrumbs: ["Игрушки", "Тестовые"],
        characteristics: [
          { key: "Вес", value: "500 гр" },
          { key: "Возраст", value: "3-5 лет" },
        ],
        pickupAvailability: "available",
        deliveryAvailability: "available",
        returnDays: 14,
        returnDetails: "Возврат в течение 14 дней",
        categories: ["Тестовые игрушки"],
        ageGroups: ["3-5 лет"],
      };

      const productResponse = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      expect(productResponse.status).toBe(201);
      const product = await productResponse.json();

      // Создаем промокод с ограничением использования
      const promoCodeData = {
        code: "TESTMAXUSES",
        name: "Test Max Uses",
        type: "PERCENTAGE" as const,
        value: 10,
        maxUses: 1, // Max uses set to 1
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();

      // Используем промокод один раз, чтобы currentUses стало 1
      // Создаем тестовый заказ и оплачиваем его
      const orderData = {
        customerName: "Test Customer",
        customerPhone: "+7 (999) 123-45-67",
        deliveryType: "pickup",
        totalAmount: 900, // 1000 - 100 (скидка)
        originalAmount: 1000,
        discountAmount: 100,
        promoCodeId: created.id,
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
        transaction_id: "test-transaction-" + Date.now(),
        state: "COMPLETE",
        orderId: order.id,
        amount: 900,
        currency: "RUB",
      };

      const paymentResponse = await fetch(`${baseUrl}/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      expect(paymentResponse.status).toBe(200);

      // Проверяем, что currentUses увеличился
      const promoCodeCheck = await fetch(`${baseUrl}/api/promo-codes/${created.id}`);
      expect(promoCodeCheck.status).toBe(200);
      const promoCodeAfterUse = await promoCodeCheck.json();
      console.log("Promo code after use:", {
        id: promoCodeAfterUse.id,
        currentUses: promoCodeAfterUse.currentUses,
        maxUses: promoCodeAfterUse.maxUses
      });

      // Теперь промокод должен быть исчерпан
      const validateData = {
        code: "TESTMAXUSES",
        orderAmount: 1000,
      };

      const response = await fetch(`${baseUrl}/api/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validateData),
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      console.log("Validation result:", JSON.stringify(result, null, 2));
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Лимит использований промокода исчерпан");

      // Очищаем тестовые данные
      await fetch(`${baseUrl}/api/orders/${order.id}`, { method: "DELETE" });
      await fetch(`${baseUrl}/api/products/${product.id}`, { method: "DELETE" });
      await fetch(`${baseUrl}/api/promo-codes/${created.id}`, { method: "DELETE" });
    });

    it("should calculate percentage discount correctly", async () => {
      // Создаем процентный промокод
      const promoCodeData = {
        code: "TESTPERCENT",
        name: "Test Percent",
        type: "PERCENTAGE" as const,
        value: 30,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      // Валидируем с разными суммами
      const testCases = [
        { orderAmount: 1000, expectedDiscount: 300 },
        { orderAmount: 2000, expectedDiscount: 600 },
        { orderAmount: 500, expectedDiscount: 150 },
      ];

      for (const testCase of testCases) {
        const validateData = {
          code: "TESTPERCENT",
          orderAmount: testCase.orderAmount,
        };

        const response = await fetch(`${baseUrl}/api/promo-codes/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validateData),
        });

        expect(response.status).toBe(200);

        const result = await response.json();
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(testCase.expectedDiscount);
      }
    });

    it("should calculate fixed amount discount correctly", async () => {
      // Создаем фиксированный промокод
      const promoCodeData = {
        code: "TESTFIXED",
        name: "Test Fixed",
        type: "FIXED_AMOUNT" as const,
        value: 500,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCodeData),
      });

      // Валидируем с разными суммами
      const testCases = [
        { orderAmount: 1000, expectedDiscount: 500 },
        { orderAmount: 2000, expectedDiscount: 500 },
        { orderAmount: 300, expectedDiscount: 300 }, // Не может превышать сумму заказа
      ];

      for (const testCase of testCases) {
        const validateData = {
          code: "TESTFIXED",
          orderAmount: testCase.orderAmount,
        };

        const response = await fetch(`${baseUrl}/api/promo-codes/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validateData),
        });

        expect(response.status).toBe(200);

        const result = await response.json();
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(testCase.expectedDiscount);
      }
    });
  });
});
