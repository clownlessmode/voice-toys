"use client";

import { useState } from "react";
import { Cloud, Database, Download } from "lucide-react";
import type { SyncResult } from "@/lib/wb/sync-products";

type WbSyncMode = "incremental" | "full";

type WbLastSync = {
  at: number;
  mode: WbSyncMode;
  data: SyncResult;
};

type WbLastPing = {
  ok: boolean;
  status: number;
  durationMs: number;
  bodyTextPreview?: string;
  at: number;
};

const fetchWithAdminSession: typeof fetch = (input, init) =>
  fetch(input, { ...init, credentials: "include" });

function formatErrorBody(json: unknown): string | null {
  if (json == null || typeof json !== "object") return null;
  if (
    "error" in json &&
    typeof (json as { error: unknown }).error === "string"
  ) {
    return (json as { error: string }).error;
  }
  return null;
}

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<WbLastPing | null>(null);
  const [lastSync, setLastSync] = useState<WbLastSync | null>(null);
  const [syncMode, setSyncMode] = useState<WbSyncMode>("incremental");

  const handleExportData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/products?limit=1000&includeInactive=true",
      );
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

  const handleWbPing = async () => {
    if (pingLoading || syncLoading) return;
    setPingError(null);
    setPingLoading(true);
    try {
      const res = await fetchWithAdminSession("/api/admin/wb/ping");
      const json = (await res.json().catch(() => null)) as
        | WbLastPing
        | { error?: string; ok?: boolean }
        | null;
      if (!res.ok) {
        setPingError(
          formatErrorBody(json) ??
            `HTTP ${res.status}. Не удалось проверить связь с источником каталога.`,
        );
        return;
      }
      if (
        json &&
        typeof json === "object" &&
        "ok" in json &&
        "status" in json &&
        "durationMs" in json
      ) {
        setLastPing({
          ok: Boolean((json as { ok: unknown }).ok),
          status: Number((json as { status: unknown }).status),
          durationMs: Number((json as { durationMs: unknown }).durationMs),
          bodyTextPreview:
            "bodyTextPreview" in json &&
            typeof (json as { bodyTextPreview?: unknown }).bodyTextPreview ===
              "string"
              ? (json as { bodyTextPreview: string }).bodyTextPreview
              : undefined,
          at: Date.now(),
        });
      }
    } catch (e) {
      setPingError(
        e instanceof Error
          ? e.message
          : "Сетевая ошибка при проверке источника каталога",
      );
    } finally {
      setPingLoading(false);
    }
  };

  const handleWbSync = async () => {
    if (syncLoading || pingLoading) return;
    setSyncError(null);
    setSyncLoading(true);
    const mode = syncMode;
    try {
      const res = await fetchWithAdminSession("/api/admin/wb/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = (await res.json().catch(() => null)) as
        | SyncResult
        | { error?: string }
        | null;
      if (!res.ok) {
        setSyncError(
          formatErrorBody(json) ??
            `HTTP ${res.status}. Синхронизация не выполнена.`,
        );
        return;
      }
      if (json && typeof json === "object" && "added" in json) {
        setLastSync({ at: Date.now(), mode, data: json as SyncResult });
      }
    } catch (e) {
      setSyncError(
        e instanceof Error ? e.message : "Сетевая ошибка при синхронизации",
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const wbBusy = pingLoading || syncLoading;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="mt-2 text-sm text-gray-700">
          Управление системой и данными
        </p>
      </div>

      <div className="space-y-6 mb-5">
        {/* Database Management */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Database className="h-6 w-6 text-gray-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">
              Управление базой данных
            </h3>
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
        </div>

        {/* Catalog source */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Cloud className="h-6 w-6 text-gray-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Источник каталога</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Проверка доступа к API и ручной запуск синхронизации каталога
            (карточки и остатки).
          </p>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="wb-sync-mode"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Режим синхронизации
              </label>
              <select
                id="wb-sync-mode"
                className="block w-full sm:max-w-md rounded-md border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:ring-primary"
                value={syncMode}
                onChange={(e) => setSyncMode(e.target.value as WbSyncMode)}
                disabled={wbBusy}
                title={
                  syncMode === "incremental"
                    ? "Инкрементально подтягиваем новые и изменённые карточки с места, где остановились. Быстрее, для обычных и cron-запусков."
                    : "Полный проход каталога у источника: сверка с базой и деактивация товаров, отсутствующих в выгрузке. Дольше, для исправления расхождений."
                }
              >
                <option
                  value="incremental"
                  title="Инкрементально подтягиваем новые и изменённые карточки с места, где остановились. Быстрее, для обычных и cron-запусков."
                >
                  Инкрементальная
                </option>
                <option
                  value="full"
                  title="Полный проход каталога у источника: сверка с базой и деактивация товаров, отсутствующих в выгрузке. Дольше, для исправления расхождений."
                >
                  Полная сверка
                </option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {syncMode === "incremental"
                  ? "С продолжения курсора: только новые/изменённые карточки (быстрее)."
                  : "Полный каталог WB и сопоставление; может деактивировать лишние в базе (дольше)."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleWbPing}
                disabled={wbBusy}
                className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-800 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pingLoading ? "Проверка…" : "Проверить связь"}
              </button>
              <button
                type="button"
                onClick={handleWbSync}
                disabled={wbBusy}
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncLoading ? "Синхронизация…" : "Синхронизировать"}
              </button>
            </div>
          </div>

          {pingError && (
            <div
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {pingError}
            </div>
          )}

          {lastPing && (
            <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <p className="font-medium text-gray-900">
                Последняя проверка связи:{" "}
                {new Date(lastPing.at).toLocaleString("ru-RU")}
              </p>
              <p className="mt-1 text-gray-700">
                Состояние:{" "}
                <span
                  className={lastPing.ok ? "text-green-700" : "text-amber-800"}
                >
                  {lastPing.ok ? "успех" : "ошибка API"}
                </span>
                {", "}
                HTTP {lastPing.status}, {lastPing.durationMs} мс
              </p>
              {lastPing.bodyTextPreview ? (
                <p className="mt-1 text-xs text-gray-500 break-words">
                  {lastPing.bodyTextPreview}
                </p>
              ) : null}
            </div>
          )}

          {syncError && (
            <div
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {syncError}
            </div>
          )}

          {lastSync && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900">
                Последняя синхронизация:{" "}
                {new Date(lastSync.at).toLocaleString("ru-RU")}{" "}
                <span className="text-gray-500 font-normal">
                  (
                  {lastSync.mode === "incremental"
                    ? "инкрементальная"
                    : "полная сверка"}
                  )
                </span>
              </p>
              <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-800">
                <div>
                  <dt className="text-gray-500">Добавлено</dt>
                  <dd className="font-medium tabular-nums">
                    {lastSync.data.added}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Обновлено</dt>
                  <dd className="font-medium tabular-nums">
                    {lastSync.data.updated}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Деактивировано</dt>
                  <dd className="font-medium tabular-nums">
                    {lastSync.data.deactivated}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Без изменений</dt>
                  <dd className="font-medium tabular-nums">
                    {lastSync.data.unchanged}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Ошибок</dt>
                  <dd className="font-medium tabular-nums">
                    {lastSync.data.errors}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Длительность</dt>
                  <dd className="font-medium tabular-nums">
                    {lastSync.data.durationMs} мс
                  </dd>
                </div>
              </dl>
              {lastSync.data.reconcileSkippedReason ? (
                <p className="mt-3 text-amber-800 text-xs sm:text-sm">
                  Сверка пропущена: {lastSync.data.reconcileSkippedReason}
                </p>
              ) : null}
              {lastSync.data.errorSamples &&
              lastSync.data.errorSamples.length > 0 ? (
                <div className="mt-2">
                  <p className="text-gray-600 text-xs font-medium">
                    Примеры ошибок:
                  </p>
                  <ul className="mt-1 list-disc list-inside text-xs text-gray-700 space-y-0.5">
                    {lastSync.data.errorSamples.map((s, i) => (
                      <li key={i}>
                        nmId: {s.nmId ?? "—"} — {s.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
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
            <dd className="mt-1 text-sm text-gray-900">SQLite (разработка)</dd>
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
  );
}
