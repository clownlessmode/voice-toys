import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "8");

    // Получаем все продукты напрямую из базы
    const allProducts = await prisma.product.findMany({
      include: {
        characteristics: true,
      },
    });

    // Симулируем хиты продаж - можно улучшить в будущем с реальной статистикой
    const productsWithSales = allProducts.map((product, index) => ({
      id: product.id,
      name: product.name,
      breadcrumbs: JSON.parse(product.breadcrumbs),
      images: JSON.parse(product.images),
      price: {
        current: product.price,
        original: product.oldPrice,
        currency: product.currency,
      },
      availability: {
        pickup: product.pickupAvailability,
        delivery: product.deliveryAvailability,
      },
      return: {
        days: product.returnDays,
        details: product.returnDetails,
      },
      description: product.description,
      characteristics: product.characteristics.map((char) => ({
        key: char.key,
        value: char.value,
      })),
      totalSold: Math.max(0, 10 - index), // Симуляция продаж
      isHit: index < 3, // Первые 3 товара - хиты
    }));

    // Сортируем: хиты первые, затем по убыванию "продаж"
    const sortedProducts = productsWithSales.sort((a, b) => {
      if (a.isHit !== b.isHit) {
        return b.isHit ? 1 : -1; // Хиты первые
      }
      return (b.totalSold || 0) - (a.totalSold || 0); // По убыванию продаж
    });

    // Берем только нужное количество
    const limitedProducts = sortedProducts.slice(0, limit);

    return NextResponse.json({
      products: limitedProducts,
      total: limitedProducts.length,
    });
  } catch (error) {
    console.error("Ошибка получения рекомендаций:", error);
    return NextResponse.json(
      { error: "Ошибка получения рекомендаций" },
      { status: 500 }
    );
  }
}
