import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  transformProductFromDB,
  validateProductData,
} from "@/lib/product-utils";
import { CreateProductRequest } from "@/components/entities/product/model/types";

// POST - Массовое создание продуктов
export async function POST(request: NextRequest) {
  try {
    const body: { products: CreateProductRequest[] } = await request.json();

    if (!Array.isArray(body.products) || body.products.length === 0) {
      return NextResponse.json(
        { error: "Products array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Валидация всех продуктов
    const validationErrors: { index: number; errors: string[] }[] = [];
    body.products.forEach((product, index) => {
      const errors = validateProductData(product);
      if (errors.length > 0) {
        validationErrors.push({ index, errors });
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Создаем продукты в транзакции
    const createdProducts = await prisma.$transaction(
      body.products.map((productData) =>
        prisma.product.create({
          data: {
            name: productData.name,
            breadcrumbs: JSON.stringify(productData.breadcrumbs),
            images: JSON.stringify(productData.images),
            price: productData.price,
            oldPrice: productData.oldPrice,
            discountPercent: productData.discountPercent,
            currency: productData.currency || "₽",
            favorite: productData.favorite || false,
            pickupAvailability: productData.pickupAvailability,
            deliveryAvailability: productData.deliveryAvailability,
            returnDays: productData.returnDays || 14,
            returnDetails: productData.returnDetails,
            description: productData.description,
            characteristics: {
              create: productData.characteristics.map((char) => ({
                key: char.key,
                value: char.value,
              })),
            },
          },
          include: {
            characteristics: true,
          },
        })
      )
    );

    const transformedProducts = createdProducts.map(transformProductFromDB);

    return NextResponse.json(
      {
        message: `${createdProducts.length} products created successfully`,
        products: transformedProducts,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error bulk creating products:", error);
    return NextResponse.json(
      {
        error: "Failed to create products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Массовое удаление продуктов
export async function DELETE(request: NextRequest) {
  try {
    const body: { ids: string[] } = await request.json();

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "IDs array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Проверяем существование всех продуктов
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: body.ids } },
      select: { id: true },
    });

    const existingIds = existingProducts.map((p) => p.id);
    const notFoundIds = body.ids.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        {
          error: "Some products not found",
          details: { notFoundIds },
        },
        { status: 404 }
      );
    }

    // Удаляем продукты
    const deleteResult = await prisma.product.deleteMany({
      where: { id: { in: body.ids } },
    });

    return NextResponse.json({
      message: `${deleteResult.count} products deleted successfully`,
      deletedCount: deleteResult.count,
      deletedIds: body.ids,
    });
  } catch (error) {
    console.error("Error bulk deleting products:", error);
    return NextResponse.json(
      {
        error: "Failed to delete products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
