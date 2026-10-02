import type { OzonCatalogProduct } from "./client";

type SiteProduct = {
  id: string;
  name: string;
  wbNmId: number | null;
  characteristics: { key: string; value: string }[];
};

export type CatalogMatch = {
  productId: string;
  name: string;
  article: string | null;
  status: "matched" | "missing" | "no_article" | "ambiguous" | "archived";
  ozonProductId?: string;
  ozonSku?: string;
  hasFboStocks?: boolean;
  hasFbsStocks?: boolean;
};

export type OzonCatalogComparison = {
  ozonTotal: number;
  siteTotal: number;
  matched: number;
  products: CatalogMatch[];
};

/** A review report, not an inventory ledger or automatic product publication. */
export function compareOzonCatalog(site: SiteProduct[], ozon: OzonCatalogProduct[]): OzonCatalogComparison {
  const articles = site.map(product => [...new Set(product.characteristics
    .filter(c => c.key === "Артикул" || c.key === "Артикул (WB)")
    .map(c => c.value.trim()).filter(Boolean))]);
  const counts = new Map<string, number>();
  for (const values of articles) for (const article of values) {
    counts.set(article, (counts.get(article) ?? 0) + 1);
  }
  const byOffer = new Map<string, OzonCatalogProduct[]>();
  for (const item of ozon) byOffer.set(item.offer_id, [...(byOffer.get(item.offer_id) ?? []), item]);
  const products: CatalogMatch[] = site.map((product, index) => {
    const values = articles.at(index)!;
    const article = values.length === 1 ? values[0] : null;
    const base = { productId: product.id, name: product.name, article };
    if (!values.length) return { ...base, status: "no_article" };
    if (!article || counts.get(article)! > 1) return { ...base, status: "ambiguous" };
    const matches = byOffer.get(article) ?? [];
    if (!matches.length) return { ...base, status: "missing" };
    if (matches.length > 1) return { ...base, status: "ambiguous" };
    const item = matches[0];
    return {
      ...base, status: item.archived ? "archived" : "matched",
      ozonProductId: String(item.product_id), ozonSku: String(item.sku),
      hasFboStocks: item.has_fbo_stocks, hasFbsStocks: item.has_fbs_stocks,
    };
  });
  return { ozonTotal: ozon.length, siteTotal: site.length,
    matched: products.filter(p => p.status === "matched").length, products };
}
