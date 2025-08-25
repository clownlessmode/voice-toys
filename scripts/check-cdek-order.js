const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkCdekOrder(orderNumber) {
  try {
    console.log(`🔍 Checking CDEK order status for: ${orderNumber}`);

    // Найдем заказ в базе данных
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      console.log("❌ Order not found in database");
      return;
    }

    console.log("📋 Order details from database:");
    console.log(`   - ID: ${order.id}`);
    console.log(`   - Number: ${order.orderNumber}`);
    console.log(`   - Status: ${order.status}`);
    console.log(`   - Delivery Type: ${order.deliveryType}`);
    console.log(`   - Delivery Address: ${order.deliveryAddress}`);
    console.log(`   - Paid At: ${order.paidAt}`);
    console.log(`   - Items: ${order.items.length}`);

    if (order.status !== "PAID") {
      console.log("⚠️  Order is not paid yet");
      return;
    }

    if (order.deliveryType !== "delivery") {
      console.log("⚠️  Order is not for delivery");
      return;
    }

    // Здесь можно добавить проверку через API СДЭК
    // Но для этого нужны реальные учетные данные СДЭК
    console.log("");
    console.log("🔍 To check CDEK order status:");
    console.log("1. Log into your CDEK dashboard");
    console.log("2. Look for order number:", order.orderNumber);
    console.log("3. Check if the order was created successfully");
    console.log("");
    console.log(
      "📧 Also check Telegram notifications for CDEK order creation logs"
    );
  } catch (error) {
    console.error("❌ Error checking order:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Получаем номер заказа из аргументов командной строки
const orderNumber = process.argv[2];

if (!orderNumber) {
  console.log("Usage: node scripts/check-cdek-order.js <order_number>");
  console.log("Example: node scripts/check-cdek-order.js TEST-1756035001075");
  process.exit(1);
}

checkCdekOrder(orderNumber)
  .then(() => {
    console.log("✅ Check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });
