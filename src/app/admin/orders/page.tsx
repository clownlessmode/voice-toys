"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Search, Filter, Download } from "lucide-react";
import {
  Order,
  OrderFilters,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  OrderStatus,
} from "@/components/entities/order/model/types";
import { formatPrice, formatDate } from "@/lib/order-utils";

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 20,
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      params.append("page", String(filters.page || 1));
      params.append("limit", String(filters.limit || 20));

      const response = await fetch(`/api/orders?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders);
      setTotalOrders(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Обновляем заказ в списке
        setOrders(
          orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      } else {
        alert("Ошибка при обновлении статуса заказа");
      }
    } catch (error) {
      console.error("Ошибка при обновлении статуса:", error);
      alert("Ошибка при обновлении статуса заказа");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      params.append("limit", "10000"); // Экспортируем все

      const response = await fetch(`/api/orders/export?${params.toString()}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orders-${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Ошибка при экспорте заказов");
      }
    } catch (error) {
      console.error("Ошибка при экспорте:", error);
      alert("Ошибка при экспорте заказов");
    }
  };

  if (loading && orders.length === 0) {
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
          onClick={fetchOrders}
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
          <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление заказами клиентов
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            Экспорт в Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск заказов..."
              value={filters.search || ""}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value, page: 1 })
              }
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: (e.target.value as OrderStatus) || undefined,
                  page: 1,
                })
              }
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary focus:border-primary appearance-none"
            >
              <option value="">Все статусы</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) =>
                setFilters({ ...filters, dateFrom: e.target.value, page: 1 })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              placeholder="Дата от"
            />
          </div>

          <div>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) =>
                setFilters({ ...filters, dateTo: e.target.value, page: 1 })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              placeholder="Дата до"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Заказ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items.length} товаров
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customerPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPrice(order.totalAmount, order.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(
                            order.id,
                            e.target.value as OrderStatus
                          )
                        }
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-0 ${
                          ORDER_STATUS_COLORS[order.status]
                        }`}
                      >
                        {Object.entries(ORDER_STATUS_LABELS).map(
                          ([status, label]) => (
                            <option key={status} value={status}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900 p-1"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {filters.search || filters.status
                  ? "Ничего не найдено"
                  : "Нет заказов"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalOrders > (filters.limit || 20) && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Показано {orders.length} из {totalOrders} заказов
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                setFilters({ ...filters, page: (filters.page || 1) - 1 })
              }
              disabled={filters.page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <span className="text-sm text-gray-700">
              Страница {filters.page || 1}
            </span>
            <button
              onClick={() =>
                setFilters({ ...filters, page: (filters.page || 1) + 1 })
              }
              disabled={orders.length < (filters.limit || 20)}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
