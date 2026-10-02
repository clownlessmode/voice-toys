"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/cart/use-cart";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import H1 from "@/components/ui/typography/H1";
import H2 from "@/components/ui/typography/H2";
import Descriptor from "@/components/ui/typography/Descriptor";
import Button1 from "@/components/ui/typography/Button1";
import Header from "@/components/widgets/Header";
import Footer from "@/components/widgets/Footer";
import PromoCodeInput from "@/components/ui/components/PromoCodeInput";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  isOzonDeliveryProductEligible,
  OZON_DELIVERY_MIN_PRODUCT_PRICE_RUB,
} from "@/lib/ozon-delivery/rules";

type OzonPoint = {
  id: number;
  name: string;
  address: string;
  type: string;
  shipmentMethodIds: number[];
};

type OzonQuote = {
  deliveryCost: number;
  estimatedDeliveryDays: number | null;
  cutoffAt: string | null;
};

const OrderPage = () => {
  const { items, totalPrice, clearCart } = useCart();
  const router = useRouter();

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deliveryType: "pickup" as "pickup" | "ozon_pvz",
    deliveryAddress: "",
    ozonDeliveryPointId: 0,
    ozonShipmentMethodId: 0,
    paymentType: "online" as "online" | "cash_on_delivery",
  });

  // Состояние для промокода
  const [promoCodeData, setPromoCodeData] = useState({
    promoCodeId: null as string | null,
    discountAmount: 0,
    originalAmount: totalPrice,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ozonPoints, setOzonPoints] = useState<OzonPoint[]>([]);
  const [ozonNextCursor, setOzonNextCursor] = useState<string | null>(null);
  const [ozonPointsLoading, setOzonPointsLoading] = useState(false);
  const [ozonPointsError, setOzonPointsError] = useState("");
  const [ozonQuote, setOzonQuote] = useState<OzonQuote | null>(null);
  const [ozonQuoteLoading, setOzonQuoteLoading] = useState(false);
  const ozonIneligibleItems = items.filter(
    (item) => !isOzonDeliveryProductEligible(item.product.price.current),
  );
  const canUseOzonDelivery = ozonIneligibleItems.length === 0;

  useEffect(() => {
    if (!canUseOzonDelivery && formData.deliveryType === "ozon_pvz") {
      setFormData((current) => ({
        ...current,
        deliveryType: "pickup",
        ozonDeliveryPointId: 0,
        ozonShipmentMethodId: 0,
      }));
      setOzonQuote(null);
    }
  }, [canUseOzonDelivery, formData.deliveryType]);

  // Обновляем originalAmount при изменении totalPrice
  useEffect(() => {
    setPromoCodeData((prev) => ({
      ...prev,
      originalAmount: totalPrice,
    }));
  }, [totalPrice]);

  // Функция применения промокода
  const handlePromoCodeApply = (
    discountAmount: number,
    promoCodeId: string
  ) => {
    setPromoCodeData({
      promoCodeId,
      discountAmount,
      originalAmount: totalPrice,
    });
  };

  // Функция удаления промокода
  const handlePromoCodeRemove = () => {
    setPromoCodeData({
      promoCodeId: null,
      discountAmount: 0,
      originalAmount: totalPrice,
    });
  };

  // Рассчитываем итоговую сумму с учетом скидки
  const deliveryPrice = formData.deliveryType === "ozon_pvz" ? (ozonQuote?.deliveryCost ?? 0) : 0;
  const finalPrice = Math.max(0, totalPrice - promoCodeData.discountAmount + deliveryPrice);

  const loadOzonPoints = useCallback(async (cursor?: string | null) => {
    setOzonPointsLoading(true);
    setOzonPointsError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/ozon-delivery/points?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить ПВЗ Ozon");
      const nextPoints = Array.isArray(data.points) ? data.points : [];
      setOzonPoints((current) => cursor ? [...current, ...nextPoints] : nextPoints);
      setOzonNextCursor(typeof data.nextCursor === "string" ? data.nextCursor : null);
      if (!nextPoints.length && !cursor) {
        setOzonPointsError("Ozon пока не вернул доступные пункты выдачи для этого кабинета");
      }
    } catch (cause) {
      setOzonPointsError(cause instanceof Error ? cause.message : "Не удалось загрузить ПВЗ Ozon");
    } finally {
      setOzonPointsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (formData.deliveryType === "ozon_pvz" && !ozonPoints.length && !ozonPointsLoading && !ozonPointsError) {
      void loadOzonPoints();
    }
  }, [formData.deliveryType, loadOzonPoints, ozonPoints.length, ozonPointsError, ozonPointsLoading]);

  useEffect(() => {
    setOzonQuote(null);
    if (formData.deliveryType !== "ozon_pvz" || !formData.ozonDeliveryPointId ||
        !formData.ozonShipmentMethodId || formData.customerPhone.replace(/\D/g, "").length !== 11) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setOzonQuoteLoading(true);
      try {
        const response = await fetch("/api/ozon-delivery/quote", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({
            phone: formData.customerPhone,
            deliveryPointId: formData.ozonDeliveryPointId,
            shipmentMethodId: formData.ozonShipmentMethodId,
            items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Ozon не смог рассчитать доставку");
        setOzonQuote(data);
        setOzonPointsError("");
      } catch (cause) {
        if (!controller.signal.aborted) {
          setOzonQuote(null);
          setOzonPointsError(cause instanceof Error ? cause.message : "Ozon не смог рассчитать доставку");
        }
      } finally {
        if (!controller.signal.aborted) setOzonQuoteLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [formData.deliveryType, formData.customerPhone, formData.ozonDeliveryPointId,
    formData.ozonShipmentMethodId, items]);

  // Функция форматирования телефонного номера
  const formatPhoneNumber = (value: string): string => {
    // Все цифры
    const numbers = value.replace(/\D/g, "");

    // Если поле было пустым и набрали ровно "8" или "7" — показать только префикс
    if ((numbers === "8" || numbers === "7") && !value.includes("+")) {
      return "+7 (";
    }

    // Работаем только с национальной частью (10 цифр), код страны не храним
    let local = numbers;
    if (local.startsWith("8") || local.startsWith("7")) {
      local = local.slice(1);
    }
    local = local.slice(0, 10);

    // Если стирают и остался только префикс "+7" — позволяем очистить поле
    if (local.length === 0) {
      if (/^\+7\s*KATEX_INLINE_OPEN?\s*$/.test(value)) return "";
      // Если вообще ничего не введено
      if (numbers.length === 0) return "";
    }

    const p1 = local.slice(0, 3);
    const p2 = local.slice(3, 6);
    const p3 = local.slice(6, 8);
    const p4 = local.slice(8, 10);

    if (local.length <= 3) return `+7 (${p1}`;
    if (local.length <= 6) return `+7 (${p1}) ${p2}`;
    if (local.length <= 8) return `+7 (${p1}) ${p2}-${p3}`;
    return `+7 (${p1}) ${p2}-${p3}-${p4}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "customerPhone") {
      const formattedPhone = formatPhoneNumber(value);
      setFormData((prev) => ({ ...prev, [name]: formattedPhone }));
      return;
    }

    if (name === "deliveryType") {
      const nextDelivery = value as "pickup" | "ozon_pvz";
      setFormData((prev) => ({
        ...prev,
        deliveryType: nextDelivery,
        // Для доставки Ozon доступна только онлайн-оплата.
        paymentType: nextDelivery === "pickup" ? prev.paymentType : "online",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (
      formData.deliveryType !== "pickup" &&
      formData.paymentType === "cash_on_delivery"
    ) {
      setError("Оплата при получении доступна только при самовывозе");
      setLoading(false);
      return;
    }
    if (formData.deliveryType === "ozon_pvz" && !ozonQuote) {
      setError("Выберите доступный ПВЗ и дождитесь расчёта Ozon");
      setLoading(false);
      return;
    }
    console.log("🚀 Form submitted with data:", formData);

    try {
      // Подготавливаем данные для отправки
      let orderData = {
        ...formData,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        // Добавляем данные промокода
        originalAmount: promoCodeData.originalAmount,
        discountAmount: promoCodeData.discountAmount,
        promoCodeId: promoCodeData.promoCodeId,
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
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                    Имя *
                  </label>
                  <input
                    id="customerName"
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
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон *
                  </label>
                  <input
                    id="customerPhone"
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
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="customerEmail"
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
                  <label htmlFor="deliveryType" className="block text-sm font-medium text-gray-700 mb-2">
                    Тип доставки
                  </label>
                  <select
                    id="deliveryType"
                    name="deliveryType"
                    value={formData.deliveryType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="pickup">Самовывоз</option>
                    <option value="ozon_pvz" disabled={!canUseOzonDelivery}>
                      Пункт выдачи Ozon
                    </option>
                  </select>
                  {!canUseOzonDelivery && (
                    <p className="text-sm text-amber-700 mt-2">
                      Ozon Доставка недоступна: товары дешевле {OZON_DELIVERY_MIN_PRODUCT_PRICE_RUB} ₽
                      можно заказать только самовывозом.
                    </p>
                  )}
                </div>

                {formData.deliveryType === "ozon_pvz" && (
                  <div className="space-y-3">
                    <label htmlFor="ozonDeliveryPointId" className="block text-sm font-medium text-gray-700">
                      Пункт выдачи Ozon *
                    </label>
                    <select
                      id="ozonDeliveryPointId"
                      value={formData.ozonDeliveryPointId || ""}
                      onChange={(event) => {
                        const point = ozonPoints.find((candidate) => candidate.id === Number(event.target.value));
                        setFormData((current) => ({
                          ...current,
                          ozonDeliveryPointId: point?.id ?? 0,
                          ozonShipmentMethodId: point?.shipmentMethodIds[0] ?? 0,
                        }));
                      }}
                      required
                      disabled={ozonPointsLoading || !ozonPoints.length}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Выберите ПВЗ Ozon</option>
                      {ozonPoints.map((point) => (
                        <option key={point.id} value={point.id}>{point.name} — {point.address}</option>
                      ))}
                    </select>
                    {ozonPointsLoading && <p className="text-sm text-gray-500">Загрузка пунктов Ozon…</p>}
                    {ozonNextCursor && (
                      <button type="button" disabled={ozonPointsLoading}
                        onClick={() => void loadOzonPoints(ozonNextCursor)}
                        className="text-sm underline text-gray-700">
                        Загрузить ещё пункты
                      </button>
                    )}
                    {ozonQuoteLoading && <p className="text-sm text-gray-500">Расчёт доставки Ozon…</p>}
                    {ozonQuote && (
                      <p className="text-sm text-green-700">
                        Доставка: {ozonQuote.deliveryCost} ₽
                        {ozonQuote.estimatedDeliveryDays ? `, примерно ${ozonQuote.estimatedDeliveryDays} дн.` : ""}
                      </p>
                    )}
                    {ozonPointsError && <p className="text-sm text-red-500">{ozonPointsError}</p>}
                  </div>
                )}
              </div>

              {/* Промокод */}
              <div className="space-y-4">
                <H2 className="text-lg">Промокод</H2>
                <PromoCodeInput
                  onApply={handlePromoCodeApply}
                  onRemove={handlePromoCodeRemove}
                  orderAmount={totalPrice}
                  className="w-full"
                />
              </div>

              {/* Способ оплаты */}
              <div className="space-y-4">
                <H2 className="text-lg">Способ оплаты</H2>

                <div>
                  <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 mb-2">
                    Тип оплаты
                  </label>
                  <select
                    id="paymentType"
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {formData.deliveryType === "pickup" ? (
                      <>
                        <option value="cash_on_delivery">
                          Оплата при получении
                        </option>
                        <option value="online">Онлайн оплата</option>
                      </>
                    ) : (
                      <option value="online">Онлайн оплата</option>
                    )}
                  </select>

                  {formData.deliveryType !== "pickup" && (
                    <p className="text-sm text-gray-500 mt-1">
                      Для доставки доступна только онлайн‑оплата
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button1
                type="submit"
                disabled={loading || (formData.deliveryType === "ozon_pvz" && !ozonQuote)}
                className="w-full"
              >
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
                    {!isOzonDeliveryProductEligible(item.product.price.current) && (
                      <div className="text-sm text-amber-700">Только самовывоз</div>
                    )}
                  </div>
                  <div className="font-medium">
                    {item.product.price.current * item.quantity} ₽
                  </div>
                </div>
              ))}
            </div>

            {/* Показываем скидку если применен промокод */}
            {promoCodeData.discountAmount > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Скидка по промокоду:</span>
                  <span className="text-green-600">
                    -{promoCodeData.discountAmount} ₽
                  </span>
                </div>
              </div>
            )}

            {deliveryPrice > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Доставка Ozon:</span>
                  <span>{deliveryPrice} ₽</span>
                </div>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Итого:</span>
                <span>{finalPrice} ₽</span>
              </div>

              {/* Показываем экономию */}
              {promoCodeData.discountAmount > 0 && (
                <div className="text-sm text-green-600 mt-1">
                  Экономия: {promoCodeData.discountAmount} ₽
                </div>
              )}
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
