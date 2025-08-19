import { NextRequest, NextResponse } from "next/server";

interface CdekDeliveryPoint {
  code: string;
  location: {
    address: string;
    fias_guid?: string;
    longitude?: number;
    latitude?: number;
  };
  type: string;
  work_time?: string;
  phones?: string[];
}

let cdekToken: string | null = null;
let tokenExpiresAt: number | null = null;

async function fetchCdekToken(): Promise<string> {
  if (cdekToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cdekToken;
  }

  console.log("🔑 Запрашиваем CDEK токен...");
  console.log("🔑 Client ID:", process.env.CDEK_CLIENT_ID);
  console.log(
    "🔑 Client Secret:",
    process.env.CDEK_CLIENT_SECRET ? "***" : "НЕ УСТАНОВЛЕН"
  );

  const tokenUrl = `https://api.cdek.ru/v2/oauth/token?grant_type=client_credentials&client_id=${process.env.CDEK_CLIENT_ID}&client_secret=${process.env.CDEK_CLIENT_SECRET}`;
  console.log("🔑 URL для токена:", tokenUrl);

  const response = await fetch(tokenUrl, { method: "POST" });

  console.log("🔑 Статус ответа:", response.status);
  console.log("🔑 Статус текст:", response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("🔑 Ошибка получения токена:", errorText);
    throw new Error(
      `Failed to get CDEK token: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  cdekToken = data.access_token;
  tokenExpiresAt =
    Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000);

  if (!cdekToken) {
    throw new Error("Failed to obtain CDEK token");
  }

  return cdekToken;
}

async function fetchCdekOffices(
  cityCode: number
): Promise<CdekDeliveryPoint[]> {
  console.log("🏪 Запрашиваем офисы CDEK для города:", cityCode);

  let token = await fetchCdekToken();
  console.log("🔑 Токен получен:", token ? "***" : "НЕ ПОЛУЧЕН");

  const officesUrl = `https://api.cdek.ru/v2/deliverypoints?city_code=${cityCode}&size=1000`;
  console.log("🏪 URL для офисов:", officesUrl);

  let response = await fetch(officesUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    token = await fetchCdekToken();
    response = await fetch(
      `https://api.edu.cdek.ru/v2/deliverypoints?city_code=${cityCode}&size=1000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  if (!response.ok) {
    throw new Error("Failed to fetch CDEK offices");
  }

  return (await response.json()) as CdekDeliveryPoint[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCodeParam = searchParams.get("cityCode");

    if (!cityCodeParam) {
      return NextResponse.json(
        { error: "City code is required" },
        { status: 400 }
      );
    }

    const cityCode = parseInt(cityCodeParam, 10);

    if (isNaN(cityCode)) {
      return NextResponse.json({ error: "Invalid city code" }, { status: 400 });
    }

    const offices = await fetchCdekOffices(cityCode);

    return NextResponse.json(offices);
  } catch (error) {
    console.error("Error fetching CDEK offices:", error);
    return NextResponse.json(
      { error: "Failed to fetch CDEK offices" },
      { status: 500 }
    );
  }
}
