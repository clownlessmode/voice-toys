"use client";
import Image from "next/image";
import { Product as ProductType } from "../model";
import T2 from "@/components/ui/typography/T2";
import Price from "@/components/ui/typography/Price";
import Button2 from "@/components/ui/typography/Button2";
import Descriptor from "@/components/ui/typography/Descriptor";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/app/cart/use-cart";
import { useFavorites } from "@/store/favoritesStore";
import { useState } from "react";
import Link from "next/link";

const cardVariants = {
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

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      delay: 0.1,
    },
  },
};

export default function Product({ product }: { product: ProductType }) {
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem(product, 1);
    setIsAdded(true);

    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  const isProductFavorite = isFavorite(product.id);

  // Получаем возраст из характеристик
  const ageCharacteristic = product.characteristics?.find(
    (char) => char.key === "Возраст"
  );
  const age = ageCharacteristic?.value || "0+";

  return (
    <Link href={`/catalogue/${product.id}`} className="w-full">
      <motion.div
        className="bg-background rounded-[20px] w-full h-fit flex flex-col gap-[16px] relative cursor-pointer"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          transition: { duration: 0.2 },
        }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div variants={imageVariants}>
          <Image
            src={product.images[0]}
            alt={product.name}
            width={100}
            height={100}
            className="w-full h-full object-cover aspect-square rounded-[20px] overflow-hidden"
          />
        </motion.div>

        <motion.div
          className="flex flex-col gap-[32px] px-[16px] pb-[16px]"
          variants={contentVariants}
        >
          <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
            <T2 className="line-clamp-2 min-h-[32px]">{product.name}</T2>
          </motion.div>

          <div className="flex sm:flex-row gap-[16px] sm:justify-between sm:items-center flex-col">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Price>
                {product.price.current} {product.price.currency}
              </Price>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button2
                className="w-full relative overflow-hidden"
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
                    {isAdded ? "Добавлено" : "В корзину"}
                  </motion.span>
                </AnimatePresence>
              </Button2>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-0 right-0 w-full flex justify-between items-center p-[16px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <motion.div
            className="bg-background rounded-full size-[32px] flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Descriptor>{age}</Descriptor>
          </motion.div>

          <motion.div
            whileHover={{
              scale: 1.2,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.9 }}
            className="cursor-pointer"
            onClick={handleToggleFavorite}
          >
            <Heart
              className={`${
                isProductFavorite
                  ? "text-red-500 fill-red-500"
                  : "text-background"
              } transition-colors duration-200`}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </Link>
  );
}
