import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PromoCodeType } from "@/components/entities/promo-code/model/types";

// POST - Валидация промокода
export async function POST(request: NextRequest) {
  try {
    const { code, orderAmount } = await request.json();

    if (!code || orderAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: code and orderAmount" },
        { status: 400 }
      );
    }

    // Ищем промокод
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promoCode) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        error: "Промокод не найден",
      });
    }

    // Проверяем активность
    if (!promoCode.isActive) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        error: "Промокод неактивен",
      });
    }

    // Проверяем срок действия
    const now = new Date();
    if (now < promoCode.validFrom || now > promoCode.validUntil) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        error: "Промокод недействителен",
      });
    }

    // Проверяем лимит использований
    console.log("Checking max uses:", {
      maxUses: promoCode.maxUses,
      currentUses: promoCode.currentUses,
      condition: promoCode.maxUses !== null && promoCode.maxUses !== undefined && promoCode.currentUses >= promoCode.maxUses
    });
    
    if (promoCode.maxUses !== null && promoCode.maxUses !== undefined && promoCode.currentUses >= promoCode.maxUses) {
      console.log("Max uses exceeded, rejecting promo code");
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        error: "Лимит использований промокода исчерпан",
      });
    }

    // Проверяем минимальную сумму заказа
    if (promoCode.minOrderAmount && orderAmount < promoCode.minOrderAmount) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        error: `Минимальная сумма заказа для промокода: ${promoCode.minOrderAmount} ₽`,
      });
    }

    // Вычисляем скидку
    let discountAmount = 0;
    if (promoCode.type === PromoCodeType.PERCENTAGE) {
      discountAmount = (orderAmount * promoCode.value) / 100;
    } else if (promoCode.type === PromoCodeType.FIXED_AMOUNT) {
      discountAmount = promoCode.value;
    }

    // Скидка не может быть больше суммы заказа
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    return NextResponse.json({
      isValid: true,
      discountAmount: Math.round(discountAmount),
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        name: promoCode.name,
        type: promoCode.type,
        value: promoCode.value,
      },
    });
  } catch (error) {
    console.error("Error validating promo code:", error);
    return NextResponse.json(
      {
        error: "Failed to validate promo code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
