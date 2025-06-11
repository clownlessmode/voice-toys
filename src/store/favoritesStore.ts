// store/favoritesStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/components/entities/product";

interface FavoritesStore {
  favorites: Product[];

  // Действия
  addToFavorites: (product: Product) => void;
  removeFromFavorites: (productId: string) => void;
  toggleFavorite: (product: Product) => void;
  clearFavorites: () => void;

  // Геттеры
  isFavorite: (productId: string) => boolean;
  getFavoritesCount: () => number;
}

const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],

      addToFavorites: (product: Product) => {
        set((state) => {
          const isAlreadyFavorite = state.favorites.some(
            (fav) => fav.id === product.id
          );
          if (isAlreadyFavorite) return state;

          return {
            favorites: [...state.favorites, product],
          };
        });
      },

      removeFromFavorites: (productId: string) => {
        set((state) => ({
          favorites: state.favorites.filter((fav) => fav.id !== productId),
        }));
      },

      toggleFavorite: (product: Product) => {
        const { isFavorite, addToFavorites, removeFromFavorites } = get();

        if (isFavorite(product.id)) {
          removeFromFavorites(product.id);
        } else {
          addToFavorites(product);
        }
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },

      isFavorite: (productId: string) => {
        return get().favorites.some((fav) => fav.id === productId);
      },

      getFavoritesCount: () => {
        return get().favorites.length;
      },
    }),
    {
      name: "favorites-storage",
    }
  )
);

// Хук для удобного использования
export const useFavorites = () => {
  const {
    favorites,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    clearFavorites,
    isFavorite,
    getFavoritesCount,
  } = useFavoritesStore();

  return {
    favorites,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    clearFavorites,
    isFavorite,
    favoritesCount: getFavoritesCount(),
  };
};
