const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testRealCdekIntegration() {
  try {
    console.log("🚀 Testing real CDEK integration...");

    // Находим последний созданный заказ
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: "SINGLE-TEST",
        },
        status: "PAID",
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
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!order) {
      console.log("❌ No paid test order found");
      return;
    }

    console.log("📋 Found paid order:", order.orderNumber);
    console.log("📊 Order details:");
    console.log(`   - Status: ${order.status}`);
    console.log(`   - Paid at: ${order.paidAt}`);
    console.log(`   - Items count: ${order.items.length}`);
    console.log(`   - First item quantity: ${order.items[0].quantity}`);
    console.log(
      `   - Product weight: ${order.items[0].product.characteristics[0].value}`
    );

    console.log("\n🔍 Checking what should have been sent to CDEK:");
    console.log("   - Product weight: 750 гр → 0.75 kg");
    console.log("   - Total weight: 750g × 2 = 1500g → 1.5 kg");
    console.log("   - Quantity: 2 items");

    console.log("\n📋 To verify the integration:");
    console.log("   1. Check the CDEK dashboard for order:", order.orderNumber);
    console.log("   2. Look for weight: 0.75 kg per item, 1.5 kg total");
    console.log("   3. Check quantity: 2 items");

    console.log("\n💡 If you still see 0.001 kg in CDEK:");
    console.log("   - The server might not be using our updated code");
    console.log("   - Check server logs for weight calculations");
    console.log("   - Verify that the CDEK API received correct data");

    console.log("\n🔧 To check server logs:");
    console.log(
      "   - Look for lines starting with '📦 Product' and '📦 Total order weight'"
    );
    console.log(
      "   - These should show: 'weight = 750g (0.75kg)' and '1500g (1.5kg)'"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealCdekIntegration()
  .then(() => {
    console.log("✅ Real CDEK integration test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Real CDEK integration test failed:", error);
    process.exit(1);
  });
