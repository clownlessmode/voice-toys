/**
 * Маппинг сырой карточки Wildberries (Content API, элемент `data.cards[]`) в поля
 * `Product` / `CreateProductRequest` / `Prisma.product.create`.
 *
 * Таблица полей (WB → Product) см. `mapWbCardToProductData` (блок «Маппинг» ниже по файлу).
 */
import type { Prisma } from "@prisma/client";
import { validateProductData } from "@/lib/product-utils";
import type { Characteristic, CreateProductRequest } from "@/components/entities/product/model/types";

// -----------------------------------------------------------------------------
// Внешние хелперы (re-export) для пути синхронизации
// -----------------------------------------------------------------------------

/**
 * Проверка сопоставленного `CreateProductRequest` (как `validateProductData` для
 * товаров из кабинета; отдельной ослабленной схемы нет, пока маппер даёт
 * валидные дефолты: цена ≥ 1 ₽, непустые характеристики и т.д.).
 */
export function validateWbProductPayload(
  data: CreateProductRequest
): string[] {
  return validateProductData(data);
}

// -----------------------------------------------------------------------------
// Дефолты (до интеграции остатков/цен с сайта; строки — русский копирайт для витрины)
// -----------------------------------------------------------------------------

/** Самовывоз: заглушка, пока нет фактических данных по пунктам. */
export const WB_DEFAULT_PICKUP_AVAILABILITY =
  "Самовывоз: информация уточняется.";

/** Доставка: заглушка. */
export const WB_DEFAULT_DELIVERY_AVAILABILITY =
  "Доставка: информация уточняется.";

/** Возврат: заглушка (returnDays в БД остаётся 14 по умолчанию). */
export const WB_DEFAULT_RETURN_DETAILS =
  "Условия возврата уточняются у продавца.";

/**
 * «Плейсхолдер-цена» (₽), если нет ни цен в Content-`sizes`, ни строки из «Цены и скидки» при синке.
 */
export const WB_PLACEHOLDER_PRICE_RUB = 1;

/** Макс. длина описания после нормализации (защита от слишком длинного HTML). */
export const WB_DESCRIPTION_MAX_LEN = 50_000;

/** Описание: если в карточке пусто или после снятия HTML не осталось текста. */
export const WB_DEFAULT_PRODUCT_DESCRIPTION = "Описание уточняется.";

const PLACEHOLDER_IMAGE_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
  );

// -----------------------------------------------------------------------------
// Типы результата
// -----------------------------------------------------------------------------

export type WbProductMapped = {
  /** nmID с карточки WB. */
  wbNmId: number;
  /** `updatedAt` с карточки WB (лучшее поле для инкрементального sync). */
  wbCardUpdatedAt: Date | null;
  isActive: true;
  createRequest: CreateProductRequest;
  /** Готово для `prisma.product.create({ data })` (включая вложенные характеристики). */
  prismaCreate: Prisma.ProductCreateInput;
};

/**
 * Снимает простейшие HTML-теги и схлопывает пробелы (сохраняет человеко-читаемый текст).
 * Не делаем полноценный HTML-парсер — достаточно витрины.
 */
