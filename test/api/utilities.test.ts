import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  transformProductFromDB,
  validateProductData,
} from "@/lib/product-utils";
import { transformOrderFromDB } from "@/lib/order-utils";
import { generateSignature } from "@/lib/modulbank";

const prisma = new PrismaClient();

describe("Utility Functions Tests", () => {
  describe("Product Utilities", () => {
    describe("transformProductFromDB", () => {
      it("should transform product from database format", () => {
        const dbProduct = {
          id: "test-id",
          name: "Test Product",
          breadcrumbs: '["Главная", "Каталог", "Тест"]',
          images: '["image1.jpg", "image2.jpg"]',
          price: 1000,
          oldPrice: 1200,
          discountPercent: 17,
          currency: "₽",
          favorite: false,
          pickupAvailability: "Самовывоз сегодня",
          deliveryAvailability: "Доставка от 1 дня",
          returnDays: 14,
          returnDetails: "Возврат в течение 14 дней",
          description: "Test description",
          categories: '["Категория 1", "Категория 2"]',
          ageGroups: '["3+", "4+"]',
          createdAt: new Date(),
          updatedAt: new Date(),
          characteristics: [
            {
              id: "char1",
              productId: "test-id",
              key: "Материал",
              value: "Дерево",
            },
            { id: "char2", productId: "test-id", key: "Возраст", value: "3+" },
          ],
        };

        const transformed = transformProductFromDB(dbProduct as any);

        expect(transformed).toHaveProperty("id", "test-id");
        expect(transformed).toHaveProperty("name", "Test Product");
        expect(transformed).toHaveProperty("price");
        expect(transformed.price).toHaveProperty("current", 1000);
        expect(transformed.price).toHaveProperty("old", 1200);
        expect(transformed).toHaveProperty("discountPercent", 17);
        expect(transformed).toHaveProperty("images");
        expect(Array.isArray(transformed.images)).toBe(true);
        expect(transformed.images).toEqual(["image1.jpg", "image2.jpg"]);
        expect(transformed).toHaveProperty("breadcrumbs");
        expect(Array.isArray(transformed.breadcrumbs)).toBe(true);
        expect(transformed.breadcrumbs).toEqual(["Главная", "Каталог", "Тест"]);
        expect(transformed).toHaveProperty("characteristics");
        expect(Array.isArray(transformed.characteristics)).toBe(true);
        expect(transformed.characteristics).toHaveLength(2);
        expect(transformed).toHaveProperty("categories");
        expect(Array.isArray(transformed.categories)).toBe(true);
        expect(transformed.categories).toEqual(["Категория 1", "Категория 2"]);
        expect(transformed).toHaveProperty("ageGroups");
        expect(Array.isArray(transformed.ageGroups)).toBe(true);
        expect(transformed.ageGroups).toEqual(["3+", "4+"]);
      });

      it("should handle null values correctly", () => {
        const dbProduct = {
          id: "test-id",
          name: "Test Product",
          breadcrumbs: '["Главная", "Каталог", "Тест"]',
          images: '["image1.jpg"]',
          price: 1000,
          oldPrice: null,
          discountPercent: null,
          currency: "₽",
          favorite: false,
          pickupAvailability: "Самовывоз сегодня",
          deliveryAvailability: "Доставка от 1 дня",
          returnDays: 14,
          returnDetails: "Возврат в течение 14 дней",
          description: "Test description",
          categories: null,
          ageGroups: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          characteristics: [],
        };

        const transformed = transformProductFromDB(dbProduct as any);

        expect(transformed.price.old).toBeNull();
        expect(transformed.discountPercent).toBeNull();
        expect(transformed.categories).toEqual([]);
        expect(transformed.ageGroups).toEqual([]);
      });

      it("should handle invalid JSON gracefully", () => {
        const dbProduct = {
          id: "test-id",
          name: "Test Product",
          breadcrumbs: "invalid json",
          images: "invalid json",
          price: 1000,
          oldPrice: null,
          discountPercent: null,
          currency: "₽",
          favorite: false,
          pickupAvailability: "Самовывоз сегодня",
          deliveryAvailability: "Доставка от 1 дня",
          returnDays: 14,
          returnDetails: "Возврат в течение 14 дней",
          description: "Test description",
          categories: "invalid json",
          ageGroups: "invalid json",
          createdAt: new Date(),
          updatedAt: new Date(),
          characteristics: [],
        };

        const transformed = transformProductFromDB(dbProduct as any);

        expect(transformed.breadcrumbs).toEqual([]);
        expect(transformed.images).toEqual([]);
        expect(transformed.categories).toEqual([]);
        expect(transformed.ageGroups).toEqual([]);
      });
    });

    describe("validateProductData", () => {
      it("should validate correct product data", () => {
        const validData = {
          name: "Test Product",
          breadcrumbs: ["Главная", "Каталог", "Тест"],
          images: ["image1.jpg", "image2.jpg"],
          price: 1000,
          currency: "₽",
          pickupAvailability: "Самовывоз сегодня",
          deliveryAvailability: "Доставка от 1 дня",
          returnDetails: "Возврат в течение 14 дней",
          description: "Test description",
          characteristics: [
            { key: "Материал", value: "Дерево" },
            { key: "Возраст", value: "3+" },
          ],
        };

        const errors = validateProductData(validData);
        expect(errors).toHaveLength(0);
      });

      it("should detect missing required fields", () => {
        const invalidData = {
          // Отсутствует name
          images: ["image1.jpg"],
          price: 1000,
        };

        const errors = validateProductData(invalidData);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.includes("name"))).toBe(true);
      });

      it("should validate price is positive", () => {
        const invalidData = {
          name: "Test Product",
          breadcrumbs: ["Главная", "Каталог", "Тест"],
          images: ["image1.jpg"],
          price: -100,
          currency: "₽",
          pickupAvailability: "Самовывоз сегодня",
          deliveryAvailability: "Доставка от 1 дня",
          returnDetails: "Возврат в течение 14 дней",
          description: "Test description",
          characteristics: [],
        };

        const errors = validateProductData(invalidData);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.includes("price"))).toBe(true);
      });

      it("should validate discount percent range", () => {
        const invalidData = {
          name: "Test Product",
          breadcrumbs: ["Главная", "Каталог", "Тест"],
          images: ["image1.jpg"],
          price: 1000,
          oldPrice: 1200,
          discountPercent: 150, // Больше 100%
          currency: "₽",
          pickupAvailability: "Самовывоз сегодня",
          deliveryAvailability: "Доставка от 1 дня",
          returnDetails: "Возврат в течение 14 дней",
          description: "Test description",
          characteristics: [],
        };

        const errors = validateProductData(invalidData);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.includes("discount"))).toBe(true);
      });

      it("should validate characteristics structure", () => {
        const invalidData = {
          name: "Test Product",
          breadcrumbs: ["Главная", "Каталог", "Тест"],
          images: ["image1.jpg"],
          price: 1000,
          currency: "₽",
          pickupAvailability: "Самовывоз сегодня",
          deliveryAvailability: "Доставка от 1 дня",
          returnDetails: "Возврат в течение 14 дней",
          description: "Test description",
          characteristics: [
            { key: "Материал" }, // Отсутствует value
            { value: "3+" }, // Отсутствует key
          ],
        };

        const errors = validateProductData(invalidData);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.includes("characteristics"))).toBe(
          true
        );
      });
    });
  });

  describe("Order Utilities", () => {
    describe("transformOrderFromDB", () => {
      it("should transform order from database format", () => {
        const dbOrder = {
          id: "order-id",
          orderNumber: "2024-001",
          status: "CREATED",
          customerName: "Test Customer",
          customerPhone: "+7 (999) 123-45-67",
          customerEmail: "test@example.com",
          deliveryType: "delivery",
          deliveryAddress: "Test Address",
          totalAmount: 1500,
          currency: "₽",
          createdAt: new Date(),
          updatedAt: new Date(),
          paidAt: null,
          items: [
            {
              id: "item1",
              orderId: "order-id",
              productId: "product1",
              quantity: 2,
              price: 750,
              product: {
                id: "product1",
                name: "Test Product",
                images: '["image1.jpg"]',
                price: 750,
                currency: "₽",
              },
            },
          ],
        };

        const transformed = transformOrderFromDB(dbOrder as any);

        expect(transformed).toHaveProperty("id", "order-id");
        expect(transformed).toHaveProperty("orderNumber", "2024-001");
        expect(transformed).toHaveProperty("status", "CREATED");
        expect(transformed).toHaveProperty("customerName", "Test Customer");
        expect(transformed).toHaveProperty(
          "customerPhone",
          "+7 (999) 123-45-67"
        );
        expect(transformed).toHaveProperty("customerEmail", "test@example.com");
        expect(transformed).toHaveProperty("deliveryType", "delivery");
        expect(transformed).toHaveProperty("deliveryAddress", "Test Address");
        expect(transformed).toHaveProperty("totalAmount", 1500);
        expect(transformed).toHaveProperty("currency", "₽");
        expect(transformed).toHaveProperty("items");
        expect(Array.isArray(transformed.items)).toBe(true);
        expect(transformed.items).toHaveLength(1);
        expect(transformed.items[0]).toHaveProperty("quantity", 2);
        expect(transformed.items[0]).toHaveProperty("price", 750);
        expect(transformed.items[0]).toHaveProperty("product");
        expect(transformed.items[0].product).toHaveProperty(
          "name",
          "Test Product"
        );
      });

      it("should handle order without items", () => {
        const dbOrder = {
          id: "order-id",
          orderNumber: "2024-001",
          status: "CREATED",
          customerName: "Test Customer",
          customerPhone: "+7 (999) 123-45-67",
          customerEmail: null,
          deliveryType: "pickup",
          deliveryAddress: null,
          totalAmount: 0,
          currency: "₽",
          createdAt: new Date(),
          updatedAt: new Date(),
          paidAt: null,
          items: [],
        };

        const transformed = transformOrderFromDB(dbOrder as any);

        expect(transformed).toHaveProperty("id", "order-id");
        expect(transformed).toHaveProperty("customerEmail", null);
        expect(transformed).toHaveProperty("deliveryAddress", null);
        expect(transformed).toHaveProperty("items");
        expect(Array.isArray(transformed.items)).toBe(true);
        expect(transformed.items).toHaveLength(0);
      });
    });
  });

  describe("Modulbank Utilities", () => {
    describe("generateModulbankSignature", () => {
      it("should generate valid signature", () => {
        const testData = {
          merchant: "test_store",
          order_id: "test_order",
          amount: "1500.00",
          description: "Test payment",
          success_url: "https://example.com/success",
          testing: "1",
          unix_timestamp: Math.floor(Date.now() / 1000).toString(),
          salt: "test_salt",
        };

        const secretKey = "test_secret_key";
        const signature = generateSignature(testData, secretKey);

        expect(signature).toBeTruthy();
        expect(typeof signature).toBe("string");
        expect(signature.length).toBeGreaterThan(0);
      });

      it("should generate consistent signatures for same data", () => {
        const testData = {
          merchant: "test_store",
          order_id: "test_order",
          amount: "1500.00",
          description: "Test payment",
          success_url: "https://example.com/success",
          testing: "1",
          unix_timestamp: Math.floor(Date.now() / 1000).toString(),
          salt: "test_salt",
        };

        const secretKey = "test_secret_key";
        const signature1 = generateSignature(testData, secretKey);
        const signature2 = generateSignature(testData, secretKey);

        expect(signature1).toBe(signature2);
      });

      it("should generate different signatures for different data", () => {
        const data1 = {
          merchant: "test_store",
          order_id: "test_order_1",
          amount: "1500.00",
          description: "Test payment",
          success_url: "https://example.com/success",
          testing: "1",
          unix_timestamp: Math.floor(Date.now() / 1000).toString(),
          salt: "test_salt",
        };

        const data2 = {
          merchant: "test_store",
          order_id: "test_order_2",
          amount: "1500.00",
          description: "Test payment",
          success_url: "https://example.com/success",
          testing: "1",
          unix_timestamp: Math.floor(Date.now() / 1000).toString(),
          salt: "test_salt",
        };

        const secretKey = "test_secret_key";
        const signature1 = generateSignature(data1, secretKey);
        const signature2 = generateSignature(data2, secretKey);

        expect(signature1).not.toBe(signature2);
      });

      it("should handle empty data", () => {
        const testData = {};
        const secretKey = "test_secret_key";
        const signature = generateSignature(testData, secretKey);

        expect(signature).toBeTruthy();
        expect(typeof signature).toBe("string");
      });
    });
  });

  describe("Database Utilities", () => {
    it("should connect to database", async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
      await prisma.$disconnect();
    });

    it("should handle database queries", async () => {
      await prisma.$connect();

      // Test simple query
      const productCount = await prisma.product.count();
      expect(typeof productCount).toBe("number");
      expect(productCount).toBeGreaterThanOrEqual(0);

      await prisma.$disconnect();
    });
  });
});
