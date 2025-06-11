"use client";
import { categories, CategoryBadge } from "@/components/entities/category";
import { products } from "@/components/entities/product";
import { Product } from "@/components/entities/product/ui";
import { types } from "@/components/entities/type";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import Descriptor from "@/components/ui/typography/Descriptor";
import H1 from "@/components/ui/typography/H1";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const CatalogueContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Инициализация фильтров из URL при загрузке страницы
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const ageParam = searchParams.get("age");
    const searchParam = searchParams.get("search");

    if (typeParam) {
      setSelectedTypes([decodeURIComponent(typeParam)]);
    }

    if (ageParam) {
      const ageMap: { [key: string]: string } = {
        "6м-2года": "6 м. – 2 года",
        "3-4года": "3 – 4 года",
        "5-7лет": "5 – 7 лет",
        "8-10лет": "8 – 10 лет",
      };
      const readableAge = ageMap[ageParam];
      if (readableAge) {
        setSelectedAges([readableAge]);
      }
    }

    if (searchParam) {
      setSearchQuery(decodeURIComponent(searchParam));
    }
  }, [searchParams]);

  // Обновление URL при изменении фильтров
  const updateURL = (types: string[], ages: string[], search: string) => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (types.length > 0) {
      params.set("type", encodeURIComponent(types[0]));
    }

    if (ages.length > 0) {
      const ageMap: { [key: string]: string } = {
        "6 м. – 2 года": "6м-2года",
        "3 – 4 года": "3-4года",
        "5 – 7 лет": "5-7лет",
        "8 – 10 лет": "8-10лет",
      };
      const urlAge = ageMap[ages[0]];
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

    setTimeout(() => setIsLoading(false), 300);
  };

  // Фильтрация продуктов на основе выбранных фильтров и поиска
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Фильтрация по поиску
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
      );
    }

    // Фильтрация по типам
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((product) => {
        const productType = product.breadcrumbs[2];
        return selectedTypes.includes(productType);
      });
    }

    // Фильтрация по возрасту
    if (selectedAges.length > 0) {
      filtered = filtered.filter((product) => {
        const ageCharacteristic = product.characteristics.find(
          (char) => char.key === "Возраст"
        );

        if (!ageCharacteristic) return false;

        const productAge = ageCharacteristic.value;

        return selectedAges.some((selectedAge) => {
          switch (selectedAge) {
            case "6 м. – 2 года":
              return (
                productAge.includes("1+") ||
                productAge.includes("0+") ||
                productAge.includes("6м") ||
                productAge.includes("1-2")
              );
            case "3 – 4 года":
              return productAge.includes("3+") || productAge.includes("3-4");
            case "5 – 7 лет":
              return (
                productAge.includes("5+") ||
                productAge.includes("6+") ||
                productAge.includes("5-7")
              );
            case "8 – 10 лет":
              return (
                productAge.includes("8+") ||
                productAge.includes("9+") ||
                productAge.includes("8-10")
              );
            default:
              return false;
          }
        });
      });
    }

    return filtered;
  }, [selectedTypes, selectedAges, searchQuery]);

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

  return (
    <motion.main
      className={cn(
        "px-[10px] gap-[80px]",
        "xl:px-[50px] xl:gap-[100px]",
        "2xl:px-[100px] 2xl:gap-[150px]",
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
                key={filteredProducts.length}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Descriptor className="text-black/30 mb-[2px]">
                  {filteredProducts.length} товаров
                </Descriptor>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col gap-[16px] w-full"
            variants={itemVariants}
          >
            {/* Активные фильтры */}
            <div className="flex flex-wrap gap-[12px] items-center">
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
          {isLoading ? (
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
              {filteredProducts.length > 0 ? (
                filteredProducts.map((item) => (
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
                  className="col-span-2 text-center py-[50px]"
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
