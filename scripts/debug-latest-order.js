const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Простая функция для извлечения веса из характеристик
function extractProductWeightFromJson(characteristicsJson) {
  try {
    const characteristics = JSON.parse(characteristicsJson);

    if (!characteristics || !Array.isArray(characteristics)) {
      return 500; // DEFAULT_PRODUCT_WEIGHT_GRAMS
    }

    // Ищем характеристику с ключом "Вес"
    const weightChar = characteristics.find(
      (char) =>
        char.key.toLowerCase().includes("вес") ||
        char.key.toLowerCase().includes("weight")
    );

    if (!weightChar) {
      return 500; // DEFAULT_PRODUCT_WEIGHT_GRAMS
    }

    // Извлекаем числовое значение из строки
    const weightText = weightChar.value;
    const weightMatch = weightText.match(/(\d+(?:\.\d+)?)/);

    if (!weightMatch) {
      return 500; // DEFAULT_PRODUCT_WEIGHT_GRAMS
    }

    let weight = parseFloat(weightMatch[1]);

    // Определяем единицы измерения и конвертируем в граммы
    if (
      weightText.toLowerCase().includes("кг") ||
      weightText.toLowerCase().includes("kg")
    ) {
      weight *= 1000; // кг в граммы
    } else if (
      weightText.toLowerCase().includes("гр") ||
      weightText.toLowerCase().includes("г")
    ) {
      // уже в граммах
    } else {
      // По умолчанию считаем, что это граммы
    }

    console.log(`🔍 Weight extraction: "${weightText}" → ${weight}g`);

    // Проверяем, что вес в разумных пределах (от 1 до 100 кг)
    if (weight < 1 || weight > 100000) {
      return 500; // DEFAULT_PRODUCT_WEIGHT_GRAMS
    }

    return Math.round(weight);
  } catch (error) {
    console.warn("Failed to parse product characteristics JSON:", error);
    return 500; // DEFAULT_PRODUCT_WEIGHT_GRAMS
  }
}

async function debugLatestOrder() {
  try {
    console.log("🚀 Debugging latest test order...");

    // Находим последний созданный заказ
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: "SINGLE-TEST",
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
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!order) {
      console.log("❌ No test order found");
      return;
    }

    console.log("📋 Found order:", order.orderNumber);
    console.log("📊 Order details:");
    console.log(`   - Status: ${order.status}`);
    console.log(`   - Items count: ${order.items.length}`);
    console.log(`   - First item quantity: ${order.items[0].quantity}`);
    console.log(
      `   - Product characteristics:`,
      order.items[0].product.characteristics
    );

    // Симулируем подготовку данных для СДЭК точно как в нашем исправленном коде
    console.log("\n🔧 Simulating CDEK data preparation (with our fixes)...");

    const cdekItems = order.items.map((item) => {
      // Извлекаем вес из характеристик продукта (в граммах)
      const productWeightGrams = item.product.characteristics
        ? extractProductWeightFromJson(
            JSON.stringify(item.product.characteristics)
          )
        : 500;

      console.log(
        `📦 Product ${item.product.name}: weight = ${productWeightGrams}g`
      );

      return {
        name: item.product.name,
        ware_key: item.product.id,
        cost: Math.max(item.price, 1),
        weight: productWeightGrams, // Вес в граммах для СДЭК API
        amount: Math.max(item.quantity, 1),
        payment: {
          value: 0,
        },
      };
    });

    // Рассчитываем общий вес заказа (в граммах)
    const totalWeightGrams = cdekItems.reduce((weight, item) => {
      return weight + item.weight * item.amount; // Вес уже в граммах
    }, 0);

    console.log(`📦 Total order weight: ${totalWeightGrams}g`);

    const cdekData = {
      recipient: {
        name: order.customerName,
        phones: [
          { number: "+7" + order.customerPhone.replace(/\D/g, "").slice(-10) },
        ],
      },
      shipment_point: "MSK124",
      delivery_point: "44-1", // Правильный код офиса
      tariff_code: 136,
      packages: [
        {
          number: order.orderNumber,
          weight: totalWeightGrams, // Общий вес в граммах для СДЭК API
          items: cdekItems,
        },
      ],
    };

    console.log("\n📤 Expected CDEK data (with our fixes):");
    console.log(JSON.stringify(cdekData, null, 2));

    console.log("\n🎯 Expected results:");
    console.log(`   - Product weight in CDEK: ${cdekItems[0].weight} grams`);
    console.log(`   - Total weight in CDEK: ${totalWeightGrams} grams`);
    console.log(`   - Quantity: ${cdekItems[0].amount}`);

    console.log("\n🔍 If you see 0.001 kg in CDEK, it means:");
    console.log("   1. The server is not using our updated code");
    console.log("   2. Or there's an issue with the weight calculation");
    console.log("   3. Or the CDEK API is interpreting the data differently");

    console.log("\n💡 To fix this:");
    console.log("   1. Restart the development server (npm run dev)");
    console.log("   2. Check if the server logs show our weight calculations");
    console.log("   3. Verify that the CDEK API receives the correct weight");
  } catch (error) {
    console.error("❌ Debug failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLatestOrder()
  .then(() => {
    console.log("✅ Debug completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
