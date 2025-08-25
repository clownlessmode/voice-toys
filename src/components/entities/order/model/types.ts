export type OrderStatus =
  | "CREATED"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    images: string[];
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: string;
  deliveryAddress?: string;
  totalAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  promoCodeId?: string;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface CreateOrderRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType: "pickup" | "delivery";
  deliveryAddress?: string;
  originalAmount?: number;
  discountAmount?: number;
  promoCodeId?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Создан",
  PAID: "Оплачен",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменен",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};
