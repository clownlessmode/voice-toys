const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testExistingOrder() {
  try {
    console.log("🚀 Testing with existing order...");

    // 1. Найдем существующий заказ
    console.log("🔍 Looking for existing orders...");
    const existingOrders = await prisma.order.findMany({
      take: 10,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingOrders.length === 0) {
      console.log("❌ No orders found in database");
      return;
    }

    console.log(`📋 Found ${existingOrders.length} orders:`);
    existingOrders.forEach((order, index) => {
      console.log(
        `   ${index + 1}. ${order.orderNumber} - ${order.status} - ${
          order.deliveryType
        } - ${order.deliveryAddress || "N/A"}`
      );
    });

    // 2. Выберем заказ для тестирования (не оплаченный)
    const orderToTest =
      existingOrders.find((order) => order.status !== "PAID") ||
      existingOrders[0];
    console.log(
      `\n🎯 Selected order: ${orderToTest.orderNumber} (${orderToTest.status})`
    );

    // 3. Обновим заказ для тестирования
    console.log("📦 Updating order for CDEK test...");
    const updatedOrder = await prisma.order.update({
      where: { id: orderToTest.id },
      data: {
        deliveryType: "delivery",
        deliveryAddress: "44", // Код Москвы
        status: "CREATED", // Сбрасываем статус
        paidAt: null,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log("✅ Order updated:", {
      orderNumber: updatedOrder.orderNumber,
      deliveryType: updatedOrder.deliveryType,
      deliveryAddress: updatedOrder.deliveryAddress,
      status: updatedOrder.status,
      itemsCount: updatedOrder.items.length,
    });

    // 4. Оплачиваем заказ
    console.log("💳 Paying order...");
    const paymentResponse = await fetch(
      `http://localhost:3001/api/orders/${updatedOrder.id}/pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "success_page",
          transaction_id: `test-existing-${Date.now()}`,
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

    // 5. Проверяем финальное состояние
    console.log("🔍 Checking final order status...");
    const finalOrder = await prisma.order.findUnique({
      where: { id: updatedOrder.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log("📊 Final order details:", {
      id: finalOrder.id,
      orderNumber: finalOrder.orderNumber,
      status: finalOrder.status,
      paidAt: finalOrder.paidAt,
      deliveryType: finalOrder.deliveryType,
      deliveryAddress: finalOrder.deliveryAddress,
      itemsCount: finalOrder.items.length,
    });

    // 6. Проверяем, что заказ оплачен
    if (finalOrder.status !== "PAID") {
      throw new Error(`Order status is ${finalOrder.status}, expected PAID`);
    }

    if (!finalOrder.paidAt) {
      throw new Error("Order paidAt is null, expected timestamp");
    }

    console.log("🎯 Test completed successfully!");
    console.log("📋 Summary:");
    console.log(`   - Order ID: ${finalOrder.id}`);
    console.log(`   - Order Number: ${finalOrder.orderNumber}`);
    console.log(`   - Status: ${finalOrder.status}`);
    console.log(`   - Paid At: ${finalOrder.paidAt}`);
    console.log(`   - Delivery Type: ${finalOrder.deliveryType}`);
    console.log(`   - Delivery Address: ${finalOrder.deliveryAddress}`);
    console.log("");
    console.log(
      "🔍 Check the server logs above to see if CDEK order was created successfully."
    );
    console.log("📧 Check Telegram notifications if configured.");
    console.log("");
    console.log(
      "⚠️  IMPORTANT: Check your CDEK dashboard to verify the order was actually created!"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testExistingOrder()
  .then(() => {
    console.log("✅ Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
