/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import H1 from "@/components/ui/typography/H1";
import H3 from "@/components/ui/typography/H3";
import Footer from "@/components/widgets/Footer";
import Header from "@/components/widgets/Header";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import React, { Suspense, useState } from "react";
import { CartItem } from "../cart/cart-item";
import { useCart } from "../cart/use-cart";

const PageContent = () => {
  const { items, totalPrice } = useCart();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    pickupPoint: "",
    payment: "cash",
    comment: "",
    agreement: true,
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    return formData;
  };

  const handleChange = (field: any, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
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
        className="flex flex-col gap-[48px] px-[12px] py-[24px] bg-background rounded-lg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <H1>Оформление заказа</H1>
        </motion.div>

        <motion.div
          className="flex flex-col gap-[32px]"
          variants={itemVariants}
        >
          <H3>Ваш заказ</H3>
          <div className="h-px bg-black/5 w-full"></div>
          <div className="flex flex-col gap-[24px]">
            {items.map((item, index) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                  delay: index * 0.1,
                }}
              >
                <CartItem
                  className="bg-[rgba(32,32,32,0.03)]! rounded-2xl!"
                  item={item}
                />
              </motion.div>
            ))}
          </div>
          <div className="h-px bg-black/5 w-full"></div>
          <motion.div
            className="flex flex-row justify-between"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <H3>Итого:</H3>
            <H3>{totalPrice}₽</H3>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <H3 className="mt-[48px]">Ваш заказ</H3>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="flex flex-col gap-[32px]"
          variants={itemVariants}
        >
          {/* Имя */}
          <motion.div
            className="flex flex-col gap-[8px]"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <label className="text-sm font-medium">Имя</label>
            <motion.input
              type="text"
              placeholder="Имя"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="px-[16px] py-[12px] bg-[rgba(32,32,32,0.03)] rounded-lg border-none outline-none placeholder:text-gray-400 transition-all duration-200 focus:bg-[rgba(32,32,32,0.06)] focus:scale-[1.01]"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.div>

          {/* Телефон */}
          <motion.div
            className="flex flex-col gap-[8px]"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <label className="text-sm font-medium">Телефон</label>
            <motion.input
              type="tel"
              placeholder="+7 (999) 123 12 12"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="px-[16px] py-[12px] bg-[rgba(32,32,32,0.03)] rounded-lg border-none outline-none placeholder:text-gray-400 transition-all duration-200 focus:bg-[rgba(32,32,32,0.06)] focus:scale-[1.01]"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.div>

          {/* E-mail */}
          <motion.div
            className="flex flex-col gap-[8px]"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <label className="text-sm font-medium">E-mail</label>
            <motion.input
              type="email"
              placeholder="e-mail@mail.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="px-[16px] py-[12px] bg-[rgba(32,32,32,0.03)] rounded-lg border-none outline-none placeholder:text-gray-400 transition-all duration-200 focus:bg-[rgba(32,32,32,0.06)] focus:scale-[1.01]"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.div>

          {/* Доставка */}
          <motion.div
            className="flex flex-col gap-[16px]"
            variants={itemVariants}
          >
            <H3>Доставка</H3>

            <motion.div
              className="flex flex-col gap-[8px]"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <motion.select
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="px-[16px] py-[12px] bg-[rgba(32,32,32,0.03)] rounded-lg border-none outline-none text-gray-600 transition-all duration-200 focus:bg-[rgba(32,32,32,0.06)] focus:scale-[1.01]"
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <option value="">Город</option>
                <option value="moscow">Москва</option>
                <option value="spb">Санкт-Петербург</option>
              </motion.select>
            </motion.div>

            <motion.div
              className="flex flex-col gap-[8px]"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <motion.select
                value={formData.pickupPoint}
                onChange={(e) => handleChange("pickupPoint", e.target.value)}
                className="px-[16px] py-[12px] bg-[rgba(32,32,32,0.03)] rounded-lg border-none outline-none text-gray-600 transition-all duration-200 focus:bg-[rgba(32,32,32,0.06)] focus:scale-[1.01]"
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <option value="">Пункт выдачи</option>
                <option value="point1">Пункт выдачи 1</option>
                <option value="point2">Пункт выдачи 2</option>
              </motion.select>
            </motion.div>
          </motion.div>

          {/* Оплата */}
          <motion.div
            className="flex flex-col gap-[16px]"
            variants={itemVariants}
          >
            <H3>Оплата</H3>

            <div className="flex flex-col gap-[12px]">
              <motion.label
                className="flex items-center gap-[12px] cursor-pointer"
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="relative">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={formData.payment === "cash"}
                    onChange={(e) => handleChange("payment", e.target.value)}
                    className="sr-only"
                  />
                  <motion.div
                    className={cn(
                      "w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition-all duration-200",
                      formData.payment === "cash"
                        ? "border-primary bg-primary"
                        : "border-gray-300 bg-white"
                    )}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {formData.payment === "cash" && (
                      <motion.div
                        className="w-[8px] h-[8px] bg-white rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                  </motion.div>
                </div>
                <span>При получении</span>
              </motion.label>

              <motion.label
                className="flex items-center gap-[12px] cursor-pointer"
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="relative">
                  <input
                    type="radio"
                    name="payment"
                    value="online"
                    checked={formData.payment === "online"}
                    onChange={(e) => handleChange("payment", e.target.value)}
                    className="sr-only"
                  />
                  <motion.div
                    className={cn(
                      "w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition-all duration-200",
                      formData.payment === "online"
                        ? "border-primary bg-primary"
                        : "border-gray-300 bg-white"
                    )}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {formData.payment === "online" && (
                      <motion.div
                        className="w-[8px] h-[8px] bg-white rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                  </motion.div>
                </div>
                <span>Онлайн оплата</span>
              </motion.label>
            </div>
          </motion.div>

          {/* Комментарий */}
          <motion.div
            className="flex flex-col gap-[8px]"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.textarea
              placeholder="Комментарий к заказу"
              value={formData.comment}
              onChange={(e) => handleChange("comment", e.target.value)}
              rows={4}
              className="px-[16px] py-[12px] bg-[rgba(32,32,32,0.03)] rounded-lg border-none outline-none placeholder:text-gray-400 resize-none transition-all duration-200 focus:bg-[rgba(32,32,32,0.06)] focus:scale-[1.01]"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.div>

          {/* Кнопка отправки */}
          <motion.button
            type="submit"
            className="px-[24px] py-[16px] bg-primary text-black font-medium rounded-lg transition-all duration-200"
            whileHover={{
              scale: 1.02,
              boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            Оформить заказ
          </motion.button>

          {/* Согласие */}
          <motion.label
            className="flex items-start gap-[12px] cursor-pointer"
            whileHover={{ scale: 1.01, x: 5 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="relative mt-[2px]">
              <input
                type="checkbox"
                checked={formData.agreement}
                onChange={(e) => handleChange("agreement", e.target.checked)}
                className="sr-only"
              />
              <motion.div
                className={cn(
                  "w-[20px] h-[20px] rounded border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
                  formData.agreement
                    ? "border-primary bg-primary"
                    : "border-gray-300 bg-white"
                )}
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {formData.agreement && (
                  <motion.svg
                    className="w-[12px] h-[12px] text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                )}
              </motion.div>
            </div>
            <span className="text-sm text-gray-600">
              Я согласен(а) с условиями доставки, политикой конфиденциальности
            </span>
          </motion.label>
        </motion.form>
      </motion.div>

      <Footer />
    </main>
  );
};
const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
};

export default Page;
