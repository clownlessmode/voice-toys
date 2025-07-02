import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import dotenv from "dotenv";

// Загружаем переменные окружения из .env.local
dotenv.config({ path: ".env.local" });

describe("Modulbank Integration", () => {
  let testOrderId: string;

  beforeAll(async () => {
    // Ищем существующий заказ или создаем с реальным продуктом
    let existingOrder = await prisma.order.findFirst({
      where: {
        status: "CREATED",
      },
    });

    if (!existingOrder) {
      // Получаем первый продукт из базы
      const firstProduct = await prisma.product.findFirst();

      if (!firstProduct) {
        throw new Error(
          "No products found in database. Please create a product first."
        );
      }

      // Создаем тестовый заказ с реальным продуктом
      existingOrder = await prisma.order.create({
        data: {
          orderNumber: "TEST-" + Date.now(),
          customerName: "Test User",
          customerPhone: "+7900000000",
          customerEmail: "test@example.com",
          deliveryType: "delivery",
          deliveryAddress: "Test Address",
          totalAmount: 1000,
          currency: "₽",
          status: "CREATED",
          items: {
            create: [
              {
                productId: firstProduct.id,
                quantity: 1,
                price: 1000,
              },
            ],
          },
        },
      });
    }

    testOrderId = existingOrder.id;
    console.log("Using test order ID:", testOrderId);
  });

  it("should create modulbank payment without errors", async () => {
    console.log("Testing Modulbank integration with order:", testOrderId);

    // Проверяем переменные окружения
    expect(process.env.STORE_ID).toBeDefined();
    expect(process.env.TEST_KEY).toBeDefined();
    // NODE_ENV может быть "test" или "development"

    console.log("Environment variables:");
    console.log("STORE_ID:", process.env.STORE_ID);
    console.log("TEST_KEY:", process.env.TEST_KEY ? "SET" : "NOT SET");
    console.log("NODE_ENV:", process.env.NODE_ENV);

    // Делаем запрос к нашему API
    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay/modulbank`,
      {
        method: "GET",
      }
    );

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const html = await response.text();
    console.log("Response HTML length:", html.length);
    console.log("First 500 chars:", html.substring(0, 500));

    // Проверяем что нет ошибки интеграции
    expect(html).not.toContain("Ошибка интеграции");
    expect(html).not.toContain("Error");
    expect(html).not.toContain("error");

    // Проверяем что есть форма для Модульбанк
    expect(html).toContain("https://pay.modulbank.ru/pay");
    expect(html).toContain("form");
    expect(html).toContain("merchant");
    expect(html).toContain("signature");

    // Проверяем что есть автоматическая отправка
    expect(html).toContain("submit()");

    console.log("✅ Modulbank integration test passed!");
  });

  it("should validate signature generation", async () => {
    const { generateSignature, MODULBANK_CONFIG } = await import(
      "@/lib/modulbank"
    );

    // Проверяем что конфигурация загружается правильно
    console.log("Modulbank config:");
    console.log("merchant:", MODULBANK_CONFIG.merchant);
    console.log("testMode:", MODULBANK_CONFIG.testMode);
    console.log("secretKey length:", MODULBANK_CONFIG.secretKey?.length || 0);

    expect(MODULBANK_CONFIG.merchant).toBeDefined();
    expect(MODULBANK_CONFIG.secretKey).toBeDefined();
    // testMode зависит от NODE_ENV (если не production - то true)

    // Тестируем генерацию подписи на простом примере
    const testData = {
      amount: "100.00",
      merchant: "test-merchant",
      order_id: "test-order",
      description: "Test payment",
      unix_timestamp: "1234567890",
      salt: "test-salt",
    };

    const signature = generateSignature(testData, "test-key");

    console.log("Test signature generation:");
    console.log("Data:", testData);
    console.log("Generated signature:", signature);

    expect(signature).toBeDefined();
    expect(signature).toHaveLength(40); // SHA-1 hash длина
    expect(signature).toMatch(/^[a-f0-9]{40}$/); // Только hex символы в нижнем регистре

    console.log("✅ Signature generation test passed!");
  });

  it("should handle non-existent order gracefully", async () => {
    const response = await fetch(
      `http://localhost:3000/api/orders/non-existent-id/pay/modulbank`,
      {
        method: "GET",
      }
    );

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Order not found");

    console.log("✅ Non-existent order handling test passed!");
  });
});
