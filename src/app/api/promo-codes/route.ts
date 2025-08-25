import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PromoCodeFilters,
  CreatePromoCodeRequest,
} from "@/components/entities/promo-code/model/types";
import { PromoCodeType } from "@prisma/client";
import { Prisma } from "@prisma/client";

// GET - Получение списка промокодов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: PromoCodeFilters = {
      search: searchParams.get("search") || undefined,
      type: (searchParams.get("type") as PromoCodeType | null) || undefined,
      isActive:
        searchParams.get("isActive") === "true"
          ? true
          : searchParams.get("isActive") === "false"
          ? false
          : undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
    };

    const skip = ((filters.page || 1) - 1) * (filters.limit || 10);

    // Построение условий фильтрации
    const where: Prisma.PromoCodeWhereInput = {};

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search } },
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Получение промокодов с пагинацией
    const [promoCodes, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: filters.limit || 10,
      }),
      prisma.promoCode.count({ where }),
    ]);

    return NextResponse.json({
      promoCodes,
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
    });
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch promo codes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Создание нового промокода
export async function POST(request: NextRequest) {
  try {
    const body: CreatePromoCodeRequest = await request.json();

    // Валидация обязательных полей
    if (!body.code || !body.name || !body.type || body.value === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Проверка уникальности кода
    const existingPromoCode = await prisma.promoCode.findUnique({
      where: { code: body.code },
    });

    if (existingPromoCode) {
      return NextResponse.json(
        { error: "Promo code with this code already exists" },
        { status: 400 }
      );
    }

    // Создание промокода
    const promoCode = await prisma.promoCode.create({
      data: {
        code: body.code.toUpperCase(),
        name: body.name,
        description: body.description,
        type: body.type,
        value: body.value,
        minOrderAmount: body.minOrderAmount,
        maxUses: body.maxUses,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(promoCode, { status: 201 });
  } catch (error) {
    console.error("Error creating promo code:", error);
    return NextResponse.json(
      {
        error: "Failed to create promo code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
