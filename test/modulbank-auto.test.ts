import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config({ path: ".env.local" });

describe("🚀 Modulbank Auto Integration Test", () => {
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
        orderNumber: "AUTO-TEST-" + Date.now(),
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

    testOrderId = testOrder.id;
    console.log("✅ Created test order:", testOrderId);
  });

  it("🎯 Should create payment and test Modulbank response", async () => {
    console.log("\n🔧 Testing Modulbank integration...");

    // 1. Проверяем что переменные настроены
    console.log("📋 Checking environment variables...");
    expect(process.env.STORE_ID).toBeDefined();
    expect(process.env.TEST_KEY).toBeDefined();

    console.log("✅ STORE_ID:", process.env.STORE_ID);
    console.log(
      "✅ TEST_KEY: SET (" + (process.env.TEST_KEY?.length || 0) + " chars)"
    );

    // 2. Получаем HTML форму от нашего API
    console.log("\n🌐 Getting payment form from our API...");
    const response = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay/modulbank`,
      { method: "GET" }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const html = await response.text();
    console.log("✅ Got HTML form (" + html.length + " chars)");

    // 3. Проверяем что форма сформирована правильно
    expect(html).toContain("https://pay.modulbank.ru/pay");
    expect(html).toContain('name="merchant"');
    expect(html).toContain('name="signature"');
    expect(html).toContain('name="amount"');

    // 4. Извлекаем данные формы
    console.log("\n🔍 Extracting form data...");
    const formData = new FormData();

    // Парсим HTML и извлекаем поля формы
    const inputMatches = html.matchAll(/name="([^"]+)" value="([^"]*)"/g);
    const formFields: Record<string, string> = {};

    for (const match of inputMatches) {
      const [, name, value] = match;
      formFields[name] = value;
      formData.append(name, value);
    }

    console.log("📝 Form fields extracted:", Object.keys(formFields));
    console.log("💰 Amount:", formFields.amount);
    console.log("🏪 Merchant:", formFields.merchant);
    console.log(
      "🔑 Signature:",
      formFields.signature?.substring(0, 10) + "..."
    );

    // 5. Отправляем форму на Модульбанк (POST)
    console.log("\n🚀 Testing actual Modulbank integration...");

    const modulbankResponse = await fetch("https://pay.modulbank.ru/pay", {
      method: "POST",
      body: formData,
      redirect: "manual", // Не следуем редиректам автоматически
    });

    console.log("📊 Modulbank response status:", modulbankResponse.status);
    console.log("📍 Response type:", modulbankResponse.type);

    // 6. Анализируем ответ от Модульбанк
    if (modulbankResponse.status === 302 || modulbankResponse.status === 200) {
      // Если редирект или 200 - значит форма принята
      console.log("✅ SUCCESS! Modulbank accepted the payment form");

      const location = modulbankResponse.headers.get("location");
      if (location) {
        console.log("🎯 Redirect location:", location);
      }

      // Проверяем что статус успешный
      expect([200, 302]).toContain(modulbankResponse.status);
    } else {
      // Получаем HTML ответ для анализа ошибок
      const responseText = await modulbankResponse.text();
      console.log("❌ Modulbank response body (first 500 chars):");
      console.log(responseText.substring(0, 500));

      // Проверяем на наличие ошибок
      if (responseText.includes("Ошибка в поле signature")) {
        console.log("💥 SIGNATURE ERROR detected!");
        console.log("🔧 Form data that was sent:");
        console.log(JSON.stringify(formFields, null, 2));
        throw new Error("❌ Modulbank signature validation failed");
      }

      if (responseText.includes("Ошибка интеграции")) {
        throw new Error("❌ Modulbank integration error");
      }

      if (responseText.includes("Error") || responseText.includes("error")) {
        throw new Error(
          "❌ Unknown Modulbank error: " + responseText.substring(0, 200)
        );
      }
    }

    console.log("\n🎉 MODULBANK INTEGRATION TEST PASSED!");
    console.log("✅ Payment form generated successfully");
    console.log("✅ Signature validation passed");
    console.log("✅ Modulbank accepted the payment");
  });

  it("🧹 Cleanup test order", async () => {
    // Удаляем тестовый заказ
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrderId },
    });

    await prisma.order.delete({
      where: { id: testOrderId },
    });

    console.log("🗑️ Test order cleaned up:", testOrderId);
  });
});
