import { Product } from "@/components/entities/product";
import {
  DEFAULT_PRODUCT_WEIGHT_GRAMS,
  DEFAULT_PRODUCT_DIMENSIONS_CM,
} from "./cdek-constants";

export function transformProductFromDB(dbProduct: any): Product {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    breadcrumbs: JSON.parse(dbProduct.breadcrumbs),
    images: JSON.parse(dbProduct.images),
    price: {
      current: dbProduct.price,
      old: dbProduct.oldPrice || undefined,
      discountPercent: dbProduct.discountPercent || undefined,
      currency: dbProduct.currency,
    },
    favorite: dbProduct.favorite,
    availability: {
      pickup: dbProduct.pickupAvailability,
      delivery: dbProduct.deliveryAvailability,
    },
    returnPolicy: {
      days: dbProduct.returnDays,
      details: dbProduct.returnDetails,
    },
    description: dbProduct.description,
    videoUrl: dbProduct.videoUrl || undefined,
    characteristics:
      dbProduct.characteristics?.map((char: any) => ({
        key: char.key,
        value: char.value,
      })) || [],
    categories: dbProduct.categories ? JSON.parse(dbProduct.categories) : [],
    ageGroups: dbProduct.ageGroups ? JSON.parse(dbProduct.ageGroups) : [],
    createdAt: dbProduct.createdAt?.toISOString(),
    updatedAt: dbProduct.updatedAt?.toISOString(),
  };
}

export function validateProductData(data: any): string[] {
  const errors: string[] = [];

  if (
    !data.name ||
    typeof data.name !== "string" ||
    data.name.trim().length === 0
  ) {
    errors.push("Name is required and must be a non-empty string");
  }

  if (!Array.isArray(data.breadcrumbs) || data.breadcrumbs.length === 0) {
    errors.push("Breadcrumbs must be a non-empty array");
  }

  if (!Array.isArray(data.images)) {
    errors.push("Images must be an array");
  }

  if (!data.price || typeof data.price !== "number" || data.price <= 0) {
    errors.push("Price is required and must be a positive number");
  }

  if (!data.pickupAvailability || typeof data.pickupAvailability !== "string") {
    errors.push("Pickup availability is required");
  }

  if (
    !data.deliveryAvailability ||
    typeof data.deliveryAvailability !== "string"
  ) {
    errors.push("Delivery availability is required");
  }

  if (!data.returnDetails || typeof data.returnDetails !== "string") {
    errors.push("Return details are required");
  }

  if (!data.description || typeof data.description !== "string") {
    errors.push("Description is required");
  }

  if (!Array.isArray(data.characteristics)) {
    errors.push("Characteristics must be an array");
  } else {
    data.characteristics.forEach((char: any, index: number) => {
      if (!char.key || typeof char.key !== "string") {
        errors.push(`Characteristic ${index + 1}: key is required`);
      }
      if (!char.value || typeof char.value !== "string") {
        errors.push(`Characteristic ${index + 1}: value is required`);
      }
    });
  }

  return errors;
}

/**
 * Извлекает вес продукта из характеристик
 * @param characteristics - массив характеристик продукта
 * @returns вес в граммах
 */
export function extractProductWeight(
  characteristics: Array<{ key: string; value: string }>
): number {
  if (!characteristics || !Array.isArray(characteristics)) {
    return DEFAULT_PRODUCT_WEIGHT_GRAMS;
  }

  // Ищем характеристику с ключом "Вес"
  const weightChar = characteristics.find(
    (char) =>
      char.key.toLowerCase().includes("вес") ||
      char.key.toLowerCase().includes("weight")
  );

  if (!weightChar) {
    return DEFAULT_PRODUCT_WEIGHT_GRAMS;
  }

  // Извлекаем числовое значение из строки
  const weightText = weightChar.value;
  const weightMatch = weightText.match(/(\d+(?:\.\d+)?)/);

  if (!weightMatch) {
    return DEFAULT_PRODUCT_WEIGHT_GRAMS;
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
    return DEFAULT_PRODUCT_WEIGHT_GRAMS;
  }

  return Math.round(weight);
}

/**
 * Извлекает габариты продукта из характеристик
 * @param characteristics - массив характеристик продукта
 * @returns объект с габаритами в сантиметрах
 */
export function extractProductDimensions(
  characteristics: Array<{ key: string; value: string }>
): { width: number; height: number; length: number } {
  if (!characteristics || !Array.isArray(characteristics)) {
    return {
      width: DEFAULT_PRODUCT_DIMENSIONS_CM,
      height: DEFAULT_PRODUCT_DIMENSIONS_CM,
      length: DEFAULT_PRODUCT_DIMENSIONS_CM,
    };
  }

  const dimensions = {
    width: DEFAULT_PRODUCT_DIMENSIONS_CM,
    height: DEFAULT_PRODUCT_DIMENSIONS_CM,
    length: DEFAULT_PRODUCT_DIMENSIONS_CM,
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

/**
 * Извлекает габариты продукта из JSON строки характеристик
 * @param characteristicsJson - JSON строка с характеристиками
 * @returns объект с габаритами в сантиметрах
 */
export function extractProductDimensionsFromJson(characteristicsJson: string): {
  width: number;
  height: number;
  length: number;
} {
  try {
    const characteristics = JSON.parse(characteristicsJson);
    return extractProductDimensions(characteristics);
  } catch (error) {
    console.warn("Failed to parse product characteristics JSON:", error);
    return {
      width: DEFAULT_PRODUCT_DIMENSIONS_CM,
      height: DEFAULT_PRODUCT_DIMENSIONS_CM,
      length: DEFAULT_PRODUCT_DIMENSIONS_CM,
    };
  }
}

/**
 * Извлекает вес продукта из JSON строки характеристик
 * @param characteristicsJson - JSON строка с характеристиками
 * @returns вес в граммах
 */
export function extractProductWeightFromJson(
  characteristicsJson: string
): number {
  try {
    const characteristics = JSON.parse(characteristicsJson);
    return extractProductWeight(characteristics);
  } catch (error) {
    console.warn("Failed to parse product characteristics JSON:", error);
    return DEFAULT_PRODUCT_WEIGHT_GRAMS;
  }
}
