"use client";
import Breadcrumbs from "@/components/ui/components/breadcrumbs";
import H1 from "@/components/ui/typography/H1";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";

import React, { Suspense } from "react";
import { Product } from "@/components/entities/product/ui";
import { useFavorites } from "@/store/favoritesStore";
import { motion } from "framer-motion";
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

const FavoritesContent = () => {
  const { favorites, favoritesCount } = useFavorites();

  if (favorites.length === 0) {
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
        <div className="flex flex-col gap-[32px] w-full">
          <div className="flex flex-col gap-[16px]">
            <motion.div variants={itemVariants}>
              <Breadcrumbs
                items={[
                  { title: "Главная", link: "/" },
                  { title: "Избранное", link: "/favorites" },
                ]}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="flex flex-row gap-[16px] items-end">
                <H1>Избранное {favoritesCount > 0 && `(${favoritesCount})`}</H1>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="min-h-screen grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 w-full gap-[10px]"
          variants={containerVariants}
        >
          {favorites.map((item, index) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: index * 0.1 },
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
            >
              <Product product={item} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      <Footer />
    </main>
  );
};

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FavoritesContent />
    </Suspense>
  );
};

export default Page;
