"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProducts, Product } from "@/components/entities/product";
import { Edit, Trash2, Plus, Search, Filter } from "lucide-react";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts({
        search: searchQuery || undefined,
        type: filterType || undefined,
        limit: 100,
      });
      setProducts(response.products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, filterType]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот продукт?")) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProducts(products.filter((p) => p.id !== id));
      } else {
        alert("Ошибка при удалении продукта");
      }
    } catch (error) {
      console.error("Ошибка при удалении продукта:", error);
      alert("Ошибка при удалении продукта");
    }
  };

  const uniqueTypes = Array.from(
    new Set(products.map((p) => p.breadcrumbs[2]).filter(Boolean))
  );

  if (loading && products.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Ошибка: {error}</div>
        <button
          onClick={fetchProducts}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Продукты</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление каталогом продуктов
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить продукт
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск продуктов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary focus:border-primary appearance-none"
            >
              <option value="">Все типы</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Продукт
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цена
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создан
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={product.images[0]}
                          alt={product.name}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {product.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.price.current} {product.price.currency}
                      </div>
                      {product.price.old && (
                        <div className="text-sm text-gray-500 line-through">
                          {product.price.old} {product.price.currency}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.breadcrumbs[2] || "Без категории"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString(
                            "ru-RU"
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {products.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {searchQuery || filterType
                  ? "Ничего не найдено"
                  : "Нет продуктов"}
              </div>
              {!searchQuery && !filterType && (
                <Link
                  href="/admin/products/new"
                  className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить первый продукт
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 text-sm text-gray-500">
        Показано {products.length} продуктов
      </div>
    </div>
  );
}
