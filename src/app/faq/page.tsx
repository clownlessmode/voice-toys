"use client";

import { Suspense, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Header from "@/components/widgets/Header";
import Footer from "@/components/widgets/Footer";
import H1 from "@/components/ui/typography/H1";
import H2 from "@/components/ui/typography/H2";
import Descriptor from "@/components/ui/typography/Descriptor";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className="border border-gray-200 rounded-lg overflow-hidden"
      initial={false}
      animate={{ backgroundColor: isOpen ? "#f9fafb" : "#ffffff" }}
      transition={{ duration: 0.2 }}
    >
      <button
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <H2 className="text-lg font-medium text-gray-900 pr-4">
          {item.question}
        </H2>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-gray-500" />
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-4">
          <Descriptor className="text-gray-600 whitespace-pre-line">
            {item.answer}
          </Descriptor>
        </div>
      </motion.div>
    </motion.div>
  );
}

const FAQPage = () => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const toggleAll = () => {
    if (openItems.size === faqData.length) {
      setOpenItems(new Set());
    } else {
      setOpenItems(new Set(faqData.map((_, index) => index)));
    }
  };

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

        {/* Controls */}
        <div className="flex justify-center">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {openItems.size === faqData.length ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Свернуть все
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Развернуть все
              </>
            )}
          </button>
        </div>

        {/* FAQ Items */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {faqData.map((item, index) => (
            <FAQAccordionItem
              key={index}
              item={item}
              isOpen={openItems.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </motion.div>

        {/* Contact Section */}
        <motion.div
          className="bg-blue-50 rounded-lg p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <H2 className="mb-4 text-blue-800">Не нашли ответ на свой вопрос?</H2>
          <Descriptor className="text-blue-700 mb-6">
            Свяжитесь с нами, и мы обязательно поможем!
          </Descriptor>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+7999999999"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Позвонить
            </a>
            <a
              href="mailto:info@voice-toys.ru"
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
            >
              Написать email
            </a>
          </div>
        </motion.div>
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
