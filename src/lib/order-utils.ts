import { Order } from "@/components/entities/order/model/types";

// Генерация номера заказа
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${year}-${randomPart}`;
}

// Трансформация заказа из базы данных
export function transformOrderFromDB(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.orderNumber,
    status: dbOrder.status,
    customerName: dbOrder.customerName,
    customerPhone: dbOrder.customerPhone,
    customerEmail: dbOrder.customerEmail,
    deliveryType: dbOrder.deliveryType,
    deliveryAddress: dbOrder.deliveryAddress,
    totalAmount: dbOrder.totalAmount,
    currency: dbOrder.currency,
    items:
      dbOrder.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.product.id,
          name: item.product.name,
          images: JSON.parse(item.product.images),
        },
      })) || [],
    createdAt: dbOrder.createdAt.toISOString(),
    updatedAt: dbOrder.updatedAt.toISOString(),
    paidAt: dbOrder.paidAt?.toISOString(),
  };
}

// Валидация данных заказа
export function validateOrderData(data: {
  customerName?: string;
  customerPhone?: string;
  deliveryType?: string;
  deliveryAddress?: string;
  items?: Array<{ productId: string; quantity: number }>;
}): string[] {
  const errors: string[] = [];

  if (
    !data.customerName ||
    typeof data.customerName !== "string" ||
    data.customerName.trim().length === 0
  ) {
    errors.push("Имя покупателя обязательно");
  }

  if (
    !data.customerPhone ||
    typeof data.customerPhone !== "string" ||
    data.customerPhone.trim().length === 0
  ) {
    errors.push("Телефон покупателя обязателен");
  }

  if (data.customerEmail && typeof data.customerEmail !== "string") {
    errors.push("Email должен быть строкой");
  }

  if (
    !data.deliveryType ||
    !["pickup", "delivery"].includes(data.deliveryType)
  ) {
    errors.push("Тип доставки должен быть pickup или delivery");
  }

  if (
    data.deliveryType === "delivery" &&
    (!data.deliveryAddress || data.deliveryAddress.trim().length === 0)
  ) {
    errors.push("Адрес доставки обязателен для доставки");
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push("Заказ должен содержать хотя бы один товар");
  }

  if (data.items) {
    data.items.forEach((item: any, index: number) => {
      if (!item.productId || typeof item.productId !== "string") {
        errors.push(`Товар ${index + 1}: ID продукта обязателен`);
      }
      if (
        !item.quantity ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0
      ) {
        errors.push(
          `Товар ${index + 1}: Количество должно быть положительным числом`
        );
      }
    });
  }

  return errors;
}

// Подсчет общей суммы заказа
export function calculateOrderTotal(
  items: Array<{ price: number; quantity: number }>
): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

// Форматирование цены
export function formatPrice(amount: number, currency: string = "₽"): string {
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}

// Алиас для форматирования валюты
export const formatCurrency = formatPrice;

// Форматирование даты
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Алиас для форматирования даты заказа
export const formatOrderDate = formatDate;

// Получение цвета статуса
export function getStatusColor(status: string): string {
  switch (status) {
    case "CREATED":
      return "bg-yellow-100 text-yellow-800";
    case "PAID":
      return "bg-green-100 text-green-800";
    case "SHIPPED":
      return "bg-blue-100 text-blue-800";
    case "DELIVERED":
      return "bg-purple-100 text-purple-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Получение текста статуса
export function getStatusLabel(status: string): string {
  switch (status) {
    case "CREATED":
      return "Создан";
    case "PAID":
      return "Оплачен";
    case "SHIPPED":
      return "Отправлен";
    case "DELIVERED":
      return "Доставлен";
    case "CANCELLED":
      return "Отменен";
    default:
      return "Неизвестно";
  }
}
