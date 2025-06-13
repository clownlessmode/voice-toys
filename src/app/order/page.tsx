"use client";

import { Suspense, useState } from "react";
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

  // СДЭК состояние
  const [cities, setCities] = useState<
    Array<{ code: number; name: string; region: string; fullName: string }>
  >([]);
  const [offices, setOffices] = useState<
    Array<{ code: string; name: string; address: string; workTime: string }>
  >([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(false);
  console.log(cityLoading);
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Поиск городов СДЭК
  const handleCitySearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      cdekCity: value,
      cdekCityCode: 0,
      cdekOffice: "",
    }));

    if (value.length >= 2) {
      setCityLoading(true);
      try {
        const response = await fetch(
          `/api/delivery/cities?q=${encodeURIComponent(value)}`
        );
        if (response.ok) {
          const data = await response.json();
          setCities(data.cities || []);
        }
      } catch (error) {
        console.error("Ошибка поиска городов:", error);
      } finally {
        setCityLoading(false);
      }
    } else {
      setCities([]);
    }
  };

  // Выбор города
  const handleCitySelect = async (city: {
    code: number;
    name: string;
    region: string;
    fullName: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      cdekCity: city.fullName,
      cdekCityCode: city.code,
      cdekOffice: "",
    }));
    setCities([]);

    // Загружаем ПВЗ для выбранного города
    setOfficeLoading(true);
    try {
      const response = await fetch(
        `/api/delivery/offices?cityCode=${city.code}`
      );
      if (response.ok) {
        const data = await response.json();
        setOffices(data.offices || []);
      }
    } catch (error) {
      console.error("Ошибка загрузки ПВЗ:", error);
    } finally {
      setOfficeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Подготавливаем данные для отправки
      const orderData = {
        ...formData,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();

        // Очищаем корзину
        clearCart();

        // Перенаправляем на страницу успеха или платежки
        if (formData.paymentType === "online") {
          // TODO: Перенаправление на страницу платежки
          router.push(`/order/payment/${order.id}`);
        } else {
          // Для оплаты при получении - на страницу успеха
          router.push(`/order/success/${order.id}`);
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
                      <input
                        type="text"
                        name="cdekCity"
                        value={formData.cdekCity}
                        onChange={handleCitySearch}
                        required={formData.deliveryType === "cdek_office"}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Введите название города"
                      />

                      {cities.length > 0 && (
                        <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                          {cities.map((city) => (
                            <button
                              key={city.code}
                              type="button"
                              onClick={() => handleCitySelect(city)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                            >
                              <div className="font-medium">{city.name}</div>
                              <div className="text-sm text-gray-500">
                                {city.region}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
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
                          {offices.map((office) => (
                            <option key={office.code} value={office.code}>
                              {office.name} - {office.address}
                            </option>
                          ))}
                        </select>

                        {officeLoading && (
                          <p className="text-sm text-gray-500 mt-1">
                            Загрузка пунктов выдачи...
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
