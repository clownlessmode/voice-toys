"use client";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { notFound, useParams } from "next/navigation";
import H1 from "@/components/ui/typography/H1";
import { products } from "@/components/entities/product";
import Image from "next/image";
import H2 from "@/components/ui/typography/H2";
import Descriptor from "@/components/ui/typography/Descriptor";
import T2 from "@/components/ui/typography/T2";
import { Heart } from "lucide-react";
import Navigation from "@/components/ui/typography/Navigation";
import Button1 from "@/components/ui/typography/Button1";
import H3 from "@/components/ui/typography/H3";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import Footer from "@/components/widgets/Footer";
import { useCart } from "../../cart/use-cart";
import { motion, AnimatePresence } from "framer-motion";
import ProductSlider from "@/components/ui/components/product-slider";
import { useFavorites } from "@/store/favoritesStore"; // Импортируем ваш хук

const faq = [
  {
    title: "Как оформить заказ?",
    description: "Текст вопросы и ответы",
  },
  {
    title: "Как происходит доставка?",
    description: "Текст вопросы и ответы",
  },
  {
    title: "Что, если товар не подойдёт?",
    description: "Текст вопросы и ответы",
  },
  {
    title: "Как можно оплатить?",
    description: "Текст вопросы и ответы",
  },
  {
    title: "Есть ли гарантия?",
    description: "Текст вопросы и ответы",
  },
];

