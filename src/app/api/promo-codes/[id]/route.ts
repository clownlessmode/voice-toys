import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePromoCodeRequest } from "@/components/entities/promo-code/model/types";

// GET - Получение промокода по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!promoCode) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    return NextResponse.json(promoCode);
  } catch (error) {
    console.error("Error fetching promo code:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch promo code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Обновление промокода
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdatePromoCodeRequest = await request.json();

    // Проверяем существование промокода
    const existingPromoCode = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existingPromoCode) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    // Обновляем промокод
    const updatedPromoCode = await prisma.promoCode.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updatedPromoCode);
  } catch (error) {
    console.error("Error updating promo code:", error);
    return NextResponse.json(
      {
        error: "Failed to update promo code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Удаление промокода
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Проверяем существование промокода
    const existingPromoCode = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existingPromoCode) {
      return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
    }

    // Удаляем промокод
    await prisma.promoCode.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Promo code deleted successfully" });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    return NextResponse.json(
      {
        error: "Failed to delete promo code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
