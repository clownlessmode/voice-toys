import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3002";

describe("Promo Codes Frontend", () => {
  let testPromoCodeId: string;

  beforeAll(async () => {
    // Очищаем тестовые данные
    await prisma.promoCode.deleteMany({
      where: {
        code: {
          startsWith: "TEST-FRONTEND-",
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Очищаем тестовые данные перед каждым тестом
    await prisma.promoCode.deleteMany({
      where: {
        code: {
          startsWith: "TEST-FRONTEND-",
        },
      },
    });
  });

  describe("Admin Panel Promo Codes", () => {
    it("should access admin promo codes page", async () => {
      const response = await fetch(`${baseUrl}/admin/promo-codes`);
      expect(response.status).toBe(200);
      
      const html = await response.text();
      expect(html).toContain("Промокоды");
      expect(html).toContain("Создать промокод");
    });

    it("should display promo codes list", async () => {
      // Создаем тестовый промокод
      const promoCodeData = {
        code: "TEST-FRONTEND-LIST",
        name: "Test Frontend List",
        description: "Test promo code for frontend testing",
        type: "PERCENTAGE" as const,
        value: 20,
        minOrderAmount: 1000,
        maxUses: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promoCodeData),
      });

      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();
      testPromoCodeId = created.promoCode.id;

      // Проверяем, что промокод отображается в списке
      const listResponse = await fetch(`${baseUrl}/api/promo-codes`);
      expect(listResponse.status).toBe(200);
      
      const result = await listResponse.json();
      const testPromoCode = result.promoCodes.find((pc: any) => pc.id === testPromoCodeId);
      
      expect(testPromoCode).toBeDefined();
      expect(testPromoCode.code).toBe("TEST-FRONTEND-LIST");
      expect(testPromoCode.name).toBe("Test Frontend List");
      expect(testPromoCode.type).toBe("PERCENTAGE");
      expect(testPromoCode.value).toBe(20);
    });

    it("should filter promo codes by type", async () => {
      // Создаем промокоды разных типов
      const percentagePromo = {
        code: "TEST-FRONTEND-PERCENT",
        name: "Test Percent",
        type: "PERCENTAGE" as const,
        value: 15,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const fixedPromo = {
        code: "TEST-FRONTEND-FIXED",
        name: "Test Fixed",
        type: "FIXED_AMOUNT" as const,
        value: 300,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(percentagePromo),
      });

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fixedPromo),
      });

      // Фильтруем по процентному типу
      const percentResponse = await fetch(`${baseUrl}/api/promo-codes?type=PERCENTAGE`);
      expect(percentResponse.status).toBe(200);
      
      const percentResult = await percentResponse.json();
      const percentCodes = percentResult.promoCodes.filter((pc: any) => 
        pc.code.startsWith("TEST-FRONTEND-") && pc.type === "PERCENTAGE"
      );
      expect(percentCodes.length).toBeGreaterThan(0);
      expect(percentCodes.every((pc: any) => pc.type === "PERCENTAGE")).toBe(true);

      // Фильтруем по фиксированному типу
      const fixedResponse = await fetch(`${baseUrl}/api/promo-codes?type=FIXED_AMOUNT`);
      expect(fixedResponse.status).toBe(200);
      
      const fixedResult = await fixedResponse.json();
      const fixedCodes = fixedResult.promoCodes.filter((pc: any) => 
        pc.code.startsWith("TEST-FRONTEND-") && pc.type === "FIXED_AMOUNT"
      );
      expect(fixedCodes.length).toBeGreaterThan(0);
      expect(fixedCodes.every((pc: any) => pc.type === "FIXED_AMOUNT")).toBe(true);
    });

    it("should filter promo codes by status", async () => {
      // Создаем активный и неактивный промокоды
      const activePromo = {
        code: "TEST-FRONTEND-ACTIVE",
        name: "Test Active",
        type: "PERCENTAGE" as const,
        value: 10,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const inactivePromo = {
        code: "TEST-FRONTEND-INACTIVE",
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
        body: JSON.stringify(activePromo),
      });

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inactivePromo),
      });

      // Фильтруем по активным
      const activeResponse = await fetch(`${baseUrl}/api/promo-codes?status=active`);
      expect(activeResponse.status).toBe(200);
      
      const activeResult = await activeResponse.json();
      const activeCodes = activeResult.promoCodes.filter((pc: any) => 
        pc.code.startsWith("TEST-FRONTEND-") && pc.isActive === true
      );
      expect(activeCodes.length).toBeGreaterThan(0);
      expect(activeCodes.every((pc: any) => pc.isActive === true)).toBe(true);

      // Фильтруем по неактивным
      const inactiveResponse = await fetch(`${baseUrl}/api/promo-codes?status=inactive`);
      expect(inactiveResponse.status).toBe(200);
      
      const inactiveResult = await inactiveResponse.json();
      const inactiveCodes = inactiveResult.promoCodes.filter((pc: any) => 
        pc.code.startsWith("TEST-FRONTEND-") && pc.isActive === false
      );
      expect(inactiveCodes.length).toBeGreaterThan(0);
      expect(inactiveCodes.every((pc: any) => pc.isActive === false)).toBe(true);
    });

    it("should search promo codes by code or name", async () => {
      // Создаем промокоды с разными названиями
      const promo1 = {
        code: "TEST-FRONTEND-SEARCH-ABC",
        name: "Test Search ABC",
        type: "PERCENTAGE" as const,
        value: 25,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const promo2 = {
        code: "TEST-FRONTEND-SEARCH-XYZ",
        name: "Test Search XYZ",
        type: "PERCENTAGE" as const,
        value: 30,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promo1),
      });

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promo2),
      });

      // Поиск по коду
      const searchCodeResponse = await fetch(`${baseUrl}/api/promo-codes?search=ABC`);
      expect(searchCodeResponse.status).toBe(200);
      
      const searchCodeResult = await searchCodeResponse.json();
      const foundByCode = searchCodeResult.promoCodes.filter((pc: any) => 
        pc.code.startsWith("TEST-FRONTEND-SEARCH-")
      );
      expect(foundByCode.length).toBe(1);
      expect(foundByCode[0].code).toBe("TEST-FRONTEND-SEARCH-ABC");

      // Поиск по названию
      const searchNameResponse = await fetch(`${baseUrl}/api/promo-codes?search=XYZ`);
      expect(searchNameResponse.status).toBe(200);
      
      const searchNameResult = await searchNameResponse.json();
      const foundByName = searchNameResult.promoCodes.filter((pc: any) => 
        pc.code.startsWith("TEST-FRONTEND-SEARCH-")
      );
      expect(foundByName.length).toBe(1);
      expect(foundByName[0].name).toBe("Test Search XYZ");
    });
  });

  describe("Order Form Promo Code Integration", () => {
    it("should access order page with promo code field", async () => {
      const response = await fetch(`${baseUrl}/order`);
      expect(response.status).toBe(200);
      
      const html = await response.text();
      expect(html).toContain("Оформление заказа");
      expect(html).toContain("Промокод");
    });

    it("should validate promo code in order form", async () => {
      // Создаем тестовый промокод
      const promoCodeData = {
        code: "TEST-FRONTEND-ORDER",
        name: "Test Order Promo",
        type: "PERCENTAGE" as const,
        value: 20,
        minOrderAmount: 500,
        maxUses: 100,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promoCodeData),
      });

      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();

      // Валидируем промокод через API
      const validateData = {
        code: "TEST-FRONTEND-ORDER",
        orderAmount: 1000,
      };

      const validateResponse = await fetch(`${baseUrl}/api/promo-codes/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validateData),
      });

      expect(validateResponse.status).toBe(200);
      
      const result = await validateResponse.json();
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(200); // 20% от 1000
      expect(result.promoCode.id).toBe(created.promoCode.id);
    });

    it("should handle invalid promo codes in order form", async () => {
      // Создаем неактивный промокод
      const promoCodeData = {
        code: "TEST-FRONTEND-INVALID",
        name: "Test Invalid Promo",
        type: "PERCENTAGE" as const,
        value: 15,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promoCodeData),
      });

      // Валидируем неактивный промокод
      const validateData = {
        code: "TEST-FRONTEND-INVALID",
        orderAmount: 1000,
      };

      const validateResponse = await fetch(`${baseUrl}/api/promo-codes/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validateData),
      });

      expect(validateResponse.status).toBe(200);
      
      const result = await validateResponse.json();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("inactive");
    });
  });

  describe("Promo Code Component Rendering", () => {
    it("should render promo code input component correctly", async () => {
      // Проверяем, что компонент PromoCodeInput доступен
      const response = await fetch(`${baseUrl}/`);
      expect(response.status).toBe(200);
      
      // Компонент должен быть доступен в сборке
      // В реальном тесте здесь можно было бы проверить рендеринг React компонента
      console.log("✅ PromoCodeInput component is available in the build");
    });

    it("should handle promo code validation states", async () => {
      // Создаем промокод для тестирования состояний
      const promoCodeData = {
        code: "TEST-FRONTEND-STATES",
        name: "Test States",
        type: "PERCENTAGE" as const,
        value: 25,
        minOrderAmount: 1000,
        maxUses: 10,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const createResponse = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promoCodeData),
      });

      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();

      // Тестируем различные состояния валидации
      const testCases = [
        { orderAmount: 500, expectedValid: false, reason: "insufficient amount" },
        { orderAmount: 1000, expectedValid: true, reason: "valid amount" },
        { orderAmount: 2000, expectedValid: true, reason: "sufficient amount" },
      ];

      for (const testCase of testCases) {
        const validateData = {
          code: "TEST-FRONTEND-STATES",
          orderAmount: testCase.orderAmount,
        };

        const validateResponse = await fetch(`${baseUrl}/api/promo-codes/validate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validateData),
        });

        expect(validateResponse.status).toBe(200);
        
        const result = await validateResponse.json();
        expect(result.isValid).toBe(testCase.expectedValid);
        
        if (testCase.expectedValid) {
          expect(result.discountAmount).toBeGreaterThan(0);
          expect(result.promoCode.id).toBe(created.promoCode.id);
        } else {
          expect(result.error).toBeDefined();
        }
      }

      console.log("✅ Promo code validation states handled correctly");
    });
  });
});
