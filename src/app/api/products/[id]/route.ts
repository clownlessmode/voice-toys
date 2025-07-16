import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  transformProductFromDB,
  validateProductData,
} from "@/lib/product-utils";
import { UpdateProductRequest } from "@/components/entities/product/model/types";

// GET - Получение продукта по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        characteristics: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const transformedProduct = transformProductFromDB(product);

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Полное обновление продукта
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateProductRequest = await request.json();

    // Проверяем существование продукта
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Валидация данных
    const validationErrors = validateProductData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Удаляем старые характеристики
    await prisma.productCharacteristic.deleteMany({
      where: { productId: id },
    });

    // Обновляем продукт
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        breadcrumbs: JSON.stringify(body.breadcrumbs),
        images: JSON.stringify(body.images),
        price: body.price,
        oldPrice: body.oldPrice,
        discountPercent: body.discountPercent,
        currency: body.currency || "₽",
        favorite: body.favorite !== undefined ? body.favorite : false,
        pickupAvailability: body.pickupAvailability,
        deliveryAvailability: body.deliveryAvailability,
        returnDays: body.returnDays || 14,
        returnDetails: body.returnDetails,
        description: body.description,
        videoUrl: body.videoUrl,
        categories: JSON.stringify(body.categories || []),
        ageGroups: JSON.stringify(body.ageGroups || []),
        characteristics: {
          create: body.characteristics?.map((char) => ({
            key: char.key,
            value: char.value,
          })),
        },
      } as any,
      include: {
        characteristics: true,
      },
    });

    const transformedProduct = transformProductFromDB(product);

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        error: "Failed to update product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Частичное обновление продукта
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Проверяем существование продукта
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { characteristics: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Подготавливаем данные для обновления
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.breadcrumbs !== undefined)
      updateData.breadcrumbs = JSON.stringify(body.breadcrumbs);
    if (body.images !== undefined)
      updateData.images = JSON.stringify(body.images);
    if (body.price !== undefined) updateData.price = body.price;
    if (body.oldPrice !== undefined) updateData.oldPrice = body.oldPrice;
    if (body.discountPercent !== undefined)
      updateData.discountPercent = body.discountPercent;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.favorite !== undefined) updateData.favorite = body.favorite;
    if (body.pickupAvailability !== undefined)
      updateData.pickupAvailability = body.pickupAvailability;
    if (body.deliveryAvailability !== undefined)
      updateData.deliveryAvailability = body.deliveryAvailability;
    if (body.returnDays !== undefined) updateData.returnDays = body.returnDays;
    if (body.returnDetails !== undefined)
      updateData.returnDetails = body.returnDetails;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
    if (body.categories !== undefined)
      updateData.categories = JSON.stringify(body.categories);
    if (body.ageGroups !== undefined)
      updateData.ageGroups = JSON.stringify(body.ageGroups);

    // Если обновляются характеристики, удаляем старые и создаем новые
    if (body.characteristics !== undefined) {
      await prisma.productCharacteristic.deleteMany({
        where: { productId: id },
      });

      updateData.characteristics = {
        create: body.characteristics.map(
          (char: { key: string; value: string }) => ({
            key: char.key,
            value: char.value,
          })
        ),
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData as any,
      include: {
        characteristics: true,
      },
    });

    const transformedProduct = transformProductFromDB(product);

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error("Error partially updating product:", error);
    return NextResponse.json(
      {
        error: "Failed to update product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Удаление продукта
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Проверяем существование продукта
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Удаляем продукт (характеристики удалятся автоматически благодаря onDelete: Cascade)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Product deleted successfully", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
