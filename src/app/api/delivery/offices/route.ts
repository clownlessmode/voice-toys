import { NextRequest, NextResponse } from "next/server";
import { cdekApi, formatOfficeAddress, formatOfficeWorkTime } from "@/lib/cdek";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCodeStr = searchParams.get("cityCode");
    const type = searchParams.get("type") as "PVZ" | "POSTAMAT" | null;

    if (!cityCodeStr) {
      return NextResponse.json(
        { error: "Код города обязателен" },
        { status: 400 }
      );
    }

    const cityCode = parseInt(cityCodeStr);
    if (isNaN(cityCode)) {
      return NextResponse.json(
        { error: "Неверный код города" },
        { status: 400 }
      );
    }

    const offices = await cdekApi.getOfficesByCity(cityCode, type || undefined);

    return NextResponse.json({
      offices: offices.map((office) => ({
        code: office.code,
        name: office.name,
        address: formatOfficeAddress(office),
        workTime: formatOfficeWorkTime(office.work_time),
        phones: office.phones?.map((p) => p.number) || [],
        email: office.email,
        type: office.type,
        coordinates: {
          latitude: office.location.latitude,
          longitude: office.location.longitude,
        },
        limits: office.dimension_limit
          ? {
              width: office.dimension_limit.width,
              height: office.dimension_limit.height,
              length: office.dimension_limit.length,
              weight: office.weight_limit,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Offices search error:", error);
    return NextResponse.json(
      { error: "Ошибка получения пунктов выдачи" },
      { status: 500 }
    );
  }
}
