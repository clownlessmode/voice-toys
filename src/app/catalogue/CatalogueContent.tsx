"use client";
import { categories, CategoryBadge } from "@/components/entities/category";
import {
  getProducts,
  Product as ProductType,
} from "@/components/entities/product";
import { Product } from "@/components/entities/product/ui";
import { types } from "@/components/entities/type";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import Descriptor from "@/components/ui/typography/Descriptor";
import H1 from "@/components/ui/typography/H1";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { ageMap, ageMapReverse } from "@/lib/age-utils";

const CatalogueContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка продуктов из API
  const fetchProducts = async (
    search?: string,
    type?: string,
    age?: string
  ) => {
    try {
      setLoading(true);
      const response = await getProducts({
        search,
        type,
        age,
        limit: 100,
      });
      setProducts(response.products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  // Инициализация фильтров из URL при загрузке страницы
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const ageParam = searchParams.get("age");
    const searchParam = searchParams.get("search");

    if (typeParam) {
      setSelectedTypes([decodeURIComponent(typeParam)]);
    }

    if (ageParam) {
      const readableAge = ageMap[ageParam];
      if (readableAge) {
        setSelectedAges([readableAge]);
      }
    }

    if (searchParam) {
      setSearchQuery(decodeURIComponent(searchParam));
    }

    // Загружаем продукты с учетом параметров из URL
    fetchProducts(
      searchParam ? decodeURIComponent(searchParam) : undefined,
      typeParam ? decodeURIComponent(typeParam) : undefined,
      ageParam || undefined
    );
  }, [searchParams]);

  // Обновление URL при изменении фильтров
  const updateURL = (types: string[], ages: string[], search: string) => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (types.length > 0) {
      params.set("type", encodeURIComponent(types[0]));
    }

    if (ages.length > 0) {
      const urlAge = ageMapReverse[ages[0]];
      if (urlAge) {
        params.set("age", urlAge);
      }
    }

    if (search.trim()) {
      params.set("search", encodeURIComponent(search.trim()));
    }

    const newURL = params.toString()
      ? `/catalogue?${params.toString()}`
      : "/catalogue";

    router.push(newURL, { scroll: false });

    // Загружаем новые продукты
    fetchProducts(
      search.trim() || undefined,
      types[0] || undefined,
      ages.length > 0 ? ageMapReverse[ages[0]] : undefined
    );

    setTimeout(() => setIsLoading(false), 300);
  };

  // Обработчик клика по типу
  const handleTypeClick = (typeTitle: string) => {
    const newSelectedTypes = selectedTypes.includes(typeTitle)
      ? selectedTypes.filter((t) => t !== typeTitle)
      : [...selectedTypes, typeTitle];

    setSelectedTypes(newSelectedTypes);
    updateURL(newSelectedTypes, selectedAges, searchQuery);
  };

  // Обработчик клика по возрастной категории
  const handleAgeClick = (age: string) => {
    const newSelectedAges = selectedAges.includes(age)
      ? selectedAges.filter((a) => a !== age)
      : [...selectedAges, age];

    setSelectedAges(newSelectedAges);
    updateURL(selectedTypes, newSelectedAges, searchQuery);
  };

  // Функция для удаления поиска
  const clearSearch = () => {
    setSearchQuery("");
    updateURL(selectedTypes, selectedAges, "");
  };

  // Функция для сброса всех фильтров
  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedAges([]);
    setSearchQuery("");
    router.push("/catalogue", { scroll: false });
    fetchProducts(); // Загружаем все продукты
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const filterVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-500 mb-4">Ошибка: {error}</div>
          <button
            onClick={() => fetchProducts()}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.main
      className={cn(
        "px-[10px] gap-[40px]",
        "xl:px-[50px] xl:gap-[50px]",
        "2xl:px-[100px] 2xl:gap-[60px]",
        "flex flex-col items-center justify-start min-h-screen bg-body-background"
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Header />

      <div className="flex flex-col gap-[24px] w-full">
        <motion.div
          className="flex flex-col gap-[32px] w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="flex flex-col gap-[16px]"
            variants={itemVariants}
          >
            <Breadcrumbs
              items={[
                { title: "Главная", link: "/" },
                { title: "Каталог", link: "/catalogue" },
              ]}
            />
            <div className="flex flex-row gap-[16px] items-end">
              <H1>Каталог</H1>
              <motion.div
                key={products.length}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Descriptor className="text-black/30 mb-[2px]">
                  {loading ? "Загрузка..." : `${products.length} товаров`}
                </Descriptor>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col gap-[16px] w-full"
            variants={itemVariants}
          >
            {/* Активные фильтры */}
            <div className="flex flex-wrap gap-[12px] items-center max-w-[600px]">
              {/* Поисковый запрос */}
              <AnimatePresence>
                {searchQuery && (
                  <motion.div
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm"
                    variants={filterVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <span>Поиск: {searchQuery}</span>
                    <motion.button
                      onClick={clearSearch}
                      className="hover:bg-blue-200 rounded-full p-1 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="size-3" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Кнопка сброса всех фильтров */}
              <AnimatePresence>
                {(selectedTypes.length > 0 ||
                  selectedAges.length > 0 ||
                  searchQuery) && (
                  <motion.button
                    onClick={clearAllFilters}
                    className="px-4 py-2 rounded-full bg-red-100 text-red-600 text-sm hover:bg-red-200 transition-colors"
                    variants={filterVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Сбросить все фильтры
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              className="flex flex-row flex-wrap gap-[12px] w-full md:max-w-[60%]"
              variants={containerVariants}
            >
              {/* Фильтры по типам */}
              {types.map((item, index) => (
                <motion.div
                  key={`type-${index}`}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CategoryBadge
                    label={item.title}
                    value={selectedTypes.includes(item.title)}
                    onClick={() => handleTypeClick(item.title)}
                  />
                </motion.div>
              ))}

              {/* Фильтры по возрасту */}
              {categories.map((item, index) => (
                <motion.div
                  key={`age-${index}`}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CategoryBadge
                    label={item.age}
                    value={selectedAges.includes(item.age)}
                    onClick={() => handleAgeClick(item.age)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading || isLoading ? (
            <motion.div
              key="loading"
              className="grid grid-cols-2 gap-[10px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 animate-pulse rounded-lg"
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="products"
              className="min-h-screen grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4  gap-[10px]"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {products.length > 0 ? (
                products.map((item) => (
                  <motion.div
                    key={`${item.id}-${selectedTypes.join(
                      "-"
                    )}-${selectedAges.join("-")}-${searchQuery}`}
                    variants={itemVariants}
                    whileHover={{
                      scale: 1.02,
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 10,
                      },
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={`catalogue/${item.id}`}>
                      <Product product={item} />
                    </Link>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="w-full flex justify-center col-span-4 mt-[15vh] text-center py-[50px]"
                  variants={itemVariants}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <p className="text-foreground text-lg mb-4">
                      {searchQuery
                        ? `По запросу "${searchQuery}" ничего не найдено`
                        : "Товары не найдены"}
                    </p>
                    <motion.button
                      onClick={clearAllFilters}
                      className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Показать все товары
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </motion.main>
  );
};

export default CatalogueContent;
