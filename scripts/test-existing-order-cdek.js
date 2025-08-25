const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testExistingOrderCdek() {
  try {
    console.log("🚀 Testing existing order with CDEK delivery...");

    // 1. Находим неоплаченный заказ или создаем новый
    let order = await prisma.order.findFirst({
      where: { status: "CREATED" },
      orderBy: { createdAt: "desc" },
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

    if (!order) {
      console.log("📋 No unpaid orders found, creating new test order...");

      // Создаем тестовый продукт с весом
      const product = await prisma.product.create({
        data: {
          name: "Тестовая игрушка для СДЭК 750г",
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

      // Создаем заказ
      order = await prisma.order.create({
        data: {
          orderNumber: `CDEK-TEST-${Date.now()}`,
          status: "CREATED",
          customerName: "Тест СДЭК",
          customerPhone: "+7 (999) 123-45-67",
          customerEmail: "test-cdek@example.com",
          deliveryType: "delivery",
          deliveryAddress: "44", // Код Москвы
          totalAmount: 2000,
          currency: "₽",
          items: {
            create: [
              {
                productId: product.id,
                quantity: 2,
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
    } else {
      console.log("📋 Found unpaid order:", order.orderNumber);
    }

    console.log("📊 Current status:", order.status);
    console.log("📦 Items count:", order.items.length);

    if (order.items.length > 0) {
      const firstItem = order.items[0];
      console.log("📦 First item:", {
        product: firstItem.product.name,
        quantity: firstItem.quantity,
        price: firstItem.price,
        characteristics: firstItem.product.characteristics,
      });
    }

    // 2. Убеждаемся, что тип доставки СДЭК
    if (order.deliveryType !== "delivery") {
      console.log("🔄 Changing delivery type to CDEK...");
      await prisma.order.update({
        where: { id: order.id },
        data: { deliveryType: "delivery" },
      });
      console.log("✅ Delivery type changed to CDEK");
    } else {
      console.log("✅ Delivery type already set to CDEK");
    }

    // 3. Убеждаемся, что адрес доставки Москва
    if (order.deliveryAddress !== "44") {
      console.log("🏪 Setting delivery address to Moscow (44)...");
      await prisma.order.update({
        where: { id: order.id },
        data: { deliveryAddress: "44" },
      });
      console.log("✅ Delivery address set to Moscow (44)");
    } else {
      console.log("✅ Delivery address already set to Moscow (44)");
    }

    // 4. Оплачиваем заказ
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
          transaction_id: `test-existing-cdek-${Date.now()}`,
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

    // 5. Проверяем финальное состояние
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
    console.log("   - Product weight: 750 grams");
    console.log("   - Total weight: 1500 grams (750g × 2 items)");
    console.log("   - Quantity: 2 items");
    console.log("   - Article: should include timestamp in dev mode");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testExistingOrderCdek();
