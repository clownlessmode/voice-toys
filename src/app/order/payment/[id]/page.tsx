"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreditCard, Shield, Lock, CheckCircle, XCircle } from "lucide-react";
import { Order } from "@/components/entities/order/model/types";
import { formatPrice } from "@/lib/order-utils";
import H1 from "@/components/ui/typography/H1";
import H2 from "@/components/ui/typography/H2";
import Descriptor from "@/components/ui/typography/Descriptor";
import Button1 from "@/components/ui/typography/Button1";
import Header from "@/components/widgets/Header";
import Footer from "@/components/widgets/Footer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function PaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [error, setError] = useState<string | null>(null);

  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });

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

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "number") {
      // Форматируем номер карты (xxxx xxxx xxxx xxxx)
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim();
      if (formattedValue.length > 19)
        formattedValue = formattedValue.slice(0, 19);
    } else if (name === "expiry") {
      // Форматируем срок (xx/xx)
      formattedValue = value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2");
      if (formattedValue.length > 5)
        formattedValue = formattedValue.slice(0, 5);
    } else if (name === "cvv") {
      // Только цифры, максимум 3
      formattedValue = value.replace(/\D/g, "").slice(0, 3);
    }

    setCardData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const simulatePayment = async () => {
    setPaymentLoading(true);

    // Имитируем процесс оплаты
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 90% успешных платежей
    const success = Math.random() > 0.1;

    if (success) {
      setPaymentStatus("success");

      // Обновляем статус заказа на "оплачен"
      try {
        await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "PAID" }),
        });
      } catch (error) {
        console.error("Error updating order status:", error);
      }

      // Перенаправляем на страницу успеха через 2 секунды
      setTimeout(() => {
        router.push(`/order/success/${id}`);
      }, 2000);
    } else {
      setPaymentStatus("error");
    }

    setPaymentLoading(false);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Простая валидация
    if (
      !cardData.number ||
      !cardData.expiry ||
      !cardData.cvv ||
      !cardData.name
    ) {
      alert("Заполните все поля");
      return;
    }

    await simulatePayment();
  };

  if (loading) {
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
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка информации о заказе...</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (error || !order) {
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
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800">{error}</p>
            <Button1 className="mt-4" onClick={() => router.push("/")}>
              На главную
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

      {/* Тестовый режим баннер */}
      <div className="w-full bg-orange-100 border-l-4 border-orange-500 p-4">
        <div className="max-w-4xl mx-auto flex items-center">
          <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold mr-3">
            ТЕСТОВЫЙ РЕЖИМ
          </div>
          <p className="text-orange-700">
            Это демонстрационная страница оплаты. Реальные деньги не
            списываются.
          </p>
        </div>
      </div>

      <motion.div
        className="flex flex-col gap-[40px] w-full max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <H1 className="mb-4">Оплата заказа</H1>
          <Descriptor className="text-lg text-gray-600">
            Заказ #{order.orderNumber} на сумму{" "}
            {formatPrice(order.totalAmount, order.currency)}
          </Descriptor>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Форма оплаты */}
          <motion.div
            className="bg-white rounded-lg p-6 shadow-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <H2>Данные карты</H2>
            </div>

            {paymentStatus === "pending" && (
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Номер карты *
                  </label>
                  <input
                    type="text"
                    name="number"
                    value={cardData.number}
                    onChange={handleCardInputChange}
                    placeholder="1234 5678 9012 3456"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Срок действия *
                    </label>
                    <input
                      type="text"
                      name="expiry"
                      value={cardData.expiry}
                      onChange={handleCardInputChange}
                      placeholder="12/25"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV *
                    </label>
                    <input
                      type="text"
                      name="cvv"
                      value={cardData.cvv}
                      onChange={handleCardInputChange}
                      placeholder="123"
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя владельца карты *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={cardData.name}
                    onChange={handleCardInputChange}
                    placeholder="IVAN PETROV"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
                  <Shield className="h-4 w-4" />
                  <span>Ваши данные защищены SSL-шифрованием</span>
                </div>

                <Button1
                  type="submit"
                  disabled={paymentLoading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Обработка платежа...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Оплатить {formatPrice(order.totalAmount, order.currency)}
                    </>
                  )}
                </Button1>
              </form>
            )}

            {paymentStatus === "success" && (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <H2 className="text-green-800 mb-2">Оплата прошла успешно!</H2>
                <Descriptor className="text-green-700">
                  Переадресация на страницу подтверждения...
                </Descriptor>
              </div>
            )}

            {paymentStatus === "error" && (
              <div className="text-center py-8">
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <H2 className="text-red-800 mb-2">Ошибка оплаты</H2>
                <Descriptor className="text-red-700 mb-4">
                  Платеж не был проведен. Попробуйте еще раз.
                </Descriptor>
                <Button1
                  onClick={() => setPaymentStatus("pending")}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Попробовать снова
                </Button1>
              </div>
            )}
          </motion.div>

          {/* Информация о заказе */}
          <motion.div
            className="bg-white rounded-lg p-6 shadow-sm h-fit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <H2 className="mb-6">Детали заказа</H2>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Номер заказа:</span>
                <span className="font-medium">{order.orderNumber}</span>
              </div>

              <div className="border-b pb-4">
                <span className="text-sm font-medium text-gray-700 block mb-2">
                  Товары:
                </span>
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span>
                      {formatPrice(item.price * item.quantity, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-lg font-semibold">
                <span>К оплате:</span>
                <span className="text-blue-600">
                  {formatPrice(order.totalAmount, order.currency)}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <div className="font-medium mb-1">Безопасная оплата</div>
                  <div>
                    Данные карты передаются в зашифрованном виде и не
                    сохраняются на наших серверах
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <Footer />
    </main>
  );
}
