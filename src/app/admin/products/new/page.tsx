"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import FileUpload, {
  UploadedFile,
  ImagePreview,
} from "@/components/ui/components/file-upload";

interface ProductForm {
  name: string;
  breadcrumbs: string[];
  images: string[];
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  currency: string;
  pickupAvailability: string;
  deliveryAvailability: string;
  returnDays: number;
  returnDetails: string;
  description: string;
  characteristics: { key: string; value: string }[];
}

export default function NewProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string>("");
  const [form, setForm] = useState<ProductForm>({
    name: "",
    breadcrumbs: ["Главная", "Каталог", "Интерактивные игрушки", ""],
    images: [""],
    price: 0,
    oldPrice: null,
    discountPercent: null,
    currency: "₽",
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description: "",
    characteristics: [{ key: "", value: "" }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Обновляем последний элемент breadcrumbs названием продукта
      // Собираем URL изображений из загруженных файлов и введенных URL
      const allImages = [
        ...uploadedFiles.map((file) => file.url),
        ...form.images.filter((img) => img.trim() !== ""),
      ];

      const updatedForm = {
        ...form,
        breadcrumbs: [...form.breadcrumbs.slice(0, -1), form.name],
        images: allImages,
        characteristics: form.characteristics.filter(
          (char) => char.key.trim() !== "" && char.value.trim() !== ""
        ),
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedForm),
      });

      if (response.ok) {
        router.push("/admin/products");
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || "Не удалось создать продукт"}`);
      }
    } catch (error) {
      console.error("Ошибка при создании продукта:", error);
      alert("Ошибка при создании продукта");
    } finally {
      setLoading(false);
    }
  };

  const addImage = () => {
    setForm({ ...form, images: [...form.images, ""] });
  };

  const removeImage = (index: number) => {
    if (form.images.length > 1) {
      setForm({
        ...form,
        images: form.images.filter((_, i) => i !== index),
      });
    }
  };

  const updateImage = (index: number, value: string) => {
    const newImages = [...form.images];
    newImages[index] = value;
    setForm({ ...form, images: newImages });
  };

  const addCharacteristic = () => {
    setForm({
      ...form,
      characteristics: [...form.characteristics, { key: "", value: "" }],
    });
  };

  const removeCharacteristic = (index: number) => {
    if (form.characteristics.length > 1) {
      setForm({
        ...form,
        characteristics: form.characteristics.filter((_, i) => i !== index),
      });
    }
  };

  const updateCharacteristic = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newCharacteristics = [...form.characteristics];
    newCharacteristics[index][field] = value;
    setForm({ ...form, characteristics: newCharacteristics });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            href="/admin/products"
            className="mr-4 p-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Добавить продукт</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Основная информация
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Название продукта *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Категория
              </label>
              <select
                value={form.breadcrumbs[2]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    breadcrumbs: [
                      form.breadcrumbs[0],
                      form.breadcrumbs[1],
                      e.target.value,
                      form.breadcrumbs[3],
                    ],
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              >
                <option value="Интерактивные игрушки">
                  Интерактивные игрушки
                </option>
                <option value="Развивающие игрушки">Развивающие игрушки</option>
                <option value="Игрушки антистресс">Игрушки антистресс</option>
                <option value="Игрушечный транспорт">
                  Игрушечный транспорт
                </option>
                <option value="Радиоуправляемые игрушки">
                  Радиоуправляемые игрушки
                </option>
                <option value="Обучающие игрушки">Обучающие игрушки</option>
                <option value="Настольные игры">Настольные игры</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Возрастная группа *
              </label>
              <select
                required
                value={
                  form.characteristics.find((char) => char.key === "Возраст")
                    ?.value || ""
                }
                onChange={(e) => {
                  const newCharacteristics = form.characteristics.filter(
                    (char) => char.key !== "Возраст"
                  );
                  if (e.target.value) {
                    newCharacteristics.push({
                      key: "Возраст",
                      value: e.target.value,
                    });
                  }
                  setForm({ ...form, characteristics: newCharacteristics });
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Выберите возрастную группу</option>
                <option value="6м-2года">6 м. – 2 года</option>
                <option value="3-4года">3 – 4 года</option>
                <option value="5-7лет">5 – 7 лет</option>
                <option value="8-10лет">8 – 10 лет</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Описание *
              </label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Цены</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Текущая цена *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Старая цена (опционально)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.oldPrice || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    oldPrice: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Процент скидки (опционально)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discountPercent || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountPercent: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Изображения
          </h3>

          {/* Загрузка файлов */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Загрузить изображения с компьютера
            </h4>
            <FileUpload
              onUpload={(files) => {
                setUploadedFiles((prev) => [...prev, ...files]);
                setUploadError("");
              }}
              onError={(error) => setUploadError(error)}
              folder="products"
              maxFiles={10}
              resize={true}
              width={1200}
              height={1200}
              quality={90}
            />

            {uploadError && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                {uploadError}
              </div>
            )}
          </div>

          {/* Превью загруженных изображений */}
          {uploadedFiles.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Загруженные изображения ({uploadedFiles.length})
              </h4>
              <ImagePreview
                files={uploadedFiles}
                onRemove={(index) => {
                  setUploadedFiles((prev) =>
                    prev.filter((_, i) => i !== index)
                  );
                }}
              />
            </div>
          )}

          {/* Ручной ввод URL */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">
                Или добавить URL изображений
              </h4>
              <button
                type="button"
                onClick={addImage}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить URL
              </button>
            </div>
            <div className="space-y-4">
              {form.images.map((image, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <input
                    type="url"
                    placeholder="URL изображения"
                    value={image}
                    onChange={(e) => updateImage(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                  />
                  {form.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="p-2 text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Доступность и возврат
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Самовывоз
              </label>
              <input
                type="text"
                value={form.pickupAvailability}
                onChange={(e) =>
                  setForm({ ...form, pickupAvailability: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Доставка
              </label>
              <input
                type="text"
                value={form.deliveryAvailability}
                onChange={(e) =>
                  setForm({ ...form, deliveryAvailability: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Дни для возврата
              </label>
              <input
                type="number"
                min="0"
                value={form.returnDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    returnDays: parseInt(e.target.value) || 14,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Детали возврата
              </label>
              <input
                type="text"
                value={form.returnDetails}
                onChange={(e) =>
                  setForm({ ...form, returnDetails: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Characteristics */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Характеристики
            </h3>
            <button
              type="button"
              onClick={addCharacteristic}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить характеристику
            </button>
          </div>
          <div className="space-y-4">
            {form.characteristics.map((char, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <input
                  type="text"
                  placeholder="Название характеристики"
                  value={char.key}
                  onChange={(e) =>
                    updateCharacteristic(index, "key", e.target.value)
                  }
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Значение"
                    value={char.value}
                    onChange={(e) =>
                      updateCharacteristic(index, "value", e.target.value)
                    }
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                  />
                  {form.characteristics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCharacteristic(index)}
                      className="p-2 text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <Link
            href="/admin/products"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Создание..." : "Создать продукт"}
          </button>
        </div>
      </form>
    </div>
  );
}
