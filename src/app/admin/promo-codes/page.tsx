"use client";

import { useState, useEffect } from "react";
import {
  PromoCode,
  PromoCodeType,
  CreatePromoCodeRequest,
} from "@/components/entities/promo-code/model/types";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Percent,
  DollarSign,
} from "lucide-react";

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Форма создания/редактирования
  const [formData, setFormData] = useState<CreatePromoCodeRequest>({
    code: "",
    name: "",
    description: "",
    type: PromoCodeType.PERCENTAGE,
    value: 0,
    minOrderAmount: 0,
    maxUses: 0,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
    isActive: true,
  });

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/promo-codes");
      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promoCodes);
        setError(null);
      } else {
        throw new Error("Failed to fetch promo codes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingId
        ? `/api/promo-codes/${editingId}`
        : "/api/promo-codes";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingId(null);
        resetForm();
        fetchPromoCodes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving promo code:", error);
      alert("Error saving promo code");
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setFormData({
      code: promoCode.code,
      name: promoCode.name,
      description: promoCode.description || "",
      type: promoCode.type,
      value: promoCode.value,
      minOrderAmount: promoCode.minOrderAmount || 0,
      maxUses: promoCode.maxUses || 0,
      validFrom: new Date(promoCode.validFrom),
      validUntil: new Date(promoCode.validUntil),
      isActive: promoCode.isActive,
    });
    setEditingId(promoCode.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот промокод?")) return;

    try {
      const response = await fetch(`/api/promo-codes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPromoCodes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting promo code:", error);
      alert("Error deleting promo code");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      type: PromoCodeType.PERCENTAGE,
      value: 0,
      minOrderAmount: 0,
      maxUses: 0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ru-RU");
  };

  const getTypeIcon = (type: PromoCodeType) => {
    return type === PromoCodeType.PERCENTAGE ? (
      <Percent className="h-4 w-4" />
    ) : (
      <DollarSign className="h-4 w-4" />
    );
  };

  const getTypeLabel = (type: PromoCodeType) => {
    return type === PromoCodeType.PERCENTAGE ? "Процент" : "Сумма";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  // Фильтрация промокодов
  const filteredPromoCodes = promoCodes.filter((promoCode) => {
    const matchesSearch =
      !searchQuery ||
      promoCode.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promoCode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (promoCode.description &&
        promoCode.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    const matchesType = !filterType || promoCode.type === filterType;
    const matchesStatus =
      filterStatus === "" ||
      (filterStatus === "active" && promoCode.isActive) ||
      (filterStatus === "inactive" && !promoCode.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading && promoCodes.length === 0) {
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
          onClick={fetchPromoCodes}
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
          <h1 className="text-2xl font-bold text-gray-900">Промокоды</h1>
          <p className="mt-2 text-sm text-gray-700">
            Управление системой промокодов и скидок
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать промокод
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск промокодов..."
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
              <option value={PromoCodeType.PERCENTAGE}>
                Процентная скидка
              </option>
              <option value={PromoCodeType.FIXED_AMOUNT}>
                Фиксированная скидка
              </option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary focus:border-primary appearance-none"
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Promo Codes Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Промокод
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип и значение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Условия
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Использования
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPromoCodes.map((promoCode) => (
                  <tr key={promoCode.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {promoCode.code.slice(0, 2)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {promoCode.code}
                          </div>
                          <div className="text-sm text-gray-500">
                            {promoCode.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(promoCode.type)}
                        <span className="ml-2 text-sm text-gray-900">
                          {promoCode.type === PromoCodeType.PERCENTAGE
                            ? `${promoCode.value}%`
                            : `${promoCode.value} ₽`}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getTypeLabel(promoCode.type)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {promoCode.minOrderAmount &&
                          promoCode.minOrderAmount > 0 && (
                            <div className="flex items-center mb-1">
                              <span className="text-xs text-gray-500">
                                От {promoCode.minOrderAmount} ₽
                              </span>
                            </div>
                          )}
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500">
                            До {formatDate(promoCode.validUntil)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {promoCode.currentUses}
                          {promoCode.maxUses &&
                            promoCode.maxUses > 0 &&
                            ` / ${promoCode.maxUses}`}
                        </span>
                      </div>
                      {promoCode.maxUses && promoCode.maxUses > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (promoCode.currentUses / promoCode.maxUses) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          promoCode.isActive
                        )}`}
                      >
                        {promoCode.isActive ? "Активен" : "Неактивен"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(promoCode)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promoCode.id)}
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

          {filteredPromoCodes.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {searchQuery || filterType || filterStatus
                  ? "Ничего не найдено"
                  : "Нет промокодов"}
              </div>
              {!searchQuery && !filterType && !filterStatus && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Создать первый промокод
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 text-sm text-gray-500">
        Показано {filteredPromoCodes.length} из {promoCodes.length} промокодов
      </div>

      {/* Modal Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingId ? "Редактировать промокод" : "Создать промокод"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Код
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Название
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Тип
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as PromoCodeType,
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                    >
                      <option value={PromoCodeType.PERCENTAGE}>
                        Процентная скидка
                      </option>
                      <option value={PromoCodeType.FIXED_AMOUNT}>
                        Фиксированная скидка
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Значение{" "}
                      {formData.type === PromoCodeType.PERCENTAGE
                        ? "(%)"
                        : "(₽)"}
                    </label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          value: parseFloat(e.target.value),
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                      required
                      min="0"
                      step={
                        formData.type === PromoCodeType.PERCENTAGE
                          ? "1"
                          : "0.01"
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Минимальная сумма заказа (₽)
                    </label>
                    <input
                      type="number"
                      value={formData.minOrderAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minOrderAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Максимум использований
                    </label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxUses: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Действует с
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.validFrom.toISOString().slice(0, 16)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          validFrom: new Date(e.target.value),
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Действует до
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.validUntil.toISOString().slice(0, 16)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          validUntil: new Date(e.target.value),
                        })
                      }
                      className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="mr-2"
                    />
                    Активен
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    {editingId ? "Сохранить" : "Создать"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
