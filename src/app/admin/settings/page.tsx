"use client";

import { useState } from "react";
import { Database, Download, Trash2, RefreshCw } from "lucide-react";

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);

  const handleSeedDatabase = async () => {
    if (!window.confirm("Это заменит все существующие продукты. Продолжить?")) {
      return;
    }

    setLoading(true);
    try {
      // В реальном приложении здесь был бы вызов API для seed
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Имитация
      alert("База данных успешно заполнена тестовыми данными");
    } catch (error) {
      console.error("Ошибка при заполнении базы данных:", error);
      alert("Ошибка при заполнении базы данных");
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/products?limit=1000");
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Ошибка при экспорте данных:", error);
      alert("Ошибка при экспорте данных");
    } finally {
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    if (
      !window.confirm(
        "Это удалит ВСЕ продукты из базы данных. Это действие нельзя отменить. Продолжить?"
      )
    ) {
      return;
    }

    if (
      !window.confirm("Вы точно уверены? Все данные будут удалены навсегда!")
    ) {
      return;
    }

    setLoading(true);
    try {
      // В реальном приложении здесь был бы вызов API для очистки
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Имитация
      alert("База данных очищена");
    } catch (error) {
      console.error("Ошибка при очистке базы данных:", error);
      alert("Ошибка при очистке базы данных");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="mt-2 text-sm text-gray-700">
          Управление системой и данными
        </p>
      </div>

      <div className="space-y-6">
        {/* Database Management */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Database className="h-6 w-6 text-gray-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">
              Управление базой данных
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Заполнить тестовыми данными
                </h4>
                <p className="text-sm text-gray-500">
                  Добавить образцы продуктов в базу данных
                </p>
              </div>
              <button
                onClick={handleSeedDatabase}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Заполнить
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Экспорт данных
                </h4>
                <p className="text-sm text-gray-500">
                  Скачать все продукты в формате JSON
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Очистить базу данных
                </h4>
                <p className="text-sm text-gray-500">
                  Удалить все продукты из базы данных
                </p>
              </div>
              <button
                onClick={handleClearDatabase}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Очистить
              </button>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Информация о системе
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Версия приложения
              </dt>
              <dd className="mt-1 text-sm text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">База данных</dt>
              <dd className="mt-1 text-sm text-gray-900">
                SQLite (разработка)
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">API Version</dt>
              <dd className="mt-1 text-sm text-gray-900">v1</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Последнее обновление
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date().toLocaleDateString("ru-RU")}
              </dd>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Быстрые ссылки
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/admin/products"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">
                Управление продуктами
              </div>
              <div className="text-sm text-gray-500">
                Просмотр и редактирование каталога
              </div>
            </a>
            <a
              href="/admin/products/new"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">
                Добавить продукт
              </div>
              <div className="text-sm text-gray-500">Создать новый товар</div>
            </a>
            <a
              href="/catalogue"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">
                Посетить сайт
              </div>
              <div className="text-sm text-gray-500">
                Открыть каталог для клиентов
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
