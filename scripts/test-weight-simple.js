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

// Тестируем различные варианты веса
console.log("🚀 Testing weight extraction...");

const testCases = [
  {
    name: "750 гр",
    characteristics: JSON.stringify([
      { key: "Вес", value: "750 гр" },
      { key: "Материал", value: "Пластик" },
    ]),
  },
  {
    name: "1.5 кг",
    characteristics: JSON.stringify([
      { key: "Вес", value: "1.5 кг" },
      { key: "Материал", value: "Дерево" },
    ]),
  },
  {
    name: "500г",
    characteristics: JSON.stringify([
      { key: "Вес", value: "500г" },
      { key: "Материал", value: "Металл" },
    ]),
  },
  {
    name: "2 кг",
    characteristics: JSON.stringify([
      { key: "Вес", value: "2 кг" },
      { key: "Материал", value: "Стекло" },
    ]),
  },
];

testCases.forEach((testCase, index) => {
  console.log(`\n📦 Test ${index + 1}: ${testCase.name}`);
  const weight = extractProductWeightFromJson(testCase.characteristics);
  console.log(`✅ Result: ${weight} grams`);
});

console.log("\n🎯 Weight extraction test completed!");
