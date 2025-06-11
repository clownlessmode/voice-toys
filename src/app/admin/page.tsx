"use client";

import { useState, useEffect } from "react";
import { getProducts } from "@/components/entities/product";
import { Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

interface ActivityItem {
  title: string;
  subtitle: string;
  time: string;
  type: string;
  color: string;
}

function formatTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Только что";
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;

  return date.toLocaleDateString("ru-RU");
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    CREATED: "Создан",
    PAID: "Оплачен",
    SHIPPED: "Отправлен",
    DELIVERED: "Доставлен",
    CANCELLED: "Отменен",
  };
  return statusMap[status] || status;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: string;
  changeType?: "positive" | "negative";
}

function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {value}
              </div>
              {change && (
                <div
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    changeType === "positive"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {change}
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    uniqueCustomers: 0,
    loading: true,
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Загружаем продукты
        const productsResponse = await getProducts({ limit: 1000 });

        // Загружаем заказы
        const ordersResponse = await fetch("/api/orders?limit=1000");
        let ordersData = { orders: [], total: 0 };
        if (ordersResponse.ok) {
          ordersData = await ordersResponse.json();
        }

        // Подсчитываем статистику
        const revenue = ordersData.orders
          .filter((order: any) => order.status === "PAID")
          .reduce((sum: number, order: any) => sum + order.totalAmount, 0);

        const uniqueCustomers = new Set(
          ordersData.orders.map((order: any) => order.customerPhone)
        ).size;

        setStats({
          totalProducts: productsResponse.total,
          totalOrders: ordersData.total,
          totalRevenue: revenue,
          uniqueCustomers,
          loading: false,
        });

        // Формируем последние активности
        const activities: ActivityItem[] = [];

        // Последние заказы
        const recentOrders = ordersData.orders
          .sort(
            (a: any, b: any) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 3);

        recentOrders.forEach((order: any) => {
          if (order.status === "PAID" && order.paidAt) {
            activities.push({
              title: `Заказ ${order.orderNumber} оплачен`,
              subtitle: `${
                order.customerName
              } - ₽${order.totalAmount.toLocaleString("ru-RU")}`,
              time: formatTime(order.paidAt),
              type: "payment",
              color: "bg-green-100 text-green-800",
            });
          } else if (order.updatedAt !== order.createdAt) {
            activities.push({
              title: `Заказ ${order.orderNumber} обновлен`,
              subtitle: getStatusText(order.status),
              time: formatTime(order.updatedAt),
              type: "order",
              color: "bg-blue-100 text-blue-800",
            });
          } else {
            activities.push({
              title: `Новый заказ ${order.orderNumber}`,
              subtitle: `${
                order.customerName
              } - ₽${order.totalAmount.toLocaleString("ru-RU")}`,
              time: formatTime(order.createdAt),
              type: "order",
              color: "bg-yellow-100 text-yellow-800",
            });
          }
        });

        setRecentActivity(
          activities
            .slice(0, 5)
            .sort(
              (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
            )
        );
      } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
        setStats({
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          uniqueCustomers: 0,
          loading: false,
        });
        setRecentActivity([]);
      }
    }

    fetchStats();
  }, []);

  if (stats.loading) {
    return (
      <div className="animate-pulse">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Обзор</h1>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Обзор</h1>
        <p className="mt-2 text-sm text-gray-700">
          Добро пожаловать в админ панель Voice Toys
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Всего продуктов"
          value={stats.totalProducts}
          icon={Package}
        />
        <StatsCard
          title="Всего заказов"
          value={stats.totalOrders}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Выручка (оплаченные)"
          value={`₽${stats.totalRevenue.toLocaleString("ru-RU")}`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Уникальных клиентов"
          value={stats.uniqueCustomers}
          icon={Users}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Быстрые действия
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/admin/orders"
              className="bg-primary text-white px-4 py-3 rounded-md text-center hover:bg-primary/90 transition-colors"
            >
              Просмотр заказов
            </a>
            <a
              href="/admin/products/new"
              className="bg-gray-100 text-gray-900 px-4 py-3 rounded-md text-center hover:bg-gray-200 transition-colors"
            >
              Добавить продукт
            </a>
            <a
              href="/admin/products"
              className="bg-gray-100 text-gray-900 px-4 py-3 rounded-md text-center hover:bg-gray-200 transition-colors"
            >
              Управление продуктами
            </a>
            <a
              href="/admin/orders"
              className="bg-gray-100 text-gray-900 px-4 py-3 rounded-md text-center hover:bg-gray-200 transition-colors"
            >
              Экспорт в Excel
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Последние изменения
          </h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500">{activity.subtitle}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.color}`}
                  >
                    {activity.type === "payment" ? "Оплата" : "Заказ"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Пока нет активности</p>
                <p className="text-sm">
                  Активность появится после создания заказов
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
