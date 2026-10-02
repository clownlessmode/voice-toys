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
    deliveryCost: dbOrder.deliveryCost,
    ozonDeliveryPointId: dbOrder.ozonDeliveryPointId,
    ozonShipmentMethodId: dbOrder.ozonShipmentMethodId,
    ozonOrderNumber: dbOrder.ozonOrderNumber,
    ozonPostingNumber: dbOrder.ozonPostingNumber,
    ozonDeliveryStatus: dbOrder.ozonDeliveryStatus,
    ozonDeliveryError: dbOrder.ozonDeliveryError,
    ozonDeliveryCreatedAt: dbOrder.ozonDeliveryCreatedAt?.toISOString(),
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
export function validateOrderData(input: unknown): string[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ["Некорректные данные заказа"];
  }
  const data = input as Record<string, unknown>;
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
    typeof data.deliveryType !== "string" ||
    !["pickup", "ozon_pvz"].includes(data.deliveryType)
  ) {
    errors.push("Неверный тип доставки");
  }

  if (data.deliveryType === "ozon_pvz" &&
      (typeof data.ozonDeliveryPointId !== "number" || !Number.isSafeInteger(data.ozonDeliveryPointId) || data.ozonDeliveryPointId <= 0)) {
    errors.push("Выберите пункт выдачи Ozon");
  }
  if (data.deliveryType === "ozon_pvz" &&
      (typeof data.ozonShipmentMethodId !== "number" || !Number.isSafeInteger(data.ozonShipmentMethodId) || data.ozonShipmentMethodId <= 0)) {
    errors.push("Не выбран способ доставки Ozon");
  }
  if (data.paymentType !== undefined &&
      data.paymentType !== "online" && data.paymentType !== "cash_on_delivery") {
    errors.push("Неверный способ оплаты");
  }
  if (data.paymentType === "cash_on_delivery" && data.deliveryType !== "pickup") {
    errors.push("Оплата при получении доступна только при самовывозе");
  }
  if (data.promoCodeId != null && typeof data.promoCodeId !== "string") {
    errors.push("Неверный промокод");
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push("Заказ должен содержать хотя бы один товар");
  }

  if (Array.isArray(data.items)) {
    const productIds = new Set<string>();
    data.items.forEach((item: unknown, index: number) => {
      if (!item || typeof item !== "object") {
        errors.push(`Товар ${index + 1}: некорректные данные`);
        return;
      }
      const { productId, quantity } = item as Record<string, unknown>;
      if (!productId || typeof productId !== "string") {
        errors.push(`Товар ${index + 1}: ID продукта обязателен`);
      } else if (productIds.has(productId)) {
        errors.push(`Товар ${index + 1}: повторяющийся ID продукта`);
      } else {
        productIds.add(productId);
      }
      if (
        typeof quantity !== "number" ||
        !Number.isSafeInteger(quantity) || quantity <= 0
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
