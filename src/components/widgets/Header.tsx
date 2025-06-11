"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logotype from "../ui/icons/Logotype";
import { Menu } from "../ui/icons/Menu";
import { Cart } from "../ui/icons/Cart";
import { Search } from "../ui/icons/Search";
import { Heart } from "../ui/icons/Heart";

import Navigation from "../ui/typography/Navigation";
import Link from "next/link";
import Sheet from "../ui/sheet";
import { X } from "lucide-react";
import SearchDropdown from "../ui/components/SearchDropdown";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const toggleSearch = () => setIsSearchOpen(!isSearchOpen);
  const closeSearch = () => setIsSearchOpen(false);

  const menuButtonVariants = {
    closed: {
      rotate: 0,
    },
    open: {
      rotate: 180,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  };

  const iconHoverVariants = {
    hover: {
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
    tap: {
      scale: 0.95,
    },
  };

  const navigationItemVariants = {
    hidden: {
      opacity: 0,
      x: -20,
    },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
  };

  const actionIconVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.4 + i * 0.1,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
  };

  const navigationItems = [
    { href: "/catalogue", label: "Каталог" },
    { href: "/faq", label: "Ответы на вопросы" },
    { href: "/about", label: "О нас" },
    { href: "/contacts", label: "Контакты" },
  ];

  const actionItems = [
    { icon: Heart, label: "Избранное", link: "/favorites" },
    { icon: Search, label: "Поиск", action: "search" },
    { icon: Cart, label: "Корзина", link: "/cart" },
  ];

  return (
    <>
      <motion.header
        className={cn(
          "py-[16px] px-[20px] rounded-b-[20px]",
          "xl:px-[50px]",
          "2xl:px-[100px]",
          "flex items-center justify-between w-full bg-background relative z-30"
        )}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: 0.1,
        }}
      >
        <div className="flex flex-row gap-[40px] items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link href="/">
              <Logotype />
            </Link>
          </motion.div>
          <div className="flex-row gap-[32px] hidden xl:flex">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Link href="/catalogue">
                <Navigation>Каталог</Navigation>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Link href="/faq">
                <Navigation>Ответы на вопросы</Navigation>
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="flex flex-row gap-[24px] items-center">
          <Link href="/favorites">
            <motion.div
              className="hidden sm:block"
              variants={iconHoverVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Heart className="size-[32px] cursor-pointer" />
            </motion.div>
          </Link>

          <motion.button
            onClick={toggleSearch}
            className="hidden sm:block"
            variants={iconHoverVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Search className="size-[32px] cursor-pointer" />
          </motion.button>

          <Link href="/cart">
            <motion.div
              className="hidden sm:block"
              variants={iconHoverVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Cart className="size-[32px] cursor-pointer" />
            </motion.div>
          </Link>

          <motion.button
            onClick={toggleMenu}
            className="xl:hidden"
            aria-label="Открыть меню"
            variants={menuButtonVariants}
            animate={isMenuOpen ? "open" : "closed"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Menu className="size-[32px]" />
          </motion.button>
        </div>
      </motion.header>

      {/* Search Dropdown */}
      <SearchDropdown isOpen={isSearchOpen} onClose={closeSearch} />

      {/* Mobile Menu Sheet */}
      <Sheet isOpen={isMenuOpen} onClose={closeMenu}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <motion.div
            className="flex items-center justify-between p-[20px] border-b"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Logotype />
            <motion.button
              onClick={closeMenu}
              className="p-2"
              aria-label="Закрыть меню"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <X className="size-[24px]" />
            </motion.button>
          </motion.div>

          {/* Navigation Links */}
          <nav className="flex-1 px-[20px] py-[24px]">
            <div className="flex flex-col gap-[24px]">
              <AnimatePresence>
                {isMenuOpen &&
                  navigationItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      custom={index}
                      variants={navigationItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      whileHover={{ x: 10 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 10,
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={closeMenu}
                        className="text-lg font-medium hover:text-primary transition-colors block"
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </nav>

          {/* Action Icons */}
          <motion.div
            className="px-[20px] py-[24px] border-t"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            <div className="flex flex-row gap-[24px] justify-center">
              <AnimatePresence>
                {isMenuOpen &&
                  actionItems.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <motion.div key={item.label}>
                        {item.action === "search" ? (
                          <motion.button
                            custom={index}
                            variants={actionIconVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            whileHover={{
                              scale: 1.1,
                              y: -5,
                              transition: {
                                type: "spring",
                                stiffness: 400,
                                damping: 10,
                              },
                            }}
                            whileTap={{ scale: 0.95 }}
                            className="flex flex-col items-center gap-2"
                            onClick={() => {
                              toggleSearch();
                              closeMenu();
                            }}
                          >
                            <IconComponent className="size-[32px]" />
                            <span className="text-sm">{item.label}</span>
                          </motion.button>
                        ) : (
                          <Link href={item.link!}>
                            <motion.button
                              custom={index}
                              variants={actionIconVariants}
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                              whileHover={{
                                scale: 1.1,
                                y: -5,
                                transition: {
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 10,
                                },
                              }}
                              whileTap={{ scale: 0.95 }}
                              className="flex flex-col items-center gap-2"
                            >
                              <IconComponent className="size-[32px]" />
                              <span className="text-sm">{item.label}</span>
                            </motion.button>
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </Sheet>
    </>
  );
};

export default Header;
