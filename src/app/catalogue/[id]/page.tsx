"use client";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import H1 from "@/components/ui/typography/H1";
import {
  getProductById,
  Product as ProductType,
  getProductsByCategory,
} from "@/components/entities/product";
import Image from "next/image";
import H2 from "@/components/ui/typography/H2";
import Descriptor from "@/components/ui/typography/Descriptor";
import T2 from "@/components/ui/typography/T2";
import { Heart, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
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
import { useFavorites } from "@/store/favoritesStore"; // Импортируем ваш хук
import ProductSlider from "@/components/ui/components/product-slider";
import { X } from "lucide-react";

const faq = [
  {
    title: "Как оформить заказ?",
    description:
      "Выбрать товар → добавить в корзину → ввести адрес → выбрать доставку и оплату → оплатить → получить подтверждение и ждать доставку.",
  },
  {
    title: "Можно ли вернуть или обменять товар?",
    description:
      "Да. Заказ можно вернуть в течение 14 дней, при условии сохранения упаковки, чека, товарного вида и полного комплекта.",
  },
  {
    title: "Что является причиной возврата?",
    description:
      "Товар не подошёл по форме, габаритам, фасону, расцветке, размеру или комплектации. При этом игрушка не должна быть в употреблении, должны быть сохранены её товарный вид, потребительские свойства, пломбы и фабричные ярлыки.\n\nЕсли игрушка была испорчена после приобретения, вернуть её нельзя. Брак товара.",
  },
  {
    title: "Есть ли гарантия на игрушки?",
    description:
      "Да, гарантия составляет 1 год с момента приобретения игрушки.",
  },
  {
    title: "Какие способы оплаты доступны?",
    description:
      "Мы принимаем оплату картой онлайн и оплату при получении (наличными или картой курьеру).",
  },
  {
    title: "Как долго доставляется заказ?",
    description:
      "Доставка по Москве осуществляется в течение 1-2 дней. В другие регионы России - 3-7 дней в зависимости от удаленности.",
  },
  {
    title: "Можно ли забрать заказ самовывозом?",
    description:
      "Да, самовывоз доступен из нашего пункта выдачи. После оформления заказа мы свяжемся с вами для уточнения времени получения.",
  },
  {
    title: "Что делать, если товар пришёл поврежденным?",
    description:
      "Если товар получен в поврежденном виде, незамедлительно свяжитесь с нами. Мы заменим товар или вернём деньги.",
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
  const [product, setProduct] = useState<ProductType | null>(null);
  const [images, setImages] = useState<string[]>([]); // Новое состояние для картинок
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<ProductType[]>([]);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const handleOpenVideoDialog = () => setIsVideoOpen(true);
  const handleCloseVideoDialog = () => setIsVideoOpen(false);

  // Используем ваш Zustand стор
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isAnimating, setIsAnimating] = useState(false);
  const [thumbOffset, setThumbOffset] = useState(0);
  const [thumbAnimDir, setThumbAnimDir] = useState<1 | -1>(1);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const productData = await getProductById(params.id);
        setProduct(productData);
        setImages(productData.images); // Инициализация локального массива картинок

        // Fetch similar products based on the first category in breadcrumbs
        if (productData.breadcrumbs.length > 0) {
          const similar = await getProductsByCategory(
            productData.breadcrumbs[0]
          );
          // Filter out current product and limit to 4 similar products
          const filteredSimilar = similar
            .filter((p: ProductType) => p.id !== productData.id)
            .slice(0, 4);
          setSimilarProducts(filteredSimilar);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params.id]);

  // Корректируем смещение превью при изменении количества изображений
  useEffect(() => {
    const smallImagesCount = Math.max(0, images.length - 1);
    const maxThumbOffset = Math.max(0, smallImagesCount - 5);
    setThumbOffset((prev) => Math.min(prev, maxThumbOffset));
  }, [images]);

  // Предзагрузка ближайших миниатюр для плавной прокрутки
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!images || images.length <= 1) return;
    const startIndex = Math.max(1, 1 + thumbOffset - 4);
    const endIndex = Math.min(images.length, 1 + thumbOffset + 12);
    for (let i = startIndex; i < endIndex; i += 1) {
      const url = images[i];
      if (!url) continue;
      const img = new window.Image();
      img.src = url;
    }
  }, [images, thumbOffset]);

  // Трекер брейкпоинта для выбора оси анимации (desktop: вертикаль, mobile: горизонталь)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => {
      mql.removeEventListener?.("change", update);
    };
  }, []);

  // Если идет загрузка
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
        <div className="flex justify-center items-center py-8">
          <div className="text-lg">Загрузка продукта...</div>
        </div>
      </main>
    );
  }

  // Если ошибка или продукт не найден
  if (error || !product) {
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

  // Обработчик клика по маленькой картинке
  const handleImageClick = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const newImages = [...prev];
      [newImages[0], newImages[index]] = [newImages[index], newImages[0]];
      return newImages;
    });
  };

  // Проверяем, находится ли продукт в избранном
  const productIsFavorite = isFavorite(product.id);

  // Поддержка карусели маленьких изображений (только для десктопа визуально)
  const smallImagesCount = Math.max(0, images.length - 1);
  const maxThumbOffset = Math.max(0, smallImagesCount - 5);
  const canScrollDown = thumbOffset < maxThumbOffset;
  const canScrollUp = thumbOffset > 0;

  const scrollThumbsUp = () => {
    setThumbAnimDir(-1);
    setThumbOffset((prev) => Math.max(prev - 3, 0));
  };
  const scrollThumbsDown = () => {
    setThumbAnimDir(1);
    setThumbOffset((prev) => Math.min(prev + 3, maxThumbOffset));
  };

  return (
    <main
      className={cn(
        "px-[10px] gap-[40px]",
        "xl:px-[50px] xl:gap-[50px]",
        "2xl:px-[100px] 2xl:gap-[60px]",
        "flex flex-col items-center justify-start min-h-screen bg-body-background"
      )}
    >
      {/* Видео диалог */}
      {product?.videoUrl && (
        <AnimatePresence>
          {isVideoOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0"
                onClick={handleCloseVideoDialog}
              />
              <motion.div
                className="relative bg-[#e6ff6b] rounded-2xl p-6 shadow-2xl flex flex-col items-center"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  minWidth: "90vw",
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                }}
              >
                <button
                  className="absolute top-2 right-2 text-black/80 hover:text-black text-2xl z-10"
                  onClick={handleCloseVideoDialog}
                  aria-label="Закрыть видео"
                >
                  <X />
                </button>
                <video
                  src={product.videoUrl}
                  controls
                  autoPlay
                  className="rounded-xl bg-black aspect-video w-full h-auto"
                  style={{
                    background: "black",
                    minWidth: "90vw",
                    minHeight: "auto",
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
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
                  <div className="grid grid-cols-5 grid-rows-6 gap-4 w-full lg:grid-cols-6 lg:grid-rows-5 relative">
                    {/* Большая картинка */}
                    <motion.div
                      variants={imageVariants}
                      className="col-span-5 row-span-5 col-start-1 row-start-1 aspect-square lg:col-span-5 lg:row-span-5 lg:col-start-2 lg:row-start-1"
                    >
                      <Image
                        className="aspect-square object-cover rounded-2xl w-full h-full lg:h-fit "
                        src={images[0]}
                        alt={product.name}
                        width={1200}
                        height={1200}
                      />
                    </motion.div>

                    {/* Маленькие картинки (карусель на десктопе с анимацией) */}
                    <AnimatePresence initial={false}>
                      {images
                        .slice(1 + thumbOffset, 6 + thumbOffset)
                        .map((image, index) => {
                          const mobilePositions = [
                            "col-start-1 row-start-6", // для мобильных все в 6-й строке
                            "col-start-2 row-start-6",
                            "col-start-3 row-start-6",
                            "col-start-4 row-start-6",
                            "col-start-5 row-start-6",
                          ];

                          const desktopPositions = [
                            "lg:col-start-1 lg:row-start-1", // для десктопа в первой колонке
                            "lg:col-start-1 lg:row-start-2",
                            "lg:col-start-1 lg:row-start-3",
                            "lg:col-start-1 lg:row-start-4",
                            "lg:col-start-1 lg:row-start-5",
                          ];

                          return (
                            <motion.div
                              key={`thumb-${thumbOffset}-${index}-${image}`}
                              initial={
                                isDesktop
                                  ? {
                                      y: thumbAnimDir > 0 ? 24 : -24,
                                      x: 0,
                                      opacity: 0,
                                    }
                                  : {
                                      x: thumbAnimDir > 0 ? 24 : -24,
                                      y: 0,
                                      opacity: 0,
                                    }
                              }
                              animate={{ x: 0, y: 0, opacity: 1 }}
                              exit={
                                isDesktop
                                  ? {
                                      y: thumbAnimDir > 0 ? -24 : 24,
                                      x: 0,
                                      opacity: 0,
                                    }
                                  : {
                                      x: thumbAnimDir > 0 ? -24 : 24,
                                      y: 0,
                                      opacity: 0,
                                    }
                              }
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              whileHover={{ scale: 1.02 }}
                              className={`aspect-square ${mobilePositions[index]} ${desktopPositions[index]}`}
                              onClick={() =>
                                handleImageClick(index + 1 + thumbOffset)
                              }
                              style={{ cursor: "pointer" }}
                            >
                              <Image
                                className="aspect-square object-cover rounded-2xl w-full h-full"
                                src={image}
                                alt={`image ${index + 1}`}
                                width={1200}
                                height={1200}
                              />
                            </motion.div>
                          );
                        })}
                    </AnimatePresence>

                    {/* Оверлей обертка для кнопок, позиционированная относительно блока миниатюр (только десктоп) */}
                    <div className="hidden lg:block lg:col-start-1 lg:row-start-1 lg:row-span-5 relative z-20 pointer-events-none">
                      {/* Вверх */}
                      {canScrollUp && (
                        <button
                          type="button"
                          aria-label="Прокрутить вверх"
                          onClick={scrollThumbsUp}
                          className="pointer-events-auto flex items-center justify-center absolute left-1/2 -translate-x-1/2 top-2  w-10 h-10 rounded-full bg-primary text-black transition-transform hover:scale-105 shadow-md"
                          style={{ opacity: 0.95 }}
                        >
                          <ArrowUp className="w-5 h-5" strokeWidth={3} />
                        </button>
                      )}

                      {/* Вниз */}
                      {canScrollDown && (
                        <button
                          type="button"
                          aria-label="Прокрутить вниз"
                          onClick={scrollThumbsDown}
                          className="pointer-events-auto flex items-center justify-center absolute left-1/2 -translate-x-1/2 bottom-2 w-10 h-10 rounded-full bg-primary text-black transition-transform hover:scale-105 shadow-md"
                          style={{ opacity: 0.95 }}
                        >
                          <ArrowDown className="w-5 h-5" strokeWidth={3} />
                        </button>
                      )}
                    </div>

                    {/* Оверлей обертка для кнопок (только мобильные, по горизонтали) */}
                    <div className="lg:hidden col-start-1 row-start-6 col-span-5 relative z-20 pointer-events-none">
                      {/* Влево */}
                      {canScrollUp && (
                        <button
                          type="button"
                          aria-label="Листать влево"
                          onClick={scrollThumbsUp}
                          className="pointer-events-auto flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-black transition-transform hover:scale-105 shadow-md"
                          style={{ opacity: 0.95 }}
                        >
                          <ArrowLeft className="w-5 h-5" strokeWidth={3} />
                        </button>
                      )}

                      {/* Вправо */}
                      {canScrollDown && (
                        <button
                          type="button"
                          aria-label="Листать вправо"
                          onClick={scrollThumbsDown}
                          className="pointer-events-auto flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-black transition-transform hover:scale-105 shadow-md"
                          style={{ opacity: 0.95 }}
                        >
                          <ArrowRight className="w-5 h-5" strokeWidth={3} />
                        </button>
                      )}
                    </div>
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

                  {/* Кнопки действий */}
                  <div className="flex flex-col gap-2 w-full">
                    {product.videoUrl && (
                      <motion.div variants={itemVariants}>
                        <Button1
                          className="justify-center relative overflow-hidden bg-transparent! border-3 border-primary text-black"
                          onClick={handleOpenVideoDialog}
                        >
                          <AnimatePresence mode="wait">
                            <motion.span
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="block"
                            >
                              Видео
                            </motion.span>
                          </AnimatePresence>
                        </Button1>
                      </motion.div>
                    )}
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
                  </div>
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
                    <H3>Характеристики</H3>
                    <motion.div
                      className="flex flex-col gap-[12px]"
                      variants={containerVariants}
                    >
                      {product.characteristics.map((char, index) => (
                        <motion.div
                          className="flex justify-between items-center"
                          key={index}
                          variants={itemVariants}
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
                  <div className="flex flex-row gap-2 w-full">
                    {product.videoUrl && (
                      <motion.div variants={itemVariants} className="w-full">
                        <Button1
                          className="justify-center relative overflow-hidden bg-transparent! border-3 border-primary text-black"
                          onClick={handleOpenVideoDialog}
                        >
                          <AnimatePresence mode="wait">
                            <motion.span
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="block"
                            >
                              Видео
                            </motion.span>
                          </AnimatePresence>
                        </Button1>
                      </motion.div>
                    )}
                    <motion.div variants={itemVariants} className="w-full">
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
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="block"
                          >
                            {isAdded ? "Добавлено в корзину" : "В корзину"}
                          </motion.span>
                        </AnimatePresence>
                      </Button1>
                    </motion.div>
                  </div>
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
              {/* Рекомендуемые товары пока отключены */}
              <motion.div
                variants={cardVariants}
                className="col-span-3 mt-[40px]"
              >
                <ProductSlider
                  title="Вам может понравиться"
                  products={similarProducts}
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
