"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/cart/use-cart";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import H1 from "@/components/ui/typography/H1";
import H2 from "@/components/ui/typography/H2";
import Descriptor from "@/components/ui/typography/Descriptor";
import Button1 from "@/components/ui/typography/Button1";
import Header from "@/components/widgets/Header";
import Footer from "@/components/widgets/Footer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { cities } from "./cities";
import { useCdekOffices } from "./use-cdek-offices";

const OrderPage = () => {
  const { items, totalPrice, clearCart } = useCart();
  const router = useRouter();

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deliveryType: "pickup" as "pickup" | "cdek_office",
    deliveryAddress: "",
    cdekCity: "",
    cdekCityCode: 0,
    cdekOffice: "",
    paymentType: "cash_on_delivery" as "online" | "cash_on_delivery",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Используем готовые функции для CDEK
  const {
    data: cdekOffices,
    loading: cdekLoading,
    error: cdekError,
  } = useCdekOffices(
    formData.deliveryType === "cdek_office" ? formData.cdekCity : undefined
  );

  // Геолокация и автозаполнение ближайшего города
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;

        // Функция для расчёта расстояния между двумя точками (Хаверсин)
        function getDistance(
          lat1: number,
          lon1: number,
          lat2: number,
          lon2: number
        ) {
          const toRad = (v: number) => (v * Math.PI) / 180;
          const R = 6371; // км
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) *
              Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        }

        // Если у нас есть города с координатами, находим ближайший
        if (cities.length > 0) {
          let minDist = Infinity;
          let nearestCity = null;

          for (const city of cities) {
            if (city.latitude && city.longitude) {
              const dist = getDistance(
                latitude,
                longitude,
                city.latitude,
                city.longitude
              );
              if (dist < minDist) {
                minDist = dist;
                nearestCity = city;
              }
            }
          }

          if (nearestCity) {
            setFormData((prev) => ({
              ...prev,
              cdekCity: nearestCity.city,
              cdekCityCode: nearestCity.code,
            }));
          }
        }
      });
    }
  }, [cities]);

  // Функция форматирования телефонного номера
  const formatPhoneNumber = (value: string): string => {
    // Убираем все символы кроме цифр
    const numbers = value.replace(/\D/g, "");

    // Если номер начинается с 8, заменяем на 7
    let formattedNumber = numbers;
    if (numbers.startsWith("8") && numbers.length > 0) {
      formattedNumber = "7" + numbers.slice(1);
    }

    // Если номер начинается с 7 или 9, добавляем +7
    if (formattedNumber.startsWith("7") || formattedNumber.startsWith("9")) {
      formattedNumber =
        "7" + formattedNumber.slice(formattedNumber.startsWith("7") ? 1 : 0);
    }

    // Форматируем номер в виде +7 (XXX) XXX-XX-XX
    if (formattedNumber.length === 0) return "";
    if (formattedNumber.length <= 1) return `+7 (${formattedNumber}`;
    if (formattedNumber.length <= 4)
      return `+7 (${formattedNumber.slice(0, 3)}`;
    if (formattedNumber.length <= 7)
      return `+7 (${formattedNumber.slice(0, 3)}) ${formattedNumber.slice(3)}`;
    if (formattedNumber.length <= 9)
      return `+7 (${formattedNumber.slice(0, 3)}) ${formattedNumber.slice(
        3,
        6
      )}-${formattedNumber.slice(6)}`;
    return `+7 (${formattedNumber.slice(0, 3)}) ${formattedNumber.slice(
      3,
      6
    )}-${formattedNumber.slice(6, 8)}-${formattedNumber.slice(8, 10)}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Специальная обработка для телефона
    if (name === "customerPhone") {
      const formattedPhone = formatPhoneNumber(value);
      setFormData((prev) => ({ ...prev, [name]: formattedPhone }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Выбор города
  const handleCitySelect = (city: {
    code: number;
    city: string;
    region?: string;
    latitude: number;
    longitude: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      cdekCity: city.city,
      cdekCityCode: city.code,
      cdekOffice: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("🚀 Form submitted with data:", formData);

    try {
      // Подготавливаем данные для отправки
      let orderData = {
        ...formData,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      // Если выбран CDEK, формируем адрес доставки автоматически
      if (
        formData.deliveryType === "cdek_office" &&
        formData.cdekCity &&
        formData.cdekOffice
      ) {
        // Находим название ПВЗ по коду
        const selectedOffice = cdekOffices?.find(
          (office) => office.code === formData.cdekOffice
        );
        if (selectedOffice) {
          orderData = {
            ...orderData,
            deliveryAddress: `CDEK ${formData.cdekCity} ${selectedOffice.location.address}`,
          };
        }
      }

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();

        // Перенаправляем на страницу успеха или сразу на Модульбанк
        console.log("🎯 Payment type:", formData.paymentType);
        console.log("🎯 Order created:", order);

        if (formData.paymentType === "online") {
          // Прямое перенаправление на Модульбанк
          console.log("💳 Redirecting to Modulbank payment");
          clearCart(); // Очищаем корзину только для онлайн оплаты
          window.location.href = `/api/orders/${order.id}/pay/modulbank`;
        } else {
          // Для оплаты при получении - на страницу успеха
          console.log("💰 Redirecting to success page for cash on delivery");
          clearCart(); // Очищаем корзину перед перенаправлением
          window.location.href = `/order/success/${order.id}`;
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Ошибка при создании заказа");
      }
    } catch {
      setError("Ошибка при создании заказа");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main
        className={cn(
          "px-[10px] gap-[80px]",
          "xl:px-[50px] xl:gap-[100px]",
          "2xl:px-[100px] 2xl:gap-[150px]",
          "flex flex-col items-center justify-start min-h-screen bg-body-background"
        )}
      >
        <Header />
        <div className="flex flex-col gap-[24px] w-full items-center">
          <div className="text-center py-12">
            <H1>Корзина пуста</H1>
            <Descriptor className="mt-4">
              Добавьте товары в корзину перед оформлением заказа
            </Descriptor>
            <Button1 className="mt-6" onClick={() => router.push("/catalogue")}>
              Перейти в каталог
            </Button1>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main
      className={cn(
        "px-[10px] gap-[40px]",
        "xl:px-[50px] xl:gap-[50px]",
        "2xl:px-[100px] 2xl:gap-[60px]",
        "flex flex-col items-center justify-start min-h-screen bg-body-background"
      )}
    >
      <Header />

      <motion.div
        className="flex flex-col gap-[24px] w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col gap-[16px] w-full">
          <Breadcrumbs
            items={[
              { title: "Главная", link: "/" },
              { title: "Корзина", link: "/cart" },
              { title: "Оформление заказа", link: "/order" },
            ]}
          />
          <H1>Оформление заказа</H1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Форма заказа */}
          <div className="bg-white rounded-lg p-6">
            <H2 className="mb-6">Данные для заказа</H2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Контактные данные */}
              <div className="space-y-4">
                <H2 className="text-lg">Контактные данные</H2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Введите ваше имя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+7 (999) 000-00-00"
                    maxLength={18}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              {/* Способ получения */}
              <div className="space-y-4">
                <H2 className="text-lg">Способ получения</H2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип доставки
                  </label>
                  <select
                    name="deliveryType"
                    value={formData.deliveryType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="pickup">Самовывоз</option>
                    <option value="cdek_office">Пункт выдачи СДЭК</option>
                  </select>
                </div>

                {formData.deliveryType === "cdek_office" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Город *
                      </label>
                      <select
                        name="cdekCity"
                        value={formData.cdekCity}
                        onChange={(e) => {
                          const selectedCity = cities.find(
                            (city) => city.city === e.target.value
                          );
                          if (selectedCity) {
                            handleCitySelect(selectedCity);
                          }
                        }}
                        required={formData.deliveryType === "cdek_office"}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Выберите город</option>
                        {cities.map((city) => (
                          <option key={city.code} value={city.city}>
                            {city.city} ({city.region})
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.cdekCityCode > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Пункт выдачи *
                        </label>
                        <select
                          name="cdekOffice"
                          value={formData.cdekOffice}
                          onChange={handleInputChange}
                          required={formData.deliveryType === "cdek_office"}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Выберите пункт выдачи</option>
                          {cdekOffices?.map((office) => (
                            <option key={office.code} value={office.code}>
                              {office.location.address}
                            </option>
                          ))}
                        </select>

                        {cdekLoading && (
                          <p className="text-sm text-gray-500 mt-1">
                            Загрузка пунктов выдачи...
                          </p>
                        )}

                        {cdekError && (
                          <p className="text-sm text-red-500 mt-1">
                            {cdekError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Способ оплаты */}
              <div className="space-y-4">
                <H2 className="text-lg">Способ оплаты</H2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип оплаты
                  </label>
                  <select
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="cash_on_delivery">
                      Оплата при получении
                    </option>
                    <option value="online">Онлайн оплата</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button1 type="submit" disabled={loading} className="w-full">
                {loading ? "Оформление..." : "Оформить заказ"}
              </Button1>
            </form>
          </div>

          {/* Сводка заказа */}
          <div className="bg-white rounded-lg p-6 h-fit">
            <H2 className="mb-6">Ваш заказ</H2>

            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.product.price.current} ₽ × {item.quantity} шт.
                    </div>
                  </div>
                  <div className="font-medium">
                    {item.product.price.current * item.quantity} ₽
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Итого:</span>
                <span>{totalPrice} ₽</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Footer />
    </main>
  );
};

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderPage />
    </Suspense>
  );
};

export default Page;
