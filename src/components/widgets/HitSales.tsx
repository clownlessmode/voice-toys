"use client";

import React, { useState, useEffect } from "react";
import ProductSlider from "../ui/components/product-slider";
import { getProducts, Product } from "../entities/product";

const HitSales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await getProducts({ limit: 10 });
        setProducts(response.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg">Загрузка продуктов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg text-red-500">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <ProductSlider
      title="Хиты продаж"
      products={products}
      showViewAll={true}
      viewAllLink="/catalogue"
      viewAllText="смотреть все"
    />
  );
};

export default HitSales;
