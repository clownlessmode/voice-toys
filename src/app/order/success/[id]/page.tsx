"use client";

import Button1 from "@/components/ui/typography/Button1";
import H1 from "@/components/ui/typography/H1";
import T1 from "@/components/ui/typography/T1";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Success() {
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
          <H1 className="text-center lg:text-left">Ура! Ваш заказ оформлен</H1>
          <T1 className="text-center  lg:text-left sm:px-[10px] max-w-[500px] sm:max-w-[605px] xl:max-w-[850px]">
            Мы уже начали собирать игрушки.Скоро вы получите SMS с информацией о
            доставке.
          </T1>
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
