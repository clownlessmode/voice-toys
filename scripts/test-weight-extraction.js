const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Функция извлечения веса (скопирована из product-utils.ts)
function extractProductWeight(characteristics) {
  if (!characteristics || !Array.isArray(characteristics)) {
    return 500; // DEFAULT_PRODUCT_WEIGHT_GRAMS
  }

  console.log("🔍 Input characteristics:", characteristics);

  // Ищем характеристику с ключом "Вес"
  const weightChar = characteristics.find(
    (char) =>
      char.key.toLowerCase().includes("вес") ||
      char.key.toLowerCase().includes("weight")
  );

  console.log("🔍 Found weight characteristic:", weightChar);

  if (!weightChar) {
    console.log("⚠️ No weight characteristic found");
    return 500;
  }

  // Извлекаем числовое значение из строки
  const weightText = weightChar.value;
  const weightMatch = weightText.match(/(\d+(?:\.\d+)?)/);

  console.log("🔍 Weight text:", weightText);
  console.log("🔍 Weight match:", weightMatch);

  if (!weightMatch) {
    console.log("⚠️ No numeric value found in weight text");
    return 500;
  }

  let weight = parseFloat(weightMatch[1]);
  console.log("🔍 Parsed weight:", weight);

  // Определяем единицы измерения и конвертируем в граммы
  if (
    weightText.toLowerCase().includes("кг") ||
    weightText.toLowerCase().includes("kg")
  ) {
    weight *= 1000; // кг в граммы
    console.log("🔍 Converted kg to grams:", weight);
  } else if (
    weightText.toLowerCase().includes("гр") ||
    weightText.toLowerCase().includes("г")
  ) {
    console.log("🔍 Already in grams");
  } else {
    console.log("🔍 Assuming grams by default");
  }

  console.log(`🔍 Final weight: ${weight}g`);

  // Проверяем, что вес в разумных пределах (от 1 до 100 кг)
  if (weight < 1 || weight > 100000) {
    console.log("⚠️ Weight out of reasonable range, using default");
    return 500;
  }

  return Math.round(weight);
}

async function testWeightExtraction() {
  try {
    console.log("🔍 Testing weight extraction...");

    // Получаем последний созданный продукт
    const latestProduct = await prisma.product.findFirst({
      orderBy: { createdAt: "desc" },
      include: { characteristics: true },
    });

    if (!latestProduct) {
      console.log("❌ No products found");
      return;
    }

    console.log("📦 Product:", latestProduct.name);
    console.log("📋 Characteristics:", latestProduct.characteristics);

    // Тестируем извлечение веса
    const weight = extractProductWeight(latestProduct.characteristics);
    console.log(`✅ Extracted weight: ${weight}g`);

    // Проверяем, что вес правильный
    if (weight === 750) {
      console.log("✅ Weight extraction is working correctly!");
    } else {
      console.log("❌ Weight extraction is NOT working correctly!");
      console.log("Expected: 750g, Got:", weight + "g");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testWeightExtraction();
