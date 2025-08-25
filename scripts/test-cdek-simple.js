const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testCdekSimple() {
  try {
    console.log("🚀 Simple CDEK test...");

    // 1. Создаем простой заказ
    console.log("📦 Creating test product...");
    const product = await prisma.product.create({
      data: {
        name: "Тестовая игрушка для СДЭК",
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
        description: "Тестовая игрушка для проверки интеграции с СДЭК",
        categories: JSON.stringify(["test"]),
        ageGroups: JSON.stringify(["3-6"]),
      },
    });

    console.log("📋 Creating test order...");
    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-${Date.now()}`,
        status: "CREATED",
        customerName: "Тест Тестов",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "44", // Код Москвы
        totalAmount: 1000,
        currency: "₽",
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              price: 1000,
            },
          ],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log("✅ Order created:", order.orderNumber);

    // 2. Оплачиваем заказ
    console.log("💳 Paying order...");
    const paymentResponse = await fetch(
      `http://localhost:3001/api/orders/${order.id}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "success_page",
          transaction_id: `test-${Date.now()}`,
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
    console.log("✅ Payment result:", paymentResult);

    // 3. Проверяем финальное состояние
    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });

    console.log("📊 Final order status:", finalOrder.status);
    console.log("📊 Paid at:", finalOrder.paidAt);

    console.log(
      "🎯 Test completed! Check server logs for CDEK integration details."
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCdekSimple()
  .then(() => {
    console.log("✅ Simple test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Simple test failed:", error);
    process.exit(1);
  });