export function stripSimpleHtmlToText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function toTrimmedString(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function parseDateLoose(v: unknown): Date | null {
  const s = toTrimmedString(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Собирает URL изображений: строка, объект с `big` / `c516x688` / `c246x328` / `square`, или `url`.
 * Пустой массив → политика «минимум один элемент массива для валидатора витрины»: 1×1 data URL
 * (см. `validateProductData`: пустой массив `images` допустим; требуется только `Array.isArray`).
 */
export function collectPhotoUrls(photos: unknown): string[] {
  if (!Array.isArray(photos)) return [];
  const out: string[] = [];
  for (const p of photos) {
    if (typeof p === "string" && p.length > 0) {
      out.push(p);
      continue;
    }
    const o = asRecord(p);
    if (!o) continue;
    const fromObj =
      toTrimmedString(o.big) ||
      toTrimmedString((o as { c516x688?: unknown }).c516x688) ||
      toTrimmedString((o as { c246x328?: unknown }).c246x328) ||
      toTrimmedString((o as { square?: unknown }).square) ||
      toTrimmedString((o as { hq?: unknown }).hq) ||
      toTrimmedString((o as { url?: unknown }).url);
    if (fromObj) out.push(fromObj);
  }
  return out;
}

/**
 * В спецификации WB «Цены и скидки» значения `price` / `discountedPrice` в **`currencyIsoCode4217`** приходят
 * как **рубли** (см. официальный пример: `price`: 500, `discountedPrice`: 350), не как копейки.
 *
 * Если числа нет или оно ≤ 0 — возвращаем {@link WB_PLACEHOLDER_PRICE_RUB} (витрина требует price &gt; 0).
 */
export function wbSellerPriceRubFromRaw(
  rubles: number | null | undefined
): number {
  if (rubles == null || !Number.isFinite(rubles) || rubles <= 0) {
    return WB_PLACEHOLDER_PRICE_RUB;
  }
  return Math.max(1, Math.round(rubles));
}

/**
 * Конвертация **копеек → рубли** для полей размера из **Content**-карточки WB.
 *
 * Ответ **`GET …/api/v2/list/goods/filter` («Цены и скидки»)** хранит `price` / `discountedPrice`
 * уже в **рублях** — там используйте {@link wbSellerPriceRubFromRaw}, не делите на 100.
 */
export function kopeksToPriceRub(kopeks: number | null | undefined): number {
  if (kopeks == null || !Number.isFinite(kopeks) || kopeks <= 0) {
    return WB_PLACEHOLDER_PRICE_RUB;
  }
  const rub = Math.round(kopeks / 100);
  return Math.max(1, rub);
}

export type WbSizePriceInfo = {
  currentRub: number;
  oldRub: number | null;
  discountPercent: number | null;
};

function parseFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function collectStockCandidate(v: unknown, out: number[]): void {
  const n = parseFiniteNumber(v);
  if (n != null && n >= 0) {
    out.push(Math.floor(n));
  }
}

function totalStockFromCard(card: Record<string, unknown>): number | null {
  const values: number[] = [];
  collectStockCandidate((card as { totalQuantity?: unknown }).totalQuantity, values);
  collectStockCandidate((card as { quantity?: unknown }).quantity, values);
  collectStockCandidate((card as { totalStocks?: unknown }).totalStocks, values);
  collectStockCandidate((card as { stock?: unknown }).stock, values);

  const sizes = (card as { sizes?: unknown }).sizes;
  if (Array.isArray(sizes)) {
    for (const row of sizes) {
      const s = asRecord(row);
      if (!s) continue;
      collectStockCandidate(
        (s as { quantity?: unknown; qty?: unknown }).quantity ?? s.qty,
        values
      );
      const stocks = (s as { stocks?: unknown }).stocks;
      if (Array.isArray(stocks)) {
        for (const st of stocks) {
          const o = asRecord(st);
          if (!o) continue;
          collectStockCandidate(
            (o as { qty?: unknown; quantity?: unknown; amount?: unknown }).qty ??
              o.quantity ??
              o.amount,
            values
          );
        }
      }
    }
  }

  if (values.length === 0) return null;
  return Math.max(...values);
}

function pickupAvailabilityText(totalStock: number | null): string {
  if (totalStock == null) return WB_DEFAULT_PICKUP_AVAILABILITY;
  return totalStock > 0 ? "Самовывоз доступен" : "Самовывоз недоступен";
}

function deliveryAvailabilityText(totalStock: number | null): string {
  if (totalStock == null) return WB_DEFAULT_DELIVERY_AVAILABILITY;
  return totalStock > 0 ? "Доставка доступна" : "Доставка недоступна";
}

/**
 * Valid WB `nmID` for a card: same rules as {@link mapWbCardToProductData}
 * (finite number or numeric string, positive integer).
 */
export function parseWbCardNmId(v: unknown): number | null {
  const nm = parseFiniteNumber(v);
  if (nm == null || !Number.isInteger(nm) || nm <= 0) return null;
  return nm;
}

/**
 * Поля размера в ответе **Content** `/content/v2/get/cards/list` при наличии цен трактуют как **копейки**
 * (формат исторически встречается у поставщиков; пример тестового JSON: `199900` → 1999 ₽).
 * У карточек без этих полей цена задаётся через «Цены и скидки» при синке.
 */
function extractSizePrice(sizes: unknown): WbSizePriceInfo {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return {
      currentRub: WB_PLACEHOLDER_PRICE_RUB,
      oldRub: null,
      discountPercent: null,
    };
  }

  const first = asRecord(sizes[0]);
  if (!first) {
    return {
      currentRub: WB_PLACEHOLDER_PRICE_RUB,
      oldRub: null,
      discountPercent: null,
    };
  }

  const discK = parseFiniteNumber(
    (first as { discountedPrice?: unknown }).discountedPrice
  );
  const priceK = parseFiniteNumber((first as { price?: unknown }).price);
  const totalK = parseFiniteNumber((first as { totalPrice?: unknown }).totalPrice);

  const kopeksCurrent =
    discK != null && discK > 0
      ? discK
      : priceK != null && priceK > 0
        ? priceK
        : totalK != null && totalK > 0
          ? totalK
          : null;

  const currentRub = kopeksToPriceRub(kopeksCurrent);

  const oldK =
    discK != null && priceK != null && priceK > 0 && priceK > discK
      ? priceK
      : null;
  const oldRub = oldK != null ? kopeksToPriceRub(oldK) : null;

  let discountPercent: number | null = null;
  if (oldK != null && discK != null && oldK > discK) {
    discountPercent = Math.max(
      0,
      Math.min(100, Math.round(((oldK - discK) / oldK) * 100))
    );
  }

  return {
    currentRub,
    oldRub: oldRub != null && oldRub > currentRub ? oldRub : null,
    discountPercent,
  };
}

/**
 * Размеры из ответа `GET …/api/v2/list/goods/filter`: текущая цена — `discountedPrice`,
 * иначе `clubDiscountedPrice`, иначе `price` (всё в рублях по спецификации WB).
 */
function extractDiscountsApiSizesPrice(sizes: unknown): WbSizePriceInfo {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return {
      currentRub: WB_PLACEHOLDER_PRICE_RUB,
      oldRub: null,
      discountPercent: null,
    };
  }
  const first = asRecord(sizes[0]);
  if (!first) {
    return {
      currentRub: WB_PLACEHOLDER_PRICE_RUB,
      oldRub: null,
      discountPercent: null,
    };
  }

  const disc = parseFiniteNumber(first.discountedPrice);
  const club = parseFiniteNumber(
    (first as { clubDiscountedPrice?: unknown }).clubDiscountedPrice
  );
  const price = parseFiniteNumber(first.price);

  const rubCandidate =
    disc != null && disc > 0
      ? disc
      : club != null && club > 0
        ? club
        : price != null && price > 0
          ? price
          : null;

  const currentRub = wbSellerPriceRubFromRaw(rubCandidate);

  const oldK =
    disc != null && price != null && price > 0 && price > disc ? price : null;
  const oldRub = oldK != null ? wbSellerPriceRubFromRaw(oldK) : null;

  let discountPercent: number | null = null;
  if (oldK != null && disc != null && oldK > disc) {
    discountPercent = Math.max(
      0,
      Math.min(100, Math.round(((oldK - disc) / oldK) * 100))
    );
  }

  return {
    currentRub,
    oldRub: oldRub != null && oldRub > currentRub ? oldRub : null,
    discountPercent,
  };
}

/**
 * Одна строка `data.listGoods[]` ответа `GET /api/v2/list/goods/filter` (Цены и скидки).
 */
export function priceInfoFromDiscountsListGood(
  good: unknown
): { nmId: number; price: WbSizePriceInfo } | null {
  const o = asRecord(good);
  if (!o) return null;
  const nm = parseWbCardNmId(o.nmID);
  if (nm == null) return null;
  const sizes = (o as { sizes?: unknown }).sizes;
  return {
    nmId: nm,
    price: extractDiscountsApiSizesPrice(sizes),
  };
}

export function mapWbCharacteristicsToProduct(
  items: unknown
): Characteristic[] {
  if (!Array.isArray(items)) return [];
  const result: Characteristic[] = [];
  for (const raw of items) {
    const o = asRecord(raw);
    if (!o) continue;
    const key =
      toTrimmedString(o.name) ||
      toTrimmedString((o as { id?: unknown }).id) ||
      toTrimmedString((o as { charcName?: unknown }).charcName) ||
      "";
    const vRaw = (o as { value?: unknown; values?: unknown }).value ?? o.values;
    const value = Array.isArray(vRaw)
      ? vRaw.map((x) => toTrimmedString(x)).filter(Boolean).join(", ")
      : toTrimmedString(vRaw);
    if (!key) continue;
    if (!value) continue;
    const normKey = key.replace(/\s+/g, " ").trim();
    const normValue = value.replace(/\s+/g, " ").trim();
    if (!normValue) continue;
    result.push({ key: normKey, value: normValue });
  }
  return result;
}

function sizeSummary(sizes: unknown): Characteristic | null {
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  const parts: string[] = [];
  for (const s of sizes) {
    const o = asRecord(s);
    if (!o) continue;
    const ts = toTrimmedString(
      o.techSizeName,
      toTrimmedString((o as { wbSize?: unknown }).wbSize, "")
    );
    const chrt = parseFiniteNumber((o as { chrtID?: unknown }).chrtID);
    const line = [ts, chrt != null ? `chrt:${chrt}` : ""].filter(Boolean).join(" · ");
    if (line) parts.push(line);
  }
  const text = parts.slice(0, 12).join("; ");
  if (!text) return null;
  return { key: "Размеры", value: text.slice(0, 2_000) };
}

function dimensionsCharacteristic(dim: unknown): Characteristic | null {
  const o = asRecord(dim);
  if (!o) return null;
  const w = parseFiniteNumber(o.width);
  const h = parseFiniteNumber(o.height);
  const l = parseFiniteNumber(o.length);
  if (w == null && h == null && l == null) return null;
  const parts: string[] = [];
  if (l != null) parts.push(`длина: ${l} см`);
  if (w != null) parts.push(`ширина: ${w} см`);
  if (h != null) parts.push(`высота: ${h} см`);
  return { key: "Габариты (см)", value: parts.join(", ") || "—" };
}

/**
 * Сырой JSON одной карточки (`data.cards[]` от Content API) → данные для `Product` / `prisma.product.create`.
 *
 * **Таблица (WB → Product / `CreateProductRequest` / Prisma):**
 * | WB | Product |
 * |----|---------|
 * | `nmID` | `wbNmId` |
 * | `updatedAt` (ISO) | `wbCardUpdatedAt` |
 * | (синк с WB) | `isActive: true` |
 * | `title` / `name` | `name` |
 * | `brand`, `subjectName` | `breadcrumbs` = `['Wildberries', brand?, subject?]` |
 * | `description` | `description` (без HTML, обрезка `WB_DESCRIPTION_MAX_LEN`) |
 * | `photos` / `media` | `images` (пусто → SVG data URL 1×1) |
 * | `sizes[]` в Content (редко с ценами) — **копейки**, `/100` → ₽ | `price`; иначе синк подставляет данные **«Цены и скидки»** (₽) |
 * | `vendorCode` | хар-ка `Артикул (WB)` |
 * | `dimensions` | хар-ка `Габариты (WB, см)` |
 * | `characteristics` | `ProductCharacteristic` (name/value) |
 * | `sizes` | хар-ка `Размеры (WB)` (кратко) |
 * | `subjectName` | `categories[0]` |
 * | `video` | `videoUrl` |
 * | (нет) | `pickup` / `delivery` / `returnDetails` — константы `WB_DEFAULT_*` |
 * | (нет) | `ageGroups: []` |
 *
 * @returns `null`, если нет валидного `nmID`.
 */
export type MapWbCardOptions = {
  /**
   * Цена из `GET …/api/v2/list/goods/filter` («Цены и скидки»).
   * Content-карточка обычно **без** цен → без этого поля на витрине была бы заглушка {@link WB_PLACEHOLDER_PRICE_RUB}.
   */
  discountsPrice?: WbSizePriceInfo;
  /**
   * Суммарный остаток по размерам/складам, рассчитанный отдельным API остатков.
   * Если передан, имеет приоритет над эвристикой из полей карточки.
   */
  stockAmount?: number | null;
};

export function mapWbCardToProductData(
  card: unknown,
  options?: MapWbCardOptions
): WbProductMapped | null {
  const root = asRecord(card);
  if (!root) return null;
  const nm = parseWbCardNmId(root.nmID);
  if (nm == null) return null;

  const title = toTrimmedString(root.title) || toTrimmedString(root.name);
  const brand = toTrimmedString(root.brand);
  const subjectName = toTrimmedString(
    (root as { subjectName?: unknown }).subjectName
  );
  const vendorCode = toTrimmedString(
    (root as { vendorCode?: unknown }).vendorCode
  );

  const name =
    title ||
    (vendorCode ? `Товар ${vendorCode}` : `Товар nm ${nm}`);

  const baseCrumbs = [brand, subjectName]
    .map((c) => c.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const breadcrumbs: string[] =
    baseCrumbs.length === 0
      ? ["Каталог"]
      : [...baseCrumbs];

  const rawDesc = toTrimmedString(
    (root as { description?: unknown }).description,
    WB_DEFAULT_PRODUCT_DESCRIPTION
  );
  const stripped = stripSimpleHtmlToText(rawDesc).slice(0, WB_DESCRIPTION_MAX_LEN);
  const description = stripped
    ? stripped
    : WB_DEFAULT_PRODUCT_DESCRIPTION;

  const media = (root as { media?: unknown }).media;
  const photos = root.photos != null ? root.photos : media;
  const urls = collectPhotoUrls(photos);
  const images = urls.length > 0 ? urls : [PLACEHOLDER_IMAGE_DATA_URL];

  const sizes = (root as { sizes?: unknown }).sizes;
  const { currentRub, oldRub, discountPercent } =
    options?.discountsPrice ?? extractSizePrice(sizes);
  const totalStock =
    options?.stockAmount != null && Number.isFinite(options.stockAmount)
      ? Math.max(0, Math.floor(options.stockAmount))
      : totalStockFromCard(root);

  let characteristics = mapWbCharacteristicsToProduct(root.characteristics);
  const dimChar = dimensionsCharacteristic(
    (root as { dimensions?: unknown }).dimensions
  );
  if (dimChar) characteristics = mergeCharacteristics(characteristics, [dimChar]);
  if (vendorCode) {
    characteristics = mergeCharacteristics(characteristics, [
      { key: "Артикул", value: vendorCode },
    ]);
  }
  const sum = sizeSummary(sizes);
  if (sum) characteristics = mergeCharacteristics(characteristics, [sum]);
  if (characteristics.length === 0) {
    characteristics = [{ key: "Источник", value: "Импорт каталога" }];
  }

  const videoUrl = toTrimmedString((root as { video?: unknown }).video) || undefined;

  const categories = subjectName ? [subjectName] : [];

  const createRequest: CreateProductRequest = {
    name,
    breadcrumbs,
    images,
    price: currentRub,
    oldPrice: oldRub ?? undefined,
    discountPercent: discountPercent ?? undefined,
    currency: "₽",
    favorite: false,
    pickupAvailability: pickupAvailabilityText(totalStock),
    deliveryAvailability: deliveryAvailabilityText(totalStock),
    returnDetails: WB_DEFAULT_RETURN_DETAILS,
    returnDays: 14,
    description,
    characteristics,
    categories,
    ageGroups: [],
    videoUrl,
  };

  const wbCardUpdatedAt =
    parseDateLoose((root as { updatedAt?: unknown }).updatedAt) ??
    parseDateLoose((root as { updateAt?: unknown }).updateAt);

  const prismaCreate: Prisma.ProductCreateInput = {
    name: createRequest.name,
    breadcrumbs: JSON.stringify(createRequest.breadcrumbs),
    images: JSON.stringify(createRequest.images),
    price: createRequest.price,
    oldPrice: createRequest.oldPrice ?? null,
    discountPercent: createRequest.discountPercent ?? null,
    currency: createRequest.currency ?? "₽",
    favorite: createRequest.favorite ?? false,
    pickupAvailability: createRequest.pickupAvailability,
    deliveryAvailability: createRequest.deliveryAvailability,
    returnDays: createRequest.returnDays ?? 14,
    returnDetails: createRequest.returnDetails,
    description: createRequest.description,
    videoUrl: createRequest.videoUrl ?? null,
    categories: JSON.stringify(createRequest.categories ?? []),
    ageGroups: JSON.stringify(createRequest.ageGroups ?? []),
    isActive: true,
    wbNmId: nm,
    wbCardUpdatedAt: wbCardUpdatedAt,
    characteristics: {
      create: createRequest.characteristics.map((c) => ({
        key: c.key,
        value: c.value,
      })),
    },
  };

  return {
    wbNmId: nm,
    wbCardUpdatedAt,
    isActive: true,
    createRequest,
    prismaCreate,
  };
}

function mergeCharacteristics(
  a: Characteristic[],
  b: Characteristic[]
): Characteristic[] {
  const seen = new Set<string>();
  const out: Characteristic[] = [];
  for (const x of a) {
    const k = `${x.key}::${x.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  for (const x of b) {
    const k = `${x.key}::${x.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
