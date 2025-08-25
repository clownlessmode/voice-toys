// Константы для интеграции с СДЭК

// Вес товара в граммах (по умолчанию)
export const DEFAULT_PRODUCT_WEIGHT_GRAMS = 500;

// Габариты товара в сантиметрах (по умолчанию)
export const DEFAULT_PRODUCT_DIMENSIONS_CM = 35;

// Код пункта отправления (склад) - Варшавское шоссе
export const CDEK_SHIPMENT_POINT = "MSK124"; // Примерный код для Варшавского шоссе

// Код тарифа СДЭК (136 - Посылка склад-склад)
export const CDEK_TARIFF_CODE = 136;

// Адрес отправителя для расчета стоимости доставки (ПВЗ MSK124)
export const SENDER_ADDRESS = "Москва, ш. Варшавское, 160, корп. 2";

// URL API СДЭК
export const CDEK_API_URLS = {
  production: "https://api.cdek.ru/v2",
  test: "https://api.edu.cdek.ru/v2",
} as const;

// Эндпоинты СДЭК API
export const CDEK_ENDPOINTS = {
  orders: "/orders",
  calculator: "/calculator/tariff",
} as const;
