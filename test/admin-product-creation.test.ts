import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Admin Product Creation", () => {
  beforeAll(async () => {
    // Очищаем базу данных перед тестами
    await prisma.productCharacteristic.deleteMany();
    await prisma.product.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a product via admin API", async () => {
    const productData = {
      name: "Тестовый продукт",
      breadcrumbs: [
        "Главная",
        "Каталог",
        "Интерактивные игрушки",
        "Тестовый продукт",
      ],
      images: [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ],
      price: 1500,
      oldPrice: 2000,
      discountPercent: 25,
      currency: "₽",
      pickupAvailability: "Самовывоз сегодня",
      deliveryAvailability: "Доставка от 1 дня",
      returnDays: 14,
      returnDetails: "Можно обменять или вернуть в течение 14 дней",
      description: "Описание тестового продукта",
      categories: ["Интерактивные игрушки"],
      ageGroups: ["3-4года", "5-7лет"],
      characteristics: [
        { key: "Материал", value: "Пластик" },
        { key: "Размер", value: "15x10 см" },
        { key: "Возраст", value: "3+" },
      ],
    };

    // Создаем продукт через API
    const response = await fetch("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });

    expect(response.status).toBe(201);
    const createdProduct = await response.json();

    // Проверяем, что продукт создан с правильными данными
    expect(createdProduct.name).toBe(productData.name);
    expect(createdProduct.price.current).toBe(productData.price);
    expect(createdProduct.price.old).toBe(productData.oldPrice);
    expect(createdProduct.price.discountPercent).toBe(
      productData.discountPercent
    );
    expect(createdProduct.description).toBe(productData.description);
    expect(createdProduct.images).toEqual(productData.images);
    expect(createdProduct.categories).toEqual(productData.categories);
    expect(createdProduct.ageGroups).toEqual(productData.ageGroups);
    expect(createdProduct.characteristics).toHaveLength(3);
    expect(createdProduct.characteristics[0].key).toBe("Материал");
    expect(createdProduct.characteristics[0].value).toBe("Пластик");

    // Проверяем, что продукт сохранен в базе данных
    const dbProduct = await prisma.product.findUnique({
      where: { id: createdProduct.id },
      include: { characteristics: true },
    });

    expect(dbProduct).toBeTruthy();
    expect(dbProduct?.name).toBe(productData.name);
    expect(dbProduct?.price).toBe(productData.price);
    expect(dbProduct?.characteristics).toHaveLength(3);
  });

  it("should validate required fields", async () => {
    const invalidProductData = {
      name: "", // Пустое название
      breadcrumbs: ["Главная", "Каталог"],
      images: [],
      price: 0,
      description: "", // Пустое описание
      categories: [],
      ageGroups: [], // Пустые возрастные группы
      characteristics: [],
      pickupAvailability: "Самовывоз сегодня",
      deliveryAvailability: "Доставка от 1 дня",
      returnDetails: "Можно вернуть в течение 14 дней",
    };

    const response = await fetch("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidProductData),
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBe("Validation failed");
    expect(error.details).toBeInstanceOf(Array);
  });

  it("should handle product with minimal required fields", async () => {
    const minimalProductData = {
      name: "Минимальный продукт",
      breadcrumbs: ["Главная", "Каталог", "Минимальный продукт"],
      images: ["https://example.com/image.jpg"],
      price: 1000,
      description: "Описание минимального продукта",
      categories: ["Интерактивные игрушки"],
      ageGroups: ["3-4года"],
      characteristics: [],
      pickupAvailability: "Самовывоз сегодня",
      deliveryAvailability: "Доставка от 1 дня",
      returnDetails: "Можно вернуть в течение 14 дней",
    };

    const response = await fetch("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(minimalProductData),
    });

    expect(response.status).toBe(201);
    const createdProduct = await response.json();

    expect(createdProduct.name).toBe(minimalProductData.name);
    expect(createdProduct.price.current).toBe(minimalProductData.price);
    expect(createdProduct.price.old).toBeUndefined();
    expect(createdProduct.price.discountPercent).toBeUndefined();
    expect(createdProduct.characteristics).toHaveLength(0);
  });

  it("should handle product with complex characteristics", async () => {
    const productWithComplexChars = {
      name: "Продукт с характеристиками",
      breadcrumbs: ["Главная", "Каталог", "Продукт с характеристиками"],
      images: ["https://example.com/image.jpg"],
      price: 2500,
      description: "Продукт с множественными характеристиками",
      categories: ["Развивающие игрушки"],
      ageGroups: ["5-7лет", "8-10лет"],
      characteristics: [
        { key: "Материал", value: "Дерево" },
        { key: "Размер", value: "20x15x5 см" },
        { key: "Вес", value: "500 г" },
        { key: "Цвет", value: "Натуральный" },
        { key: "Возраст", value: "5+" },
      ],
      pickupAvailability: "Самовывоз сегодня",
      deliveryAvailability: "Доставка от 1 дня",
      returnDetails: "Можно вернуть в течение 14 дней",
    };

    const response = await fetch("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productWithComplexChars),
    });

    expect(response.status).toBe(201);
    const createdProduct = await response.json();

    expect(createdProduct.characteristics).toHaveLength(5);
    expect(
      createdProduct.characteristics.find(
        (c: { key: string; value: string }) => c.key === "Материал"
      )?.value
    ).toBe("Дерево");
    expect(
      createdProduct.characteristics.find(
        (c: { key: string; value: string }) => c.key === "Вес"
      )?.value
    ).toBe("500 г");
  });
});
