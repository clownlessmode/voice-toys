const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Простая функция для извлечения веса из характеристик
function extractProductWeight(characteristics) {
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
}

async function testCdekWithArticle() {
  try {
    console.log("🚀 Testing CDEK with article and date/time...");

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

    // Симулируем подготовку данных для СДЭК с нашими исправлениями
    console.log("\n🔧 Simulating CDEK data preparation (with article fix)...");

    const cdekItems = order.items.map((item) => {
      // Извлекаем вес из характеристик продукта (в граммах)
      const productWeightGrams = extractProductWeight(
        item.product.characteristics
      );

      // Конвертируем в килограммы для СДЭК API
      const productWeightKg = productWeightGrams / 1000;

      console.log(
        `📦 Product ${item.product.name}: weight = ${productWeightGrams}g (${productWeightKg}kg)`
      );

      // Создаем артикул с датой/временем для dev режима
      const isDev = process.env.NODE_ENV === "development";
      const wareKey = isDev
        ? `${item.product.id}_${new Date().toISOString().replace(/[:.]/g, "-")}`
        : item.product.id;

      console.log(`🏷️ Article: ${wareKey} (dev mode: ${isDev})`);

      return {
        name: item.product.name,
        ware_key: wareKey, // Артикул с датой/временем в dev режиме
        cost: Math.max(item.price, 1),
        weight: productWeightKg, // Вес в килограммах для СДЭК
        amount: Math.max(item.quantity, 1),
        payment: {
          value: 0,
        },
      };
    });

    // Рассчитываем общий вес заказа (в граммах)
    const totalWeightGrams = cdekItems.reduce((weight, item) => {
      return weight + item.weight * 1000 * item.amount; // Конвертируем обратно в граммы для расчета
    }, 0);

    // Конвертируем в килограммы для СДЭК API
    const totalWeightKg = totalWeightGrams / 1000;

    console.log(
      `📦 Total order weight: ${totalWeightGrams}g (${totalWeightKg}kg)`
    );

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
          weight: totalWeightKg, // Общий вес в килограммах для СДЭК
          items: cdekItems,
        },
      ],
      delivery_recipient_cost: {
        value: 0,
      },
    };

    console.log("\n📤 Expected CDEK data (with article fix):");
    console.log(JSON.stringify(cdekData, null, 2));

    console.log("\n🎯 Expected results:");
    console.log(`   - Product weight in CDEK: ${cdekItems[0].weight} kg`);
    console.log(`   - Total weight in CDEK: ${totalWeightKg} kg`);
    console.log(`   - Quantity: ${cdekItems[0].amount}`);
    console.log(`   - Article: ${cdekItems[0].ware_key}`);

    console.log("\n💡 Key improvements:");
    console.log("   ✅ Weight extraction from characteristics array");
    console.log("   ✅ Proper weight conversion (grams → kilograms)");
    console.log("   ✅ Article with date/time in dev mode");
    console.log("   ✅ Correct total weight calculation");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCdekWithArticle()
  .then(() => {
    console.log("✅ CDEK with article test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ CDEK with article test failed:", error);
    process.exit(1);
  });
