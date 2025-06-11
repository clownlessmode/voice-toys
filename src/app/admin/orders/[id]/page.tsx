"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { Order, OrderStatus } from "@/components/entities/order/model/types";
import {
  formatCurrency,
  formatOrderDate,
  getStatusColor,
  getStatusLabel,
} from "@/lib/order-utils";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Заказ не найден");
          return;
        }
        throw new Error("Ошибка загрузки заказа");
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Ошибка загрузки заказа");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Ошибка обновления статуса");
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Ошибка обновления статуса заказа");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к заказам
          </Link>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка заказа...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к заказам
          </Link>
        </div>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к заказам
          </Link>
          <h1 className="text-2xl font-bold">Заказ {order.orderNumber}</h1>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold">Товары в заказе</h2>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  {item.product.images && item.product.images.length > 0 && (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.price, order.currency)} ×{" "}
                      {item.quantity} шт.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(
                        item.price * item.quantity,
                        order.currency
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Итого:</span>
                <span>{formatCurrency(order.totalAmount, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">История заказа</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Заказ создан</p>
                  <p className="text-sm text-gray-600">
                    {formatOrderDate(order.createdAt)}
                  </p>
                </div>
              </div>

              {order.paidAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Заказ оплачен</p>
                    <p className="text-sm text-gray-600">
                      {formatOrderDate(order.paidAt)}
                    </p>
                  </div>
                </div>
              )}

              {order.updatedAt !== order.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Последнее обновление</p>
                    <p className="text-sm text-gray-600">
                      {formatOrderDate(order.updatedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold">Информация о клиенте</h2>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Имя</p>
                <p className="font-medium">{order.customerName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Телефон</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>

              {order.customerEmail && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold">Доставка</h2>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Тип доставки</p>
                <p className="font-medium">
                  {order.deliveryType === "pickup" ? "Самовывоз" : "Доставка"}
                </p>
              </div>

              {order.deliveryAddress && (
                <div>
                  <p className="text-sm text-gray-600">Адрес</p>
                  <p className="font-medium">{order.deliveryAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold">Управление статусом</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Изменить статус
                </label>
                <select
                  value={order.status}
                  onChange={(e) =>
                    updateOrderStatus(e.target.value as OrderStatus)
                  }
                  disabled={updatingStatus}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="CREATED">Создан</option>
                  <option value="PAID">Оплачен</option>
                  <option value="SHIPPED">Отправлен</option>
                  <option value="DELIVERED">Доставлен</option>
                  <option value="CANCELLED">Отменен</option>
                </select>
              </div>

              {updatingStatus && (
                <p className="text-sm text-blue-600">Обновление статуса...</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Быстрые действия</h2>

            <div className="space-y-3">
              <Link
                href={`/admin/orders/${order.id}/edit`}
                className="flex items-center gap-2 w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Редактировать заказ
              </Link>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Package className="w-4 h-4" />
                Печать заказа
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
