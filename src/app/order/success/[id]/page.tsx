"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Order } from "@/components/entities/order/model/types";
import { formatPrice, formatDate } from "@/lib/order-utils";
import H1 from "@/components/ui/typography/H1";
import H2 from "@/components/ui/typography/H2";
import Descriptor from "@/components/ui/typography/Descriptor";
import Button1 from "@/components/ui/typography/Button1";
import Header from "@/components/widgets/Header";
import Footer from "@/components/widgets/Footer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function OrderSuccessPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        "px-[10px] gap-[80px]",
        "xl:px-[50px] xl:gap-[100px]",
        "2xl:px-[100px] 2xl:gap-[150px]",
        "flex flex-col items-center justify-start min-h-screen bg-body-background"
      )}
    >
      <Header />

      <motion.div
        className="flex flex-col gap-[40px] w-full max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Успех */}
        <motion.div
          className="text-center"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <H1 className="text-green-800 mb-4">Заказ успешно оформлен!</H1>
          <Descriptor className="text-lg text-gray-600">
            Спасибо за покупку! Ваш заказ принят в обработку.
          </Descriptor>
        </motion.div>

        {/* Информация о заказе */}
        <motion.div
          className="bg-white rounded-lg p-8 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Детали заказа */}
            <div>
              <H2 className="mb-6 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Детали заказа
              </H2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Номер заказа:</span>
                  <span className="font-semibold">{order.orderNumber}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Дата создания:</span>
                  <span className="font-semibold">
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Статус:</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Создан
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Способ получения:</span>
                  <span className="font-semibold">
                    {order.deliveryType === "pickup" ? "Самовывоз" : "Доставка"}
                  </span>
                </div>

                {order.deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Адрес:</span>
                    <span className="font-semibold text-right">
                      {order.deliveryAddress}
                    </span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Итого:</span>
                    <span className="font-semibold text-primary">
                      {formatPrice(order.totalAmount, order.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Товары */}
            <div>
              <H2 className="mb-6">Ваши товары</H2>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    {item.product.images && item.product.images.length > 0 && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatPrice(item.price, order.currency)} ×{" "}
                        {item.quantity} шт.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Что дальше */}
        <motion.div
          className="bg-blue-50 rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <H2 className="mb-4 text-blue-800">Что происходит дальше?</H2>
          <div className="space-y-3 text-blue-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <p>
                Мы свяжемся с вами в ближайшее время для подтверждения заказа
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <p>
                Подготовим ваш заказ к{" "}
                {order.deliveryType === "pickup" ? "выдаче" : "доставке"}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <p>Уведомим вас о готовности заказа</p>
            </div>
          </div>
        </motion.div>

        {/* Действия */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Link href="/catalogue">
            <Button1 className="flex items-center gap-2">
              Продолжить покупки
              <ArrowRight className="h-4 w-4" />
            </Button1>
          </Link>

          <Link href="/">
            <button className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              На главную
            </button>
          </Link>
        </motion.div>
      </motion.div>

      <Footer />
    </main>
  );
}
