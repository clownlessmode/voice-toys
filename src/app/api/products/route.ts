import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  transformProductFromDB,
  validateProductData,
} from "@/lib/product-utils";
import {
  CreateProductRequest,
  ProductsResponse,
} from "@/components/entities/product/model/types";

// GET - Получение всех продуктов с фильтрацией
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const age = searchParams.get("age");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const page = searchParams.get("page");
    const favorite = searchParams.get("favorite");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    // Поиск по названию и описанию (SQLite case-insensitive)
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Фильтр по типу (через breadcrumbs)
    if (type) {
      whereClause.breadcrumbs = { contains: type };
    }

    // Фильтр по избранным
    if (favorite === "true") {
      whereClause.favorite = true;
    }

    const limitNum = limit ? parseInt(limit) : 20;
    const pageNum = page ? parseInt(page) : 1;
    const offsetNum = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          characteristics: true,
        },
        orderBy: { createdAt: "desc" },
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    let filteredProducts = products;

    // Фильтрация по возрасту (делаем на уровне приложения, так как это сложная логика)
    if (age) {
      filteredProducts = products.filter((product) => {
        const ageCharacteristic = product.characteristics.find(
          (char) => char.key === "Возраст"
        );

        if (!ageCharacteristic) return false;

        const productAge = ageCharacteristic.value;

        switch (age) {
          case "6м-2года":
            return (
              productAge.includes("1+") ||
              productAge.includes("0+") ||
              productAge.includes("6м") ||
              productAge.includes("1-2")
            );
          case "3-4года":
            return productAge.includes("3+") || productAge.includes("3-4");
          case "5-7лет":
            return (
              productAge.includes("5+") ||
              productAge.includes("6+") ||
              productAge.includes("5-7")
            );
          case "8-10лет":
            return (
              productAge.includes("8+") ||
              productAge.includes("9+") ||
              productAge.includes("8-10")
            );
          default:
            return false;
        }
      });
    }

    const transformedProducts = filteredProducts.map(transformProductFromDB);

    const response: ProductsResponse = {
      products: transformedProducts,
      total: age ? filteredProducts.length : total,
      page: pageNum,
      limit: limitNum,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Создание нового продукта
export async function POST(request: NextRequest) {
  try {
    const body: CreateProductRequest = await request.json();

    // Валидация данных
    const validationErrors = validateProductData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        breadcrumbs: JSON.stringify(body.breadcrumbs),
        images: JSON.stringify(body.images),
        price: body.price,
        oldPrice: body.oldPrice,
        discountPercent: body.discountPercent,
        currency: body.currency || "₽",
        favorite: body.favorite || false,
        pickupAvailability: body.pickupAvailability,
        deliveryAvailability: body.deliveryAvailability,
        returnDays: body.returnDays || 14,
        returnDetails: body.returnDetails,
        description: body.description,
        characteristics: {
          create: body.characteristics.map((char) => ({
            key: char.key,
            value: char.value,
          })),
        },
      },
      include: {
        characteristics: true,
      },
    });

    const transformedProduct = transformProductFromDB(product);

    return NextResponse.json(transformedProduct, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
