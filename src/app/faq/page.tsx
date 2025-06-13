"use client";

import { Suspense } from "react";

import Header from "@/components/widgets/Header";
import Footer from "@/components/widgets/Footer";
import H1 from "@/components/ui/typography/H1";
import Descriptor from "@/components/ui/typography/Descriptor";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionTrigger,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "Как оформить заказ?",
    answer:
      "Выбрать товар → добавить в корзину → ввести адрес → выбрать доставку и оплату → оплатить → получить подтверждение и ждать доставку.",
  },
  {
    question: "Можно ли вернуть или обменять товар?",
    answer:
      "Да. Заказ можно вернуть в течение 14 дней, при условии сохранения упаковки, чека, товарного вида и полного комплекта.",
  },
  {
    question: "Что является причиной возврата?",
    answer:
      "Товар не подошёл по форме, габаритам, фасону, расцветке, размеру или комплектации. При этом игрушка не должна быть в употреблении, должны быть сохранены её товарный вид, потребительские свойства, пломбы и фабричные ярлыки.\n\nЕсли игрушка была испорчена после приобретения, вернуть её нельзя. Брак товара.",
  },
  {
    question: "Есть ли гарантия на игрушки?",
    answer: "Да, гарантия составляет 1 год с момента приобретения игрушки.",
  },
  {
    question: "Какие способы оплаты доступны?",
    answer:
      "Мы принимаем оплату картой онлайн и оплату при получении (наличными или картой курьеру).",
  },
  {
    question: "Как долго доставляется заказ?",
    answer:
      "Доставка по Москве осуществляется в течение 1-2 дней. В другие регионы России - 3-7 дней в зависимости от удаленности.",
  },
  {
    question: "Можно ли забрать заказ самовывозом?",
    answer:
      "Да, самовывоз доступен из нашего пункта выдачи. После оформления заказа мы свяжемся с вами для уточнения времени получения.",
  },
  {
    question: "Что делать, если товар пришёл поврежденным?",
    answer:
      "Если товар получен в поврежденном виде, незамедлительно свяжитесь с нами. Мы заменим товар или вернём деньги.",
  },
];

const FAQPage = () => {
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
        className="flex flex-col gap-[40px] w-full max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center">
          <H1 className="mb-4">Ответы на вопросы</H1>
          <Descriptor className="text-lg text-gray-600 max-w-2xl mx-auto">
            Здесь собраны ответы на наиболее частые вопросы о заказе, доставке,
            возврате товаров и гарантии
          </Descriptor>
        </div>
        {/* FAQ Items */}
        <Accordion type="single" collapsible className="gap-4 flex flex-col">
          {faqData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <AccordionItem
                value={item.answer}
                className="bg-white rounded-2xl px-4"
              >
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </motion.div>

      <Footer />
    </main>
  );
};

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FAQPage />
    </Suspense>
  );
};

export default Page;
