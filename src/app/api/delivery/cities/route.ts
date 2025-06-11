import { NextRequest, NextResponse } from "next/server";
import { cdekApi } from "@/lib/cdek";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Минимум 2 символа для поиска" },
        { status: 400 }
      );
    }

    const cities = await cdekApi.searchCities(query, limit);

    return NextResponse.json({
      cities: cities.map((city) => ({
        code: city.code,
        name: city.city,
        region: city.region,
        fullName: `${city.city}, ${city.region}`,
        coordinates: {
          latitude: city.latitude,
          longitude: city.longitude,
        },
      })),
    });
  } catch (error) {
    console.error("Cities search error:", error);
    return NextResponse.json(
      { error: "Ошибка поиска городов" },
      { status: 500 }
    );
  }
}