// Варианты анимаций
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const Page = () => {
  const params = useParams<{ id: string }>();
  const product = products.find((p) => p.id === params.id);
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  // Используем ваш Zustand стор
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isAnimating, setIsAnimating] = useState(false);

  // Если продукт не найден, показываем 404
  if (!product) {
    notFound();
  }

  const handleAddToCart = () => {
    addItem(product, 1);
    setIsAdded(true);

    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const handleToggleFavorite = () => {
    setIsAnimating(true);
    toggleFavorite(product); // Передаем весь объект продукта
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Проверяем, находится ли продукт в избранном
  const productIsFavorite = isFavorite(product.id);

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
        className="flex flex-col gap-[24px] w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col gap-[32px] w-full">
          <div className="flex flex-col gap-[16px] ">
            <motion.div variants={itemVariants}>
              <Breadcrumbs
                items={[
                  { title: "Главная", link: "/" },
                  { title: "Каталог", link: "/catalogue" },
                  {
                    title: `${product.name}`,
                    link: `/catalogue/${params.id}`,
                  },
                ]}
              />
            </motion.div>
            <div className="lg:grid lg:grid-cols-3 flex flex-col gap-[16px] ">
              <div className="lg:col-span-2 flex flex-col gap-[16px] ">
                <motion.div variants={itemVariants}>
                  <H1>{product.name}</H1>
                </motion.div>

                <motion.div
                  className="flex flex-col gap-[10px] w-full lg:flex-row-reverse lg:justify-end lg:items-end lg:flex lg:h-fit!"
                  variants={itemVariants}
                >
                  <div className="flex flex-col lg:flex-row-reverse gap-[10px] lg:gap-[24px] w-full lg:h-fit! lg:max-h-[640px] lg:overflow-hidden">
                    {/* Основная картинка */}
                    <motion.div
                      variants={imageVariants}
                      className="w-full lg:flex-1 aspect-square lg:h-fit!"
                    >
                      <Image
                        className="aspect-square object-cover rounded-2xl w-full h-full lg:h-fit lg:max-h-[640px]"
                        src={product.images[0]}
                        alt={product.name}
                        width={1200}
                        height={1200}
                      />
                    </motion.div>

                    {/* Маленькие картинки */}
                    <motion.div
                      className="flex flex-row gap-[10px] flex-nowrap lg:flex-col lg:w-[120px] lg:h-full lg:gap-[10px]"
                      variants={containerVariants}
                    >
                      {product.images.slice(1, 6).map((image, index) => (
                        <motion.div
                          key={index}
                          variants={imageVariants}
                          whileHover={{ scale: 1.0 }}
                          transition={{ duration: 0.2 }}
                          className="aspect-square lg:w-full"
                        >
                          <Image
                            className="aspect-square object-cover rounded-2xl w-full h-full"
                            src={image}
                            alt={"image"}
                            width={1200}
                            height={1200}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-white rounded-lg p-[24px] flex flex-col gap-[32px] lg:hidden"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="flex flex-row gap-[12px] items-center "
                    variants={itemVariants}
                  >
                    <H2>{product.price.current}₽</H2>
                    {product.price.discountPercent && (
                      <motion.div
                        className="bg-primary px-[8px] py-[0px] rounded-md"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0, duration: 0.3 }}
                      >
                        <Descriptor>
                          -{product.price.discountPercent}%
                        </Descriptor>
                      </motion.div>
                    )}
                    {product.price.old && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0 }}
                      >
                        <T2 className="text-foreground/20">
                          {product.price.old}₽
                        </T2>
                      </motion.div>
                    )}
                  </motion.div>

                  <motion.div
                    className="flex flex-col gap-[12px]"
                    variants={itemVariants}
                  >
                    <motion.button
                      className="flex flex-row gap-[10px] items-center"
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onClick={handleToggleFavorite}
                    >
                      <div className="relative">
                        <motion.div
                          animate={{
                            scale: isAnimating ? [1, 1.2, 1] : 1,
                            rotate: isAnimating ? [0, -5, 5, 0] : 0,
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <Heart
                            className={`size-[24px] transition-all duration-300 ${
                              productIsFavorite
                                ? "text-red-500 fill-red-500"
                                : "text-foreground hover:text-red-300"
                            }`}
                          />
                        </motion.div>

                        {/* Эффект при добавлении */}
                        <AnimatePresence>
                          {isAnimating && productIsFavorite && (
                            <motion.div
                              className="absolute inset-0 border-2 border-red-500 rounded-full"
                              initial={{ scale: 0.8, opacity: 0.8 }}
                              animate={{ scale: 1.5, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5 }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Дополнительный эффект частиц при добавлении */}
                        <AnimatePresence>
                          {isAnimating && productIsFavorite && (
                            <>
                              {[...Array(6)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full"
                                  initial={{
                                    scale: 0,
                                    x: 0,
                                    y: 0,
                                    opacity: 1,
                                  }}
                                  animate={{
                                    scale: [0, 1, 0],
                                    x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                                    y: Math.sin((i * 60 * Math.PI) / 180) * 20,
                                    opacity: [1, 1, 0],
                                  }}
                                  transition={{
                                    duration: 0.6,
                                    ease: "easeOut",
                                  }}
                                />
                              ))}
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      <Navigation
                        className={`transition-colors duration-300 ${
                          productIsFavorite
                            ? "text-red-500 font-medium"
                            : "text-current"
                        }`}
                      >
                        {productIsFavorite
                          ? "Убрать из избранного"
                          : "Добавить в избранное"}
                      </Navigation>
                    </motion.button>
                    <T2>{product.availability.pickup}</T2>
                    <T2>{product.availability.delivery}</T2>
                  </motion.div>

                  {/* Кнопка добавления в корзину с анимацией */}
                  <motion.div variants={itemVariants}>
                    <Button1
                      className="justify-center relative overflow-hidden"
                      onClick={handleAddToCart}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={isAdded ? "added" : "add"}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{
                            duration: 0.3,
                            ease: "easeInOut",
                          }}
                          className="block"
                        >
                          {isAdded ? "Добавлено в корзину" : "В корзину"}
                        </motion.span>
                      </AnimatePresence>
                    </Button1>
                  </motion.div>
                </motion.div>

                {/* Остальные блоки остаются без изменений */}
                <motion.div
                  className="bg-white rounded-lg p-[24px] flex flex-col gap-[16px] lg:hidden"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <H3>Условия возврата</H3>
                  <Descriptor>
                    Обменять или вернуть товар надлежащего качества можно в
                    течении {product.returnPolicy.days} дней с момента покупки
                  </Descriptor>
                  <motion.div
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Descriptor className="underline">Подробнее</Descriptor>
                  </motion.div>
                </motion.div>

                <motion.div
                  className="bg-white rounded-lg p-[24px] flex flex-col gap-[32px]"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="flex flex-col gap-[16px]"
                    variants={itemVariants}
                  >
                    <H3>Описание</H3>
                    <Descriptor>{product.description}</Descriptor>
                  </motion.div>

                  <motion.div
                    className="flex flex-col gap-[16px]"
                    variants={itemVariants}
                  >
                    <H3>Характеристки</H3>
                    <motion.div
                      className="flex flex-col gap-[12px]"
                      variants={containerVariants}
                    >
                      {product.characteristics.map((char, index) => (
                        <motion.div
                          className="flex justify-between items-center"
                          key={index}
                          variants={itemVariants}
                          whileHover={{
                            x: 5,
                            backgroundColor: "rgba(0,0,0,0.02)",
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <Descriptor className="text-foreground/20">
                            {char.key}
                          </Descriptor>
                          <Descriptor className="text-foreground">
                            {char.value}
                          </Descriptor>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                </motion.div>

                <motion.div
                  className="bg-white rounded-lg p-[24px] flex flex-col gap-[32px]"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <H3>Вопросы и ответы</H3>
                  <Accordion type="single" collapsible>
                    {faq.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <AccordionItem value={item.title}>
                          <AccordionTrigger>{item.title}</AccordionTrigger>
                          <AccordionContent>
                            {item.description}
                          </AccordionContent>
                        </AccordionItem>
                      </motion.div>
                    ))}
                  </Accordion>
                </motion.div>
              </div>

              <div className="hidden lg:flex flex-col gap-[16px] mt-[64px]">
                <motion.div
                  className="bg-white  rounded-lg p-[24px] hidden flex-col gap-[32px] lg:flex h-fit"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="flex flex-row gap-[12px] items-center "
                    variants={itemVariants}
                  >
                    <H2>{product.price.current}₽</H2>
                    {product.price.discountPercent && (
                      <motion.div
                        className="bg-primary px-[8px] py-[0px] rounded-md"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0, duration: 0.3 }}
                      >
                        <Descriptor>
                          -{product.price.discountPercent}%
                        </Descriptor>
                      </motion.div>
                    )}
                    {product.price.old && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0 }}
                      >
                        <T2 className="text-foreground/20">
                          {product.price.old}₽
                        </T2>
                      </motion.div>
                    )}
                  </motion.div>

                  <motion.div
                    className="flex flex-col gap-[12px]"
                    variants={itemVariants}
                  >
                    <motion.button
                      className="flex flex-row gap-[10px] items-center"
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onClick={handleToggleFavorite}
                    >
                      <div className="relative">
                        <motion.div
                          animate={{
                            scale: isAnimating ? [1, 1.2, 1] : 1,
                            rotate: isAnimating ? [0, -5, 5, 0] : 0,
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <Heart
                            className={`size-[24px] transition-all duration-300 ${
                              productIsFavorite
                                ? "text-red-500 fill-red-500"
                                : "text-foreground hover:text-red-300"
                            }`}
                          />
                        </motion.div>

                        {/* Эффект при добавлении */}
                        <AnimatePresence>
                          {isAnimating && productIsFavorite && (
                            <motion.div
                              className="absolute inset-0 border-2 border-red-500 rounded-full"
                              initial={{ scale: 0.8, opacity: 0.8 }}
                              animate={{ scale: 1.5, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5 }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Дополнительный эффект частиц при добавлении */}
                        <AnimatePresence>
                          {isAnimating && productIsFavorite && (
                            <>
                              {[...Array(6)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full"
                                  initial={{
                                    scale: 0,
                                    x: 0,
                                    y: 0,
                                    opacity: 1,
                                  }}
                                  animate={{
                                    scale: [0, 1, 0],
                                    x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                                    y: Math.sin((i * 60 * Math.PI) / 180) * 20,
                                    opacity: [1, 1, 0],
                                  }}
                                  transition={{
                                    duration: 0.6,
                                    ease: "easeOut",
                                  }}
                                />
                              ))}
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      <Navigation
                        className={`transition-colors duration-300 ${
                          productIsFavorite
                            ? "text-red-500 font-medium"
                            : "text-current"
                        }`}
                      >
                        {productIsFavorite
                          ? "Убрать из избранного"
                          : "Добавить в избранное"}
                      </Navigation>
                    </motion.button>
                    <T2>{product.availability.pickup}</T2>
                    <T2>{product.availability.delivery}</T2>
                  </motion.div>

                  {/* Кнопка добавления в корзину с анимацией */}
                  <motion.div variants={itemVariants}>
                    <Button1
                      className="justify-center relative overflow-hidden"
                      onClick={handleAddToCart}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={isAdded ? "added" : "add"}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{
                            duration: 0.3,
                            ease: "easeInOut",
                          }}
                          className="block"
                        >
                          {isAdded ? "Добавлено в корзину" : "В корзину"}
                        </motion.span>
                      </AnimatePresence>
                    </Button1>
                  </motion.div>
                </motion.div>
                <motion.div
                  className="bg-white rounded-lg p-[24px] flex flex-col gap-[16px]"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <H3>Условия возврата</H3>
                  <Descriptor>
                    Обменять или вернуть товар надлежащего качества можно в
                    течении {product.returnPolicy.days} дней с момента покупки
                  </Descriptor>
                  <motion.div
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Descriptor className="underline">Подробнее</Descriptor>
                  </motion.div>
                </motion.div>
              </div>
              <motion.div variants={cardVariants} className="col-span-3">
                <ProductSlider
                  title="Вам может понравиться"
                  products={products}
                  showViewAll={false}
                  viewAllLink="/catalogue"
                  viewAllText="смотреть все"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
      <Footer />
    </main>
  );
};

export default Page;
