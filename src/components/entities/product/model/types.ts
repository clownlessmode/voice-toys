export interface Product {
  id: string;
  name: string;
  breadcrumbs: string[];
  images: string[];
  price: Price;
  favorite: boolean;
  availability: Availability;
  returnPolicy: ReturnPolicy;
  description: string;
  characteristics: Characteristic[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Price {
  current: number;
  old?: number;
  discountPercent?: number;
  currency: string;
}

export interface Availability {
  pickup: string;
  delivery: string;
}

export interface ReturnPolicy {
  days: number;
  details: string;
}

export interface Characteristic {
  key: string;
  value: string;
}

export interface CreateProductRequest {
  name: string;
  breadcrumbs: string[];
  images: string[];
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  currency?: string;
  favorite?: boolean;
  pickupAvailability: string;
  deliveryAvailability: string;
  returnDays?: number;
  returnDetails: string;
  description: string;
  characteristics: Characteristic[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page?: number;
  limit?: number;
}
