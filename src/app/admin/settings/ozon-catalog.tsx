"use client";

import { useState } from "react";
import type { CatalogMatch, OzonCatalogComparison } from "@/lib/ozon/catalog";

const labels: Record<CatalogMatch["status"], string> = {
  matched: "Совпадение по артикулу",
  missing: "Нет совпадения в Ozon",
  no_article: "Не указан артикул",
  ambiguous: "Требуется ручная проверка",
  archived: "Карточка Ozon в архиве",
};

export function OzonCatalogSettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<OzonCatalogComparison | null>(null);

  async function compare() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/admin/ozon/catalog", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось выполнить сверку");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось связаться с Ozon");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white shadow rounded-lg p-6" aria-labelledby="ozon-catalog-heading">
      <h2 id="ozon-catalog-heading" className="text-lg font-medium text-gray-900">Каталог Ozon</h2>
      <p className="mt-2 text-sm text-gray-600">
        Сверьте товары сайта с существующими карточками Ozon по артикулу продавца.
        Сверка не меняет карточки, цены и остатки на площадках.
      </p>
      <p className="mt-2 text-sm text-amber-800">
        Доставка Ozon ещё не подключена. Доступ к каталогу и совпадение артикула
        не подтверждают возможность отправить заказ сайта.
      </p>
      <button type="button" onClick={compare} disabled={loading}
        className="mt-4 px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50">
        {loading ? "Сверяем каталог…" : "Сверить каталог Ozon"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {report && <div className="mt-4">
        <p role="status" className="text-sm text-gray-900">
          На сайте: {report.siteTotal}. В Ozon: {report.ozonTotal}.
          Совпадений: {report.matched}. Требуют проверки: {report.siteTotal - report.matched}.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-900">
            <caption className="sr-only">Результат сверки товаров сайта и Ozon</caption>
            <thead><tr className="border-b">
              <th scope="col" className="py-2 pr-4">Товар</th>
              <th scope="col" className="py-2 pr-4">Артикул</th>
              <th scope="col" className="py-2 pr-4">Результат</th>
              <th scope="col" className="py-2">Наличие в Ozon</th>
            </tr></thead>
            <tbody>{report.products.map(product => <tr key={product.productId} className="border-b">
              <td className="py-2 pr-4">{product.name}</td>
              <td className="py-2 pr-4">{product.article ?? "—"}</td>
              <td className="py-2 pr-4">{labels[product.status]}</td>
              <td className="py-2">{product.status !== "matched" ? "—" :
                [product.hasFboStocks && "Склад Ozon (FBO)", product.hasFbsStocks && "Склад продавца (FBS)"]
                  .filter(Boolean).join(", ") || "Нет"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </section>
  );
}
