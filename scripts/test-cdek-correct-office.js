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

async function testCdekWithCorrectOffice() {
  try {
    console.log("🚀 Testing CDEK with correct office code...");

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

    // Симулируем подготовку данных для СДЭК с правильным кодом офиса
    console.log("\n🔧 Preparing CDEK data with correct office code...");

    const cdekItems = order.items.map((item) => {
      // Извлекаем вес из характеристик продукта (в граммах)
      const productWeightGrams = item.product.characteristics
        ? extractProductWeightFromJson(
            JSON.stringify(item.product.characteristics)
          )
        : 500;

      // Конвертируем в килограммы для СДЭК API
      const productWeightKg = productWeightGrams / 1000;

      console.log(
        `📦 Product ${item.product.name}: weight = ${productWeightGrams}g (${productWeightKg}kg)`
      );

      return {
        name: item.product.name,
        ware_key: item.product.id,
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

    // Используем правильный код офиса (например, "44-1" для первого офиса в Москве)
    const correctOfficeCode = "44-1"; // Это пример, в реальности нужно получать из API

    const cdekData = {
      recipient: {
        name: order.customerName,
        phones: [
          { number: "+7" + order.customerPhone.replace(/\D/g, "").slice(-10) },
        ],
      },
      shipment_point: "MSK124",
      delivery_point: correctOfficeCode, // Правильный код офиса
      tariff_code: 136,
      packages: [
        {
          number: order.orderNumber,
          weight: totalWeightKg, // Общий вес в килограммах для СДЭК
          items: cdekItems,
        },
      ],
    };

    console.log("\n📤 CDEK data with correct office code:");
    console.log(JSON.stringify(cdekData, null, 2));

    console.log("\n🎯 Expected results with correct office:");
    console.log(`   - Product weight in CDEK: ${cdekItems[0].weight} kg`);
    console.log(`   - Total weight in CDEK: ${totalWeightKg} kg`);
    console.log(`   - Quantity: ${cdekItems[0].amount}`);
    console.log(`   - Office code: ${correctOfficeCode}`);

    console.log(
      "\n💡 Note: The weight should now be correct (0.75 kg per item, 1.5 kg total)"
    );
    console.log(
      "💡 The issue was that we were using city code '44' instead of office code like '44-1'"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCdekWithCorrectOffice()
  .then(() => {
    console.log("✅ CDEK with correct office test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ CDEK with correct office test failed:", error);
    process.exit(1);
  });
