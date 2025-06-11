// СДЭК API интеграция
// Документация: https://apidoc.cdek.ru/

const CDEK_API_URL = "https://api.cdek.ru/v2";
const CDEK_CLIENT_ID = process.env.CDEK_CLIENT_ID || "kotiamba19@mail.ru";
const CDEK_CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET || "D1i2s3p@";

interface CDEKAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CDEKCity {
  code: number;
  city: string;
  region: string;
  country_code: string;
  country: string;
  kladr_code: string;
  latitude: number;
  longitude: number;
}

interface CDEKOffice {
  code: string;
  name: string;
  address_full: string;
  address_comment?: string;
  work_time: string;
  phones?: { number: string }[];
  email?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  dimension_limit?: {
    width: number;
    height: number;
    length: number;
  };
  weight_limit?: number;
  type: "PVZ" | "POSTAMAT";
}

interface CDEKDeliveryCalculation {
  delivery_sum: number;
  period_min: number;
  period_max: number;
  weight_calc: number;
  services: Array<{
    code: string;
    sum: number;
  }>;
}

class CDEKApi {
  private token: string | null = null;
  private tokenExpires: Date | null = null;

  // Получение токена авторизации
  private async getAuthToken(): Promise<string> {
    if (this.token && this.tokenExpires && new Date() < this.tokenExpires) {
      return this.token;
    }

    try {
      const response = await fetch(`${CDEK_API_URL}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: CDEK_CLIENT_ID,
          client_secret: CDEK_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`CDEK Auth failed: ${response.status}`);
      }

      const data: CDEKAuthResponse = await response.json();
      this.token = data.access_token;
      this.tokenExpires = new Date(Date.now() + (data.expires_in - 60) * 1000); // -60 сек для безопасности

      return this.token;
    } catch (error) {
      console.error("CDEK Auth error:", error);
      throw new Error("Ошибка авторизации СДЭК");
    }
  }

  // Выполнение запроса к API
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${CDEK_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `CDEK API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  // Поиск городов
  async searchCities(query: string, limit: number = 20): Promise<CDEKCity[]> {
    try {
      const response = await this.apiRequest<CDEKCity[]>(
        `/location/cities?city=${encodeURIComponent(query)}&size=${limit}`
      );
      return response;
    } catch (error) {
      console.error("CDEK cities search error:", error);
      return [];
    }
  }

  // Получение списка ПВЗ по коду города
  async getOfficesByCity(
    cityCode: number,
    type?: "PVZ" | "POSTAMAT"
  ): Promise<CDEKOffice[]> {
    try {
      let endpoint = `/deliverypoints?city_code=${cityCode}`;
      if (type) {
        endpoint += `&type=${type}`;
      }

      const response = await this.apiRequest<CDEKOffice[]>(endpoint);
      return response;
    } catch (error) {
      console.error("CDEK offices error:", error);
      return [];
    }
  }

  // Расчет стоимости доставки
  async calculateDelivery(
    fromCityCode: number,
    toCityCode: number,
    packages: Array<{
      weight: number; // в граммах
      length: number; // в см
      width: number;
      height: number;
    }>,
    tariffCode: number = 136 // Посылка склад-дверь
  ): Promise<CDEKDeliveryCalculation | null> {
    try {
      const requestData = {
        type: 1, // Интернет-магазин
        from_location: { code: fromCityCode },
        to_location: { code: toCityCode },
        tariff_code: tariffCode,
        packages: packages.map((pkg, index) => ({
          number: index.toString(),
          weight: pkg.weight,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
        })),
      };

      const response = await this.apiRequest<CDEKDeliveryCalculation>(
        "/calculator/tariff",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        }
      );

      return response;
    } catch (error) {
      console.error("CDEK calculation error:", error);
      return null;
    }
  }
}

// Экспортируем синглтон API
export const cdekApi = new CDEKApi();

// Утилитарные функции
export function formatOfficeWorkTime(workTime: string): string {
  // Простое форматирование времени работы
  return workTime.replace(/\s+/g, " ").trim();
}

export function formatOfficeAddress(office: CDEKOffice): string {
  let address = office.address_full;
  if (office.address_comment) {
    address += ` (${office.address_comment})`;
  }
  return address;
}

// Типы для экспорта
export type { CDEKCity, CDEKOffice, CDEKDeliveryCalculation };
