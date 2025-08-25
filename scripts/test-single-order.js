const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testSingleOrder() {
  try {
    console.log("🚀 Creating single test order...");

    // 1. Создаем один продукт с характеристиками
    console.log("📦 Creating product with weight characteristics...");
    const product = await prisma.product.create({
      data: {
        name: "Тестовая игрушка с весом 750г",
        breadcrumbs: JSON.stringify(["Игрушки", "Тестовые"]),
        images: JSON.stringify(["test-image.jpg"]),
        price: 1000,
        oldPrice: 1200,
        discountPercent: 17,
        currency: "₽",
        favorite: false,
        pickupAvailability: "В наличии",
        deliveryAvailability: "Доступна доставка",
        returnDays: 14,
        returnDetails: "Возврат в течение 14 дней",
        description: "Тестовая игрушка для проверки веса",
        categories: JSON.stringify(["test"]),
        ageGroups: JSON.stringify(["3-6"]),
        characteristics: {
          create: [
            {
              key: "Вес",
              value: "750 гр",
            },
            {
              key: "Материал",
              value: "Пластик",
            },
          ],
        },
      },
      include: {
        characteristics: true,
      },
    });

    console.log("✅ Product created:", product.id);

    // 2. Создаем один заказ с 2 штуками товара
    console.log("📋 Creating order with 2 items...");
    const order = await prisma.order.create({
      data: {
        orderNumber: `SINGLE-TEST-${Date.now()}`,
        status: "CREATED",
        customerName: "Тест Покупатель",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "44", // Код Москвы
        totalAmount: 2000, // 1000 * 2
        currency: "₽",
        items: {
          create: [
            {
              productId: product.id,
              quantity: 2, // 2 штуки
              price: 1000,
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
    console.log(`   - Items count: ${order.items.length}`);
    console.log(`   - First item quantity: ${order.items[0].quantity}`);
    console.log(
      `   - Product weight: ${order.items[0].product.characteristics[0].value}`
    );

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
          transaction_id: `single-test-${Date.now()}`,
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

    console.log(
      "🎯 Single order test completed! Check server logs for CDEK integration details."
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleOrder()
  .then(() => {
    console.log("✅ Single order test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Single order test failed:", error);
    process.exit(1);
  });
