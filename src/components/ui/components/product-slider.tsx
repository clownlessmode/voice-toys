"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion, useAnimation } from "motion/react";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Product from "@/components/entities/product/ui/product";
import { Product as ProductType } from "@/components/entities/product";
import H2 from "../typography/H2";
import Descriptor from "../typography/Descriptor";

interface ProductSliderProps {
  title: string;
  products: ProductType[];
  showViewAll?: boolean;
  viewAllLink?: string;
  viewAllText?: string;
}

const ProductSlider = ({
  title,
  products,
  showViewAll = true,
  viewAllLink = "/catalogue",
  viewAllText = "смотреть все",
}: ProductSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [currentX, setCurrentX] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);

  // 1. Считаем ширину одного элемента + gap
  useEffect(() => {
    const calculateItemWidth = () => {
      if (!innerRef.current) return;
      const first = innerRef.current.children[0] as HTMLElement;
      if (!first) return;

      const rect = first.getBoundingClientRect();
      const style = getComputedStyle(innerRef.current);
      const gap = parseFloat(style.gap) || 0;
      setItemWidth(rect.width + gap);
    };

    calculateItemWidth();
    window.addEventListener("resize", calculateItemWidth);
    return () => window.removeEventListener("resize", calculateItemWidth);
  }, [products]);

  // 2. Сдвиг ровно на один элемент, с нормальным ограничением
  const slideBy = (dir: number) => {
    if (!sliderRef.current || !itemWidth) return;

    const offset = dir * itemWidth;
    const containerWidth = sliderRef.current.offsetWidth;
    const totalWidth = itemWidth * products.length;

    // максимум (отрицательное число или 0), если элементов в ряд меньше, чем в контейнере
    const maxOffset = Math.min(0, containerWidth - totalWidth);

    const targetX = currentX - offset;
    // clamp между [maxOffset, 0]
    const newX = Math.max(Math.min(targetX, 0), maxOffset);

    setCurrentX(newX);
    controls.start(
      { x: newX },
      {
        type: "spring",
        stiffness: 120,
        damping: 20,
      }
    );
  };

  // Показывать кнопки только если есть что прокручивать
  const showControls = products.length > 4; // или другая логика

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between items-end">
        <div className="flex gap-4 items-end">
          <H2>{title}</H2>
          {showViewAll && (
            <Link href={viewAllLink}>
              <Descriptor className="underline hidden sm:block">
                {viewAllText}
              </Descriptor>
            </Link>
          )}
        </div>
        {showControls && (
          <div className="flex gap-3">
            <button
              onClick={() => slideBy(-1)}
              className="cursor-pointer hover:scale-[1.05] active:scale-[0.95] transition-all bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft strokeWidth={3} />
            </button>
            <button
              onClick={() => slideBy(1)}
              className="cursor-pointer hover:scale-[1.05] active:scale-[0.95] transition-all bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center"
            >
              <ArrowRight strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      <div ref={sliderRef} className="overflow-hidden">
        <motion.div
          ref={innerRef}
          className="flex gap-2"
          animate={controls}
          style={{ x: currentX }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="
                flex-none 
                w-[calc(50%-0.5rem)] 
                md:w-[calc(33.333%-0.5rem)] 
                xl:w-[calc(25%-0.5rem)]
              "
            >
              <Product product={product} />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default ProductSlider;
