"use client";

import Button1 from "@/components/ui/typography/Button1";
import H1 from "@/components/ui/typography/H1";
import T1 from "@/components/ui/typography/T1";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Success() {
  const params = useParams();
  const orderId = typeof params.id === "string" ? params.id : "";
  const [paymentStatus, setPaymentStatus] = useState<
    "processing" | "pending" | "success" | "error" | "cash_on_delivery"
  >("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const readPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment-status`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Не удалось получить статус заказа. Попробуйте обновить страницу.");
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (data.status === "CANCELLED") {
          setPaymentStatus("error");
          setErrorMessage("Заказ отменён. Если деньги были списаны, свяжитесь с нами.");
        } else if (["PAID", "SHIPPED", "DELIVERED"].includes(data.status)) {
          setPaymentStatus("success");
        } else if (data.status === "CREATED" && data.paymentType === "cash_on_delivery") {
          setPaymentStatus("cash_on_delivery");
        } else if (data.status === "CREATED" && data.paymentType === "online") {
          attempts += 1;
          if (attempts < 30) timer = setTimeout(readPaymentStatus, 2000);
          else setPaymentStatus("pending");
        } else {
          throw new Error("Статус заказа пока недоступен. Попробуйте обновить страницу.");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPaymentStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Не удалось проверить оплату.");
      }
    };
    void readPaymentStatus();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId]);
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
      <div
        className={cn(
          "p-[24px] rounded-[20px] gap-[96px]",
          "sm:p-[48px] sm:gap-[48px]",
          "w-full bg-cover bg-center lg:bg-right",
          "bg-background w-full flex flex-col items-center min-h-[85vh] lg:min-h-[600px] ",
          "bg-[url('/success/mobile-bg.png')]",
          "lg:bg-[url('/success/bg.png')]",
          "lg:items-start lg:justify-center"
        )}
      >
        <div
          className={cn(
            "gap-[24px] max-w-[560px] sm:max-w-[640px] md:max-w-[760px]",
            "flex flex-col items-center lg:items-start"
          )}
        >
          {paymentStatus === "processing" && (
            <>
              <H1 className="text-center lg:text-left">
                Подтверждаем оплату...
              </H1>
              <T1 className="text-center lg:text-left sm:px-[10px] max-w-[500px] sm:max-w-[605px] xl:max-w-[850px]">
                Пожалуйста, подождите. Мы проверяем статус вашего платежа.
              </T1>
            </>
          )}

          {paymentStatus === "success" && (
            <>
              <H1 className="text-center lg:text-left">
                Ура! Ваш заказ оплачен
              </H1>
              <T1 className="text-center lg:text-left sm:px-[10px] max-w-[500px] sm:max-w-[605px] xl:max-w-[850px]">
                Платёж подтверждён. Информация о получении заказа поступит после
                обработки заказа магазином.
              </T1>
            </>
          )}

          {paymentStatus === "pending" && (
            <>
              <H1 className="text-center lg:text-left">Ожидаем подтверждение оплаты</H1>
              <T1 className="text-center lg:text-left">
                Подтверждение от банка ещё не поступило. Обновите страницу позже.
                Если деньги списаны, повторно оплачивать заказ не нужно.
              </T1>
            </>
          )}

          {paymentStatus === "error" && (
            <>
              <H1 className="text-center lg:text-left">Ошибка оплаты</H1>
              <T1 className="text-center lg:text-left sm:px-[10px] max-w-[500px] sm:max-w-[605px] xl:max-w-[850px]">
                {errorMessage ||
                  "Произошла ошибка при подтверждении оплаты. Пожалуйста, свяжитесь с поддержкой."}
              </T1>
            </>
          )}

          {paymentStatus === "cash_on_delivery" && (
            <>
              <H1 className="text-center lg:text-left">
                Заказ успешно оформлен!
              </H1>
              <T1 className="text-center lg:text-left sm:px-[10px] max-w-[500px] sm:max-w-[605px] xl:max-w-[850px]">
                Ваш заказ принят в обработку. Оплата производится при получении.
                Информация о получении поступит после обработки заказа магазином.
              </T1>
            </>
          )}
        </div>
        <Link
          href={"/catalogue"}
          className="w-full flex justify-center lg:justify-start"
        >
          <Button1 className="max-w-[560px] justify-center w-full!">
            Вернуться на главную
          </Button1>
        </Link>
      </div>
      <Footer />
    </main>
  );
}
