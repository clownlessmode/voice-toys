// Canonical WB card JSON: test/lib/wb/fixtures/sample-wb-card.json (avoid duplicating under test/fixtures/).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateProductData } from "@/lib/product-utils";
import {
  WB_DEFAULT_PRODUCT_DESCRIPTION,
  WB_DESCRIPTION_MAX_LEN,
  WB_PLACEHOLDER_PRICE_RUB,
  collectPhotoUrls,
  kopeksToPriceRub,
  mapWbCardToProductData,
  mapWbCharacteristicsToProduct,
  parseWbCardNmId,
  priceInfoFromDiscountsListGood,
  stripSimpleHtmlToText,
  validateWbProductPayload,
} from "@/lib/wb/map-card-to-product";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleCardPath = join(__dirname, "fixtures", "sample-wb-card.json");
const sampleWbCard = JSON.parse(
  readFileSync(sampleCardPath, "utf-8")
) as unknown;

describe("mapWbCardToProductData", () => {
  it("maps fixture card to prisma-ready data and passes validateProductData", () => {
    const m = mapWbCardToProductData(sampleWbCard);
    expect(m).not.toBeNull();
    if (!m) return;

    expect(m.wbNmId).toBe(173549012);
    expect(m.isActive).toBe(true);
    expect(m.wbCardUpdatedAt?.toISOString()).toBe("2025-03-10T16:30:00.000Z");
    expect(m.createRequest.name).toContain("Детская");
    expect(m.createRequest.breadcrumbs[0]).toBe("Wildberries");
    expect(m.createRequest.breadcrumbs).toContain("SampleBrand");
    expect(m.createRequest.breadcrumbs).toContain("Развивающие игрушки");
    expect(m.createRequest.images[0]).toContain("example.com");

    // 199900 коп. → 1999 ₽
    expect(m.createRequest.price).toBe(1999);
    expect(m.createRequest.oldPrice).toBe(2499);
    expect(m.createRequest.discountPercent).toBe(20);
    expect(m.createRequest.description).not.toMatch(/<[^>]+>/);
    expect(m.createRequest.videoUrl).toBe("https://video.example.com/preview.mp4");
    expect(m.createRequest.categories).toEqual(["Развивающие игрушки"]);

    const charKeys = m.createRequest.characteristics.map((c) => c.key);
    expect(charKeys).toContain("Артикул (WB)");
    expect(charKeys).toContain("Габариты (WB, см)");
    expect(charKeys).toContain("Размеры (WB)");
    expect(charKeys).toContain("Материал");

    expect(m.prismaCreate.wbNmId).toBe(173549012);
    expect(m.prismaCreate.isActive).toBe(true);
    expect(typeof m.prismaCreate.breadcrumbs).toBe("string");
    expect(typeof m.prismaCreate.images).toBe("string");
    expect(m.prismaCreate.wbCardUpdatedAt).toEqual(m.wbCardUpdatedAt);
    expect(m.prismaCreate.wbCardUpdatedAt?.toISOString()).toBe(
      "2025-03-10T16:30:00.000Z"
    );

    const prismaChars = m.prismaCreate.characteristics.create;
    expect(prismaChars).toHaveLength(5);
    expect(
      prismaChars.every(
        (row) =>
          typeof row.key === "string" &&
          row.key.length > 0 &&
          typeof row.value === "string" &&
          row.value.length > 0
      )
    ).toBe(true);
    expect(prismaChars).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Артикул (WB)",
          value: "VT-SAMPLE-001",
        }),
        expect.objectContaining({ key: "Материал", value: "пластик" }),
        expect.objectContaining({ key: "Размеры (WB)" }),
      ])
    );

    expect(validateProductData(m.createRequest)).toEqual([]);
    expect(validateWbProductPayload(m.createRequest)).toEqual([]);
  });

  it("returns null without nmID", () => {
    expect(
      mapWbCardToProductData({ title: "x", vendorCode: "y" })
    ).toBeNull();
  });

  it("minimal card (nmID + title): default breadcrumbs, Источник, prismaCreate shape", () => {
    const m = mapWbCardToProductData({
      nmID: 42,
      title: "Минимум полей",
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.breadcrumbs).toEqual(["Wildberries", "Каталог"]);
    expect(m.createRequest.characteristics).toEqual([
      { key: "Источник", value: "Wildberries" },
    ]);
    expect(m.createRequest.price).toBe(WB_PLACEHOLDER_PRICE_RUB);
    expect(m.createRequest.description.length).toBeGreaterThan(0);
    expect(m.wbCardUpdatedAt).toBeNull();
    expect(m.prismaCreate.wbCardUpdatedAt).toBeNull();
    expect(m.prismaCreate.characteristics.create).toEqual([
      { key: "Источник", value: "Wildberries" },
    ]);
    expect(validateProductData(m.createRequest)).toEqual([]);
  });

  it("populates images from media when photos is absent (collectPhotoUrls on media)", () => {
    const m = mapWbCardToProductData({
      nmID: 501,
      title: "Только media",
      media: [{ url: "https://images.example.com/wb/media-only.png" }],
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.images).toEqual([
      "https://images.example.com/wb/media-only.png",
    ]);
    expect(validateProductData(m.createRequest)).toEqual([]);
  });

  it("extractSizePrice: discountedPrice only (no list price) → current from discount, no oldPrice", () => {
    const m = mapWbCardToProductData({
      nmID: 600,
      title: "Скидка без старой цены",
      sizes: [{ discountedPrice: 75_000 }],
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.price).toBe(750);
    expect(m.createRequest.oldPrice).toBeUndefined();
    expect(m.createRequest.discountPercent).toBeUndefined();
    expect(validateProductData(m.createRequest)).toEqual([]);
  });

  it("extractSizePrice: price only (no discount field) → current from price", () => {
    const m = mapWbCardToProductData({
      nmID: 601,
      title: "Только price",
      sizes: [{ price: 33_300 }],
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.price).toBe(333);
    expect(m.createRequest.oldPrice).toBeUndefined();
    expect(m.createRequest.discountPercent).toBeUndefined();
  });

  it("extractSizePrice: totalPrice when discountedPrice/price missing or zero", () => {
    const m = mapWbCardToProductData({
      nmID: 602,
      title: "Fallback totalPrice",
      sizes: [{ price: 0, totalPrice: 12_500 }],
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.price).toBe(125);
    expect(m.createRequest.oldPrice).toBeUndefined();
  });

  it("extractSizePrice: totalPrice only on first size", () => {
    const m = mapWbCardToProductData({
      nmID: 603,
      title: "Только totalPrice",
      sizes: [{ totalPrice: 99_900 }],
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.price).toBe(999);
  });

  it("uses placeholder image when photos empty", () => {
    const m = mapWbCardToProductData({
      nmID: 99,
      title: "Без фото",
      photos: [],
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.images).toHaveLength(1);
    expect(m.createRequest.images[0]).toMatch(/^data:image\/svg/);
    expect(validateProductData(m.createRequest)).toEqual([]);
  });

  it("uses default description when description is empty string and passes validateProductData", () => {
    const m = mapWbCardToProductData({
      nmID: 101,
      title: "Тест пустого описания",
      description: "",
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.description).toBe(WB_DEFAULT_PRODUCT_DESCRIPTION);
    expect(validateProductData(m.createRequest)).toEqual([]);
  });

  it("uses default when description is whitespace-only", () => {
    const m = mapWbCardToProductData({
      nmID: 102,
      title: "Тест пробельного описания",
      description: "   \n\t  ",
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.description).toBe(WB_DEFAULT_PRODUCT_DESCRIPTION);
    expect(validateProductData(m.createRequest)).toEqual([]);
  });

  it("uses default when description is HTML-only and strips to empty", () => {
    const m = mapWbCardToProductData({
      nmID: 103,
      title: "Только теги",
      description: "<p></p><br/><div>   &nbsp;  </div>",
    });
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.createRequest.description).toBe(WB_DEFAULT_PRODUCT_DESCRIPTION);
    expect(validateProductData(m.createRequest)).toEqual([]);
  });

  it("truncates long description to WB_DESCRIPTION_MAX_LEN", () => {
    const longHtml = "<p>" + "слово ".repeat(20000) + "</p>";
    const m = mapWbCardToProductData({
      nmID: 1000,
      title: "Длинный текст",
      description: longHtml,
    });
    expect(m).not.toBeNull();
    if (!m) return;
    const cleaned = stripSimpleHtmlToText(longHtml);
    const expected = cleaned.slice(0, WB_DESCRIPTION_MAX_LEN);
    expect(m.createRequest.description.length).toBe(WB_DESCRIPTION_MAX_LEN);
    expect(m.createRequest.description).toBe(expected);
  });
});

describe("parseWbCardNmId", () => {
  it("accepts positive integers (number and numeric string)", () => {
    expect(parseWbCardNmId(173549012)).toBe(173549012);
    expect(parseWbCardNmId("42")).toBe(42);
  });

  it("returns null for non-integer (float) values", () => {
    expect(parseWbCardNmId(1.5)).toBeNull();
    expect(parseWbCardNmId("173549012.4")).toBeNull();
  });

  it("returns null for zero", () => {
    expect(parseWbCardNmId(0)).toBeNull();
    expect(parseWbCardNmId("0")).toBeNull();
  });

  it("returns null for negative", () => {
    expect(parseWbCardNmId(-1)).toBeNull();
    expect(parseWbCardNmId("-99")).toBeNull();
  });

  it("returns null for empty or whitespace-only string", () => {
    expect(parseWbCardNmId("")).toBeNull();
    expect(parseWbCardNmId("   ")).toBeNull();
  });

  it("returns null for null, undefined, NaN, and non-finite numbers", () => {
    expect(parseWbCardNmId(null)).toBeNull();
    expect(parseWbCardNmId(undefined)).toBeNull();
    expect(parseWbCardNmId(NaN)).toBeNull();
    expect(parseWbCardNmId(Infinity)).toBeNull();
    expect(parseWbCardNmId(-Infinity)).toBeNull();
  });

  it("returns null for non-numeric strings", () => {
    expect(parseWbCardNmId("abc")).toBeNull();
    expect(parseWbCardNmId("  abc  ")).toBeNull();
  });
});

describe("priceInfoFromDiscountsListGood (рубли, не копейки)", () => {
  it("пример как в openapi WB: price 500, discountedPrice 350", () => {
    const row = {
      nmID: 98_486,
      sizes: [
        {
          sizeID: 3_123_515_574,
          price: 500,
          discountedPrice: 350,
          techSizeName: "42",
        },
      ],
    };
    const p = priceInfoFromDiscountsListGood(row);
    expect(p?.nmId).toBe(98_486);
    expect(p?.price.currentRub).toBe(350);
    expect(p?.price.oldRub).toBe(500);
    expect(p?.price.discountPercent).toBe(30);
  });

  it("mapWbCardToProductData: discountsPrice перекрывает цену из Content-sizes", () => {
    const m = mapWbCardToProductData(sampleWbCard, {
      discountsPrice: {
        currentRub: 777,
        oldRub: null,
        discountPercent: null,
      },
    });
    expect(m?.createRequest.price).toBe(777);
  });
});

describe("helpers", () => {
  it("stripSimpleHtmlToText removes tags", () => {
    expect(stripSimpleHtmlToText("<div>A</div>")).toBe("A");
  });

  it("kopeksToPriceRub", () => {
    expect(kopeksToPriceRub(100)).toBe(1);
    expect(kopeksToPriceRub(199900)).toBe(1999);
  });

  it("collectPhotoUrls", () => {
    const urls = collectPhotoUrls([
      "https://a/x.jpg",
      { big: "https://a/big.jpg" },
    ]);
    expect(urls).toEqual(["https://a/x.jpg", "https://a/big.jpg"]);
  });

  it("mapWbCharacteristicsToProduct flattens values array", () => {
    const r = mapWbCharacteristicsToProduct([
      { name: "Цвет", "values": ["красный", "синий"] },
    ]);
    expect(r).toEqual([{ key: "Цвет", value: "красный, синий" }]);
  });
});
