const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testCdekWithDimensions() {
  try {
    console.log("🚀 Testing CDEK integration with dimensions...");

    // 1. Создаем тестовый продукт с габаритами
    console.log("📦 Creating product with dimensions...");
    const product = await prisma.product.create({
      data: {
        name: "Тестовая игрушка с габаритами для СДЭК",
        breadcrumbs: JSON.stringify(["Игрушки", "Тестовые"]),
        images: JSON.stringify(["test-image.jpg"]),
        price: 1200,
        oldPrice: 1500,
        discountPercent: 20,
        currency: "₽",
        favorite: false,
        pickupAvailability: "В наличии",
        deliveryAvailability: "Доступна доставка",
        returnDays: 14,
        returnDetails: "Возврат в течение 14 дней",
        description:
          "Тестовая игрушка для проверки CDEK интеграции с габаритами",
        categories: JSON.stringify(["test"]),
        ageGroups: JSON.stringify(["3-6"]),
        characteristics: {
          create: [
            {
              key: "Вес",
              value: "900 гр",
            },
            {
              key: "Ширина",
              value: "28 см",
            },
            {
              key: "Высота",
              value: "35 см",
            },
            {
              key: "Длина",
              value: "45 см",
            },
            {
              key: "Материал",
              value: "Дерево",
            },
          ],
        },
      },
      include: {
        characteristics: true,
      },
    });

    console.log("✅ Product created:", product.id);
    console.log("📋 Product characteristics:", product.characteristics);

    // 2. Создаем заказ
    console.log("📋 Creating order with dimensions product...");
    const order = await prisma.order.create({
      data: {
        orderNumber: `DIMENSIONS-TEST-${Date.now()}`,
        status: "CREATED",
        customerName: "Тест Габаритов",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test-dimensions@example.com",
        deliveryType: "delivery",
        deliveryAddress: "44", // Код Москвы
        totalAmount: 1200,
        currency: "₽",
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              price: 1200,
            },
          ],
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                characteristics: true,
              },
            },
          },
        },
      },
    });

    console.log("✅ Order created:", order.orderNumber);
    console.log("📊 Order details:");
    console.log("   - Items count:", order.items.length);
    console.log("   - First item quantity:", order.items[0].quantity);
    console.log(
      "   - Product weight:",
      order.items[0].product.characteristics.find((c) => c.key === "Вес")?.value
    );
    console.log("   - Product dimensions:", {
      width: order.items[0].product.characteristics.find(
        (c) => c.key === "Ширина"
      )?.value,
      height: order.items[0].product.characteristics.find(
        (c) => c.key === "Высота"
      )?.value,
      length: order.items[0].product.characteristics.find(
        (c) => c.key === "Длина"
      )?.value,
    });

    // 3. Оплачиваем заказ
    console.log("💳 Paying order...");
    const paymentResponse = await fetch(
      `http://localhost:3000/api/orders/${order.id}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "success_page",
          transaction_id: `test-dimensions-${Date.now()}`,
          state: "COMPLETE",
        }),
      }
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(
        `Payment failed: ${paymentResponse.status} ${paymentResponse.statusText} - ${errorText}`
      );
    }

    const paymentResult = await paymentResponse.json();
    console.log("✅ Payment successful!");

    // 4. Проверяем финальное состояние
    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });

    console.log("📊 Final order status:", finalOrder.status);
    console.log("📊 Paid at:", finalOrder.paidAt);
    console.log("🎯 Order number for CDEK check:", finalOrder.orderNumber);

    console.log(
      "\n🎯 Now check your CDEK dashboard for order:",
      finalOrder.orderNumber
    );
    console.log("Expected data in CDEK:");
    console.log("   - Product weight: 900 grams");
    console.log("   - Total weight: 900 grams");
    console.log("   - Quantity: 1 item");
    console.log("   - Package dimensions: 28x35x45 cm");
    console.log("   - Article: should include timestamp in dev mode");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCdekWithDimensions();
