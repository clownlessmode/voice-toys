"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { getProductById } from "@/components/entities/product";
import FileUpload, {
  UploadedFile,
} from "@/components/ui/components/file-upload";
import { ImageGallery } from "@/components/ui/components/image-gallery";

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
  categories: string[];
  ageGroups: string[];
}

export default function EditProduct() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    categories: [],
    ageGroups: [],
  });

  useEffect(() => {
    async function loadProduct() {
      try {
        const product = await getProductById(params.id);
        setForm({
          name: product.name,
          breadcrumbs: product.breadcrumbs,
          images: product.images,
          price: product.price.current,
          oldPrice: product.price.old || null,
          discountPercent: product.price.discountPercent || null,
          currency: product.price.currency,
          pickupAvailability: product.availability.pickup,
          deliveryAvailability: product.availability.delivery,
          returnDays: product.returnPolicy.days,
          returnDetails: product.returnPolicy.details,
          description: product.description,
          characteristics: product.characteristics,
          categories: product.categories || [],
          ageGroups: product.ageGroups || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setInitialLoading(false);
      }
    }

    loadProduct();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация возрастных групп
    if (form.ageGroups.length === 0) {
      alert("Выберите хотя бы одну возрастную группу");
      return;
    }

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

      const response = await fetch(`/api/products/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedForm),
      });

      if (response.ok) {
        router.push("/admin/products");
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || "Не удалось обновить продукт"}`);
      }
    } catch (error) {
      console.error("Ошибка при обновлении продукта:", error);
      alert("Ошибка при обновлении продукта");
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

  if (initialLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Ошибка: {error}</div>
        <Link
          href="/admin/products"
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
        >
          Вернуться к списку
        </Link>
      </div>
    );
  }

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Редактировать продукт
            </h1>
            <p className="text-sm text-gray-600">ID: {params.id}</p>
          </div>
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

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Категории
              </label>
              <div className="space-y-2">
                {[
                  "Интерактивные игрушки",
                  "Развивающие игрушки",
                  "Игрушки антистресс",
                  "Игрушечный транспорт",
                  "Радиоуправляемые игрушки",
                  "Обучающие игрушки",
                  "Настольные игры",
                ].map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.categories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            categories: [...form.categories, category],
                            breadcrumbs: [
                              form.breadcrumbs[0],
                              form.breadcrumbs[1],
                              form.categories.length === 0
                                ? category
                                : form.breadcrumbs[2],
                              form.breadcrumbs[3],
                            ],
                          });
                        } else {
                          const newCategories = form.categories.filter(
                            (c) => c !== category
                          );
                          setForm({
                            ...form,
                            categories: newCategories,
                            breadcrumbs: [
                              form.breadcrumbs[0],
                              form.breadcrumbs[1],
                              newCategories.length > 0
                                ? newCategories[0]
                                : "Интерактивные игрушки",
                              form.breadcrumbs[3],
                            ],
                          });
                        }
                      }}
                      className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Age Groups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Возрастные группы *
              </label>
              <div className="space-y-2">
                {[
                  { label: "6 м. – 2 года", value: "6м-2года" },
                  { label: "3 – 4 года", value: "3-4года" },
                  { label: "5 – 7 лет", value: "5-7лет" },
                  { label: "8 – 10 лет", value: "8-10лет" },
                ].map((ageGroup) => (
                  <label key={ageGroup.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.ageGroups.includes(ageGroup.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            ageGroups: [...form.ageGroups, ageGroup.value],
                          });
                        } else {
                          setForm({
                            ...form,
                            ageGroups: form.ageGroups.filter(
                              (ag) => ag !== ageGroup.value
                            ),
                          });
                        }
                      }}
                      className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {ageGroup.label}
                    </span>
                  </label>
                ))}
              </div>
              {form.ageGroups.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  Выберите хотя бы одну возрастную группу
                </p>
              )}
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
              quality={100}
            />

            {uploadError && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                {uploadError}
              </div>
            )}
          </div>

          {/* Галерея изображений */}
          <div>
            <ImageGallery
              images={[
                // Загруженные файлы
                ...uploadedFiles.map((file) => ({
                  url: file.url,
                  isUploaded: true,
                  originalName: file.originalName,
                })),
                // Ручные URL
                ...form.images.map((url) => ({
                  url,
                  isUploaded: false,
                })),
              ]}
              onAdd={addImage}
              onRemove={(index) => {
                if (index < uploadedFiles.length) {
                  // Удаляем загруженный файл
                  setUploadedFiles((prev) =>
                    prev.filter((_, i) => i !== index)
                  );
                } else {
                  // Удаляем ручной URL
                  const urlIndex = index - uploadedFiles.length;
                  removeImage(urlIndex);
                }
              }}
              onUpdate={(index, url) => {
                if (index >= uploadedFiles.length) {
                  // Обновляем ручной URL
                  const urlIndex = index - uploadedFiles.length;
                  updateImage(urlIndex, url);
                }
              }}
              title="Все изображения товара"
              allowManualUrls={true}
            />
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
            {loading ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </form>
    </div>
  );
}
