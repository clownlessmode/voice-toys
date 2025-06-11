import Descriptor from "@/components/ui/typography/Descriptor";
import Price from "@/components/ui/typography/Price";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import React from "react";
import { useCart, CartItem as CartItemType } from "./use-cart";
import { useFavorites } from "@/store/favoritesStore";
import { cn } from "@/lib/utils";

interface Props {
  item: CartItemType;
  disabledDesc?: boolean;
  className?: string;
}

export const CartItem = ({ item, disabledDesc, className }: Props) => {
  const { updateQuantity, removeItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { product, quantity } = item;

  const handleIncrease = () => {
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    } else {
      removeItem(product.id);
    }
  };

  const handleRemove = () => {
    removeItem(product.id);
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product);
  };

  const isProductFavorite = isFavorite(product.id);
  const totalPrice = product.price.current * quantity;

  return (
    <div
      className={cn(
        className,
        "bg-white rounded-2xl p-[8px] grid grid-cols-4 h-fit w-full"
      )}
    >
      <div className="flex flex-col gap-[16px]">
        <Image
          className="aspect-square object-cover overflow-hidden rounded-2xl w-full h-fit"
          src={product.images[0]}
          alt={product.name}
          width={1200}
          height={1200}
        />
        <div className="flex flex-row justify-between items-center bg-primary rounded-lg p-[4px] lg:hidden">
          <button
            onClick={handleDecrease}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Minus size={16} />
          </button>
          <Descriptor>{quantity}</Descriptor>
          <button
            onClick={handleIncrease}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="flex flex-col justify-between col-span-3">
        <div className="py-[8px] pl-[12px]">
          <div className="flex items-center gap-2 mb-2">
            <Price>
              {totalPrice} {product.price.currency}
            </Price>
            {quantity > 1 && (
              <Descriptor className="text-gray-500">
                ({product.price.current} {product.price.currency} × {quantity})
              </Descriptor>
            )}
          </div>
          <h3 className="font-medium mb-1">{product.name}</h3>
          {!disabledDesc && (
            <Descriptor className="line-clamp-3">
              {product.description}
            </Descriptor>
          )}
        </div>
        <div className="flex flex-row justify-between pl-[12px] ">
          <div className="hidden flex-row justify-between items-center bg-primary rounded-lg p-[4px] lg:flex min-w-[120px]">
            <button
              onClick={handleDecrease}
              className="p-1 hover:bg-white/20 rounded"
            >
              <Minus size={16} />
            </button>
            <Descriptor>{quantity}</Descriptor>
            <button
              onClick={handleIncrease}
              className="p-1 hover:bg-white/20 rounded"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-row gap-[16px] w-full justify-end items-center pr-4">
            <button onClick={handleRemove}>
              <Trash2 size={18} />
            </button>
            <button onClick={handleToggleFavorite}>
              <Heart
                size={18}
                className={`${
                  isProductFavorite
                    ? "text-red-500 fill-red-500"
                    : "text-gray-400"
                } transition-colors duration-200`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
