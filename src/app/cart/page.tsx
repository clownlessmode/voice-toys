"use client";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import Descriptor from "@/components/ui/typography/Descriptor";
import H1 from "@/components/ui/typography/H1";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { Suspense, useState, useEffect } from "react";
import { CartItem } from "./cart-item";
import { useCart } from "./use-cart";
import H2 from "@/components/ui/typography/H2";
import Button1 from "@/components/ui/typography/Button1";
import { motion } from "framer-motion";
import ProductSlider from "@/components/ui/components/product-slider";
import { notFound } from "next/navigation";

// Варианты анимаций
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const CartContent = () => {
  const { items, totalItems, totalPrice } = useCart();
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  useEffect(() => {
    // Загружаем рекомендованные продукты
    const fetchRecommended = async () => {
      try {
        const response = await fetch("/api/products/recommended?limit=8");
        if (response.ok) {
          const data = await response.json();
          setRecommendedProducts(data.products);
        }
      } catch (error) {
        console.error("Ошибка загрузки рекомендаций:", error);
      }
    };

    fetchRecommended();
  }, []);

  if (items.length === 0) {
    notFound();
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
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col gap-[16px] w-full">
          <motion.div variants={itemVariants}>
            <Breadcrumbs
              items={[
                { title: "Главная", link: "/" },
                { title: "Корзина", link: "/cart" },
              ]}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <div className="flex flex-row gap-[16px] items-end justify-between">
              <div className="flex flex-row gap-[16px] items-end">
                <H1>Корзина</H1>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col gap-[16px] w-full  lg:grid-cols-3 lg:grid">
          <div className="grid grid-cols-1 gap-[24px] lg:col-span-2">
            <div className="lg:col-span-2 flex flex-col gap-[20px]">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>
          </div>

          <motion.div
            className="bg-white p-[24px] rounded-lg flex flex-col gap-[24px] lg:h-fit"
            variants={cardVariants}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex justify-between items-center"
              variants={itemVariants}
              transition={{ duration: 0.2 }}
            >
              <Descriptor className="text-gray-500">
                Товаров ({totalItems})
              </Descriptor>
              <motion.div
                key={totalPrice}
                initial={{ scale: 1.1, color: "#22c55e" }}
                animate={{ scale: 1, color: "#000" }}
                transition={{ duration: 0.3 }}
              >
                <Descriptor>{totalPrice} ₽</Descriptor>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex justify-between items-center"
              variants={itemVariants}
              transition={{ duration: 0.2 }}
            >
              <H2>Итого</H2>
              <motion.div
                key={`total-${totalPrice}`}
                initial={{ scale: 1.1, color: "#d2f269" }}
                animate={{ scale: 1, color: "#000" }}
                transition={{ duration: 0.3 }}
              >
                <H2>{totalPrice} ₽</H2>
              </motion.div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Link href={"/order"}>
                <Button1 className="w-full justify-center">
                  Перейти к оформлению
                </Button1>
              </Link>
            </motion.div>
          </motion.div>
        </div>
        {recommendedProducts.length > 0 && (
          <motion.div variants={itemVariants} className="mt-[40px]">
            <ProductSlider
              title="Рекомендуем лично вам"
              products={recommendedProducts}
              showViewAll={true}
              viewAllLink="/catalogue"
              viewAllText="смотреть все"
            />
          </motion.div>
        )}
      </motion.div>
      <Footer />
    </main>
  );
};

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CartContent />
    </Suspense>
  );
};

export default Page;
