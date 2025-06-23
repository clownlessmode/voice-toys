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

// Компонент для печати заказа
const PrintableOrder = ({ order }: { order: Order }) => (
  <div className="print-only">
    <div className="max-w-2xl mx-auto p-8 bg-white">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">ЗАКАЗ {order.orderNumber}</h1>
        <p className="text-gray-600">
          Дата создания: {formatOrderDate(order.createdAt)}
        </p>
        <p className="text-gray-600">Статус: {getStatusLabel(order.status)}</p>
      </div>

      {/* Customer Info */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">
          Информация о клиенте
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Имя:</p>
            <p className="font-medium">{order.customerName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Телефон:</p>
            <p className="font-medium">{order.customerPhone}</p>
          </div>
          {order.customerEmail && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Email:</p>
              <p className="font-medium">{order.customerEmail}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Info */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">Доставка</h2>
        <div>
          <p className="text-sm text-gray-600">Тип доставки:</p>
          <p className="font-medium mb-2">
            {order.deliveryType === "pickup" ? "Самовывоз" : "Доставка"}
          </p>
          {order.deliveryAddress && (
            <>
              <p className="text-sm text-gray-600">Адрес:</p>
              <p className="font-medium">{order.deliveryAddress}</p>
            </>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">
          Товары в заказе
        </h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Наименование</th>
              <th className="text-center py-2">Кол-во</th>
              <th className="text-right py-2">Цена</th>
              <th className="text-right py-2">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.product.name}</td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">
                  {formatCurrency(item.price, order.currency)}
                </td>
                <td className="text-right py-2">
                  {formatCurrency(item.price * item.quantity, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td colSpan={3} className="text-right py-2">
                ИТОГО:
              </td>
              <td className="text-right py-2">
                {formatCurrency(order.totalAmount, order.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 mt-8">
        <p>Спасибо за ваш заказ!</p>
        <p>При вопросах обращайтесь по телефону: +7 (924) 338-23-31</p>
      </div>
    </div>
  </div>
);

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

  const handlePrint = () => {
    // Создаем новое окно для печати
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Получаем HTML для печати
    const printContent = document.querySelector(".print-only")?.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Заказ ${order?.orderNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              color: #000;
            }
            .print-only {
              display: block !important;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .border-b {
              border-bottom: 1px solid #ddd;
            }
            .border-t-2 {
              border-top: 2px solid #000;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: bold; }
            .text-gray-600 { color: #666; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-6 { margin-bottom: 24px; }
            .mb-8 { margin-bottom: 32px; }
            .mt-8 { margin-top: 32px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .pb-2 { padding-bottom: 8px; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .gap-4 { gap: 16px; }
            .col-span-2 { grid-column: span 2; }
            @media print {
              body { margin: 0; padding: 10px; }
              .print-only { display: block !important; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Печатаем после загрузки
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
      {/* Скрытый компонент для печати */}
      {order && (
        <div className="print-only hidden">
          <PrintableOrder order={order} />
        </div>
      )}

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
                onClick={handlePrint}
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
