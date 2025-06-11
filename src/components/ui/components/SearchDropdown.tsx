// components/ui/components/SearchDropdown.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({ isOpen, onClose }) => {
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Инициализация значения из URL
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchValue(decodeURIComponent(searchParam));
    }
  }, [searchParams]);

  // Фокус на input при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set("search", encodeURIComponent(value.trim()));
    } else {
      params.delete("search");
    }

    const newURL = params.toString()
      ? `/catalogue?${params.toString()}`
      : "/catalogue";

    router.push(newURL);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchValue);
  };

  const handleClear = () => {
    setSearchValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");

    const newURL = params.toString()
      ? `/catalogue?${params.toString()}`
      : "/catalogue";

    router.push(newURL);
  };

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Search Card */}
          <motion.div
            className={cn(
              "fixed top-[80px] left-1/2 -translate-x-1/2 z-50",
              "w-[90%] max-w-[500px]",
              "bg-white rounded-2xl shadow-xl border",
              "p-6"
            )}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Поиск товаров</h3>
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="size-5" />
                </motion.button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Введите название товара..."
                  className={cn(
                    "w-full pl-10 pr-10 py-3 border border-primary rounded-xl",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
                {searchValue && (
                  <motion.button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1  rounded-full transition-colors"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="size-4 text-gray-400" />
                  </motion.button>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button
                  type="submit"
                  className={cn(
                    "flex-1 py-3 px-6 bg-primary text-foreground rounded-xl",
                    "hover:bg-primary/90 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  disabled={!searchValue.trim()}
                  whileHover={{ scale: searchValue.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: searchValue.trim() ? 0.98 : 1 }}
                >
                  Найти
                </motion.button>
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border bg-primary rounded-xl hover:bg-gray-50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Отмена
                </motion.button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchDropdown;
