const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Функция извлечения габаритов (скопирована из product-utils.ts)
function extractProductDimensions(characteristics) {
  if (!characteristics || !Array.isArray(characteristics)) {
    return {
      width: 35,
      height: 35,
      length: 35,
    };
  }

  const dimensions = {
    width: 35,
    height: 35,
    length: 35,
  };

  // Ищем характеристики с ключами "Ширина", "Высота", "Длина"
  const widthChar = characteristics.find(
    (char) =>
      char.key.toLowerCase().includes("ширина") ||
      char.key.toLowerCase().includes("width")
  );

  const heightChar = characteristics.find(
    (char) =>
      char.key.toLowerCase().includes("высота") ||
      char.key.toLowerCase().includes("height")
  );

  const lengthChar = characteristics.find(
    (char) =>
      char.key.toLowerCase().includes("длина") ||
      char.key.toLowerCase().includes("length")
  );

  // Извлекаем числовые значения
  if (widthChar) {
    const widthMatch = widthChar.value.match(/(\d+(?:\.\d+)?)/);
    if (widthMatch) {
      dimensions.width = parseFloat(widthMatch[1]);
      console.log(
        `📏 Width extraction: "${widthChar.value}" → ${dimensions.width}cm`
      );
    }
  }

  if (heightChar) {
    const heightMatch = heightChar.value.match(/(\d+(?:\.\d+)?)/);
    if (heightMatch) {
      dimensions.height = parseFloat(heightMatch[1]);
      console.log(
        `📏 Height extraction: "${heightChar.value}" → ${dimensions.height}cm`
      );
    }
  }

  if (lengthChar) {
    const lengthMatch = lengthChar.value.match(/(\d+(?:\.\d+)?)/);
    if (lengthMatch) {
      dimensions.length = parseFloat(lengthMatch[1]);
      console.log(
        `📏 Length extraction: "${lengthChar.value}" → ${dimensions.length}cm`
      );
    }
  }

  return dimensions;
}

async function testDimensions() {
  try {
    console.log("🔍 Testing dimensions extraction...");

    // Создаем тестовый продукт с габаритами
    const product = await prisma.product.create({
      data: {
        name: "Тестовая игрушка с габаритами",
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
        description: "Тестовая игрушка для проверки извлечения габаритов",
        categories: JSON.stringify(["test"]),
        ageGroups: JSON.stringify(["3-6"]),
        characteristics: {
          create: [
            {
              key: "Вес",
              value: "800 гр",
            },
            {
              key: "Ширина",
              value: "25 см",
            },
            {
              key: "Высота",
              value: "30 см",
            },
            {
              key: "Длина",
              value: "40 см",
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
    console.log("📋 Characteristics:", product.characteristics);

    // Тестируем извлечение габаритов
    const dimensions = extractProductDimensions(product.characteristics);
    console.log(
      `✅ Extracted dimensions: ${dimensions.width}x${dimensions.height}x${dimensions.length}cm`
    );

    // Проверяем, что габариты правильные
    if (
      dimensions.width === 25 &&
      dimensions.height === 30 &&
      dimensions.length === 40
    ) {
      console.log("✅ Dimensions extraction is working correctly!");
    } else {
      console.log("❌ Dimensions extraction is NOT working correctly!");
      console.log(
        "Expected: 25x30x40cm, Got:",
        `${dimensions.width}x${dimensions.height}x${dimensions.length}cm`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDimensions();
