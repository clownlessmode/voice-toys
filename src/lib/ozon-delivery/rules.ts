export const OZON_DELIVERY_MIN_PRODUCT_PRICE_RUB = 100;

export function isOzonDeliveryProductEligible(priceRub: number): boolean {
  return Number.isFinite(priceRub) && priceRub >= OZON_DELIVERY_MIN_PRODUCT_PRICE_RUB;
}
