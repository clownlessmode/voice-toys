import { useState, useEffect } from "react";
import { cities } from "./cities";

export interface CdekDeliveryPoint {
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

export function useCdekOffices(cityName?: string) {
  const [data, setData] = useState<CdekDeliveryPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cityName) {
      setData(null);
      return;
    }

    const city = cities.find((c) => c.city === cityName);
    if (!city?.code) {
      setError("Город не найден");
      return;
    }

    const fetchOffices = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/cdek/offices?cityCode=${city.code}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const offices = await response.json();
        setData(offices);
      } catch (err) {
        console.error("Error fetching CDEK offices:", err);
        setError("Ошибка загрузки ПВЗ");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOffices();
  }, [cityName]);

  return { data, loading, error };
}
