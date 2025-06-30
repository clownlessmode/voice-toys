import { Product } from "@/components/entities/product";

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
