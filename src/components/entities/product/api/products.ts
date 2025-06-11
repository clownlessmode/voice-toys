import { Product } from "../model/types";

export interface GetProductsParams {
  search?: string;
  type?: string;
  age?: string;
  limit?: number;
  page?: number;
  favorite?: boolean;
}

export interface ProductsApiResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

// Получить все продукты с фильтрацией
export async function getProducts(
  params: GetProductsParams = {}
): Promise<ProductsApiResponse> {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set("search", params.search);
  if (params.type) searchParams.set("type", params.type);
  if (params.age) searchParams.set("age", params.age);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.favorite) searchParams.set("favorite", "true");

  const response = await fetch(`/api/products?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Ошибка при загрузке продуктов");
  }

  return response.json();
}

// Получить продукт по ID
export async function getProductById(id: string): Promise<Product> {
  const response = await fetch(`/api/products/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Продукт не найден");
    }
    throw new Error("Ошибка при загрузке продукта");
  }

  return response.json();
}

// Обновить статус избранного
export async function updateProductFavorite(
  id: string,
  favorite: boolean
): Promise<Product> {
  const response = await fetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ favorite }),
  });

  if (!response.ok) {
    throw new Error("Ошибка при обновлении продукта");
  }

  return response.json();
}

// Получить продукты по категории
export async function getProductsByCategory(type: string): Promise<Product[]> {
  const response = await getProducts({ type });
  return response.products;
}

// Получить продукты по возрасту
export async function getProductsByAge(age: string): Promise<Product[]> {
  const response = await getProducts({ age });
  return response.products;
}

// Получить избранные продукты
export async function getFavoriteProducts(): Promise<Product[]> {
  const response = await getProducts({ favorite: true });
  return response.products;
}
