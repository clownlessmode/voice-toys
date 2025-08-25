const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Простая функция для генерации номера заказа
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${year}-${randomPart}`;
}

async function testCdekIntegration() {
  let testOrderId;
  let testProductId;

  try {
    console.log("🚀 Starting CDEK integration test...");

    // 1. Создаем тестовый продукт
    console.log("📦 Creating test product...");
    const product = await prisma.product.create({
      data: {
        name: "Тестовая игрушка для СДЭК",
        breadcrumbs: JSON.stringify(["Игрушки", "Тестовые"]),
        images: JSON.stringify(["test-image.jpg"]),
        price: 1500,
        oldPrice: 2000,
        discountPercent: 25,
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
    testProductId = product.id;
    console.log("✅ Test product created:", product.id);

    // 2. Создаем тестовый заказ
    console.log("📋 Creating test order...");
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: "CREATED",
        customerName: "Тест Тестов",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test@example.com",
        deliveryType: "delivery",
        deliveryAddress: "44", // Код Москвы для тестирования
        totalAmount: 1500,
        currency: "₽",
        items: {
          create: [
            {
              productId: testProductId,
              quantity: 1,
              price: 1500,
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
    testOrderId = order.id;
    console.log("✅ Test order created:", {
      orderId: testOrderId,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    // 3. Проверяем начальное состояние
    console.log("🔍 Checking initial order status...");
    const initialOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log("📊 Initial order details:", {
      id: initialOrder.id,
      orderNumber: initialOrder.orderNumber,
      status: initialOrder.status,
      paidAt: initialOrder.paidAt,
      deliveryType: initialOrder.deliveryType,
      deliveryAddress: initialOrder.deliveryAddress,
      itemsCount: initialOrder.items.length,
    });

    // 4. Имитируем оплату заказа
    console.log("💳 Simulating payment...");
    const paymentResponse = await fetch(
      `http://localhost:3000/api/orders/${testOrderId}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "success_page",
          transaction_id: "test-transaction-123",
          state: "COMPLETE",
        }),
      }
    );

    if (!paymentResponse.ok) {
      throw new Error(
        `Payment failed: ${paymentResponse.status} ${paymentResponse.statusText}`
      );
    }

    const paymentResult = await paymentResponse.json();
    console.log("✅ Payment result:", paymentResult);

    // 5. Проверяем финальное состояние
    console.log("🔍 Checking final order status...");
    const paidOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log("📊 Final order details:", {
      id: paidOrder.id,
      orderNumber: paidOrder.orderNumber,
      status: paidOrder.status,
      paidAt: paidOrder.paidAt,
      deliveryType: paidOrder.deliveryType,
      deliveryAddress: paidOrder.deliveryAddress,
      itemsCount: paidOrder.items.length,
    });

    // 6. Проверяем, что заказ оплачен
    if (paidOrder.status !== "PAID") {
      throw new Error(`Order status is ${paidOrder.status}, expected PAID`);
    }

    if (!paidOrder.paidAt) {
      throw new Error("Order paidAt is null, expected timestamp");
    }

    console.log("🎯 CDEK integration test completed successfully!");
    console.log("📋 Summary:");
    console.log(`   - Order ID: ${paidOrder.id}`);
    console.log(`   - Order Number: ${paidOrder.orderNumber}`);
    console.log(`   - Status: ${paidOrder.status}`);
    console.log(`   - Paid At: ${paidOrder.paidAt}`);
    console.log(`   - Delivery Type: ${paidOrder.deliveryType}`);
    console.log(`   - Delivery Address: ${paidOrder.deliveryAddress}`);
    console.log("");
    console.log(
      "🔍 Check the server logs to see if CDEK order was created successfully."
    );
    console.log("📧 Check Telegram notifications if configured.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    // Очищаем тестовые данные
    console.log("🧹 Cleaning up test data...");
    try {
      if (testOrderId) {
        await prisma.orderItem.deleteMany({
          where: { orderId: testOrderId },
        });
        await prisma.order.delete({
          where: { id: testOrderId },
        });
        console.log("✅ Order cleaned up");
      }
      if (testProductId) {
        await prisma.product.delete({
          where: { id: testProductId },
        });
        console.log("✅ Product cleaned up");
      }
    } catch (error) {
      console.error("❌ Error cleaning up:", error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Запускаем тест
if (require.main === module) {
  testCdekIntegration()
    .then(() => {
      console.log("✅ All tests passed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}

module.exports = { testCdekIntegration };
