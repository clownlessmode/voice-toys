"use client";

import Button1 from "@/components/ui/typography/Button1";
import H1 from "@/components/ui/typography/H1";
import T1 from "@/components/ui/typography/T1";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Success() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<
    "processing" | "success" | "error" | "cash_on_delivery"
  >("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processPayment = async () => {
      const orderId = params.id as string;
      const transactionId = searchParams.get("transaction_id");

      console.log("🎯 Processing payment success:", { orderId, transactionId });

      // Если нет transaction_id, это заказ с оплатой при получении
      if (!transactionId) {
        console.log("💰 Cash on delivery order - no payment processing needed");
        setPaymentStatus("cash_on_delivery");
        return;
      }

      try {
        // Отправляем запрос для подтверждения оплаты
        const response = await fetch(`/api/orders/${orderId}/pay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_id: transactionId,
            state: "COMPLETE",
            source: "success_page",
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log("✅ Payment confirmed successfully");
          setPaymentStatus("success");
        } else {
          console.error("❌ Payment confirmation failed:", data);
          setPaymentStatus("error");
          setErrorMessage(data.error || "Ошибка подтверждения оплаты");
        }
      } catch (error) {
        console.error("❌ Error confirming payment:", error);
        setPaymentStatus("error");
        setErrorMessage("Ошибка сети при подтверждении оплаты");
      }
    };

    processPayment();
  }, [params.id, searchParams]);
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
                Платеж успешно обработан. Мы уже начали собирать игрушки. Скоро
                вы получите SMS с информацией о доставке.
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
                Мы уже начали собирать игрушки. Скоро вы получите SMS с
                информацией о доставке.
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
