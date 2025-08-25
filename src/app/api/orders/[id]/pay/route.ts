import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformOrderFromDB } from "@/lib/order-utils";
import { verifyCallback } from "@/lib/modulbank";
import { sendOrderNotification } from "@/lib/telegram";
import { fetchCdekToken } from "@/app/api/cdek/offices/route";
import { Order as PrismaOrder } from "@prisma/client";
import {
  DEFAULT_PRODUCT_WEIGHT_GRAMS,
  CDEK_SHIPMENT_POINT,
  CDEK_TARIFF_CODE,
  SENDER_ADDRESS,
  CDEK_API_URLS,
  CDEK_ENDPOINTS,
} from "@/lib/cdek-constants";
import {
  extractProductWeightFromJson,
  extractProductWeight,
  extractProductDimensionsFromJson,
  extractProductDimensions,
} from "@/lib/product-utils";

// Интерфейс для офиса СДЭК
interface CdekOffice {
  code: string;
  location: {
    address: string;
    fias_guid?: string;
    longitude?: number;
    latitude?: number;
  };
  type: string;
  work_time?: string;
  phones?: string[];
}

// Функция для получения офисов СДЭК
async function getCdekOffices(cityCode: number): Promise<CdekOffice[]> {
  const token = await fetchCdekToken();
  const response = await fetch(
    `${CDEK_API_URLS.production}/deliverypoints?city_code=${cityCode}&size=1000`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch CDEK offices: ${response.status}`);
  }

  return response.json();
}

// POST - Оплата заказа (webhook для платежной системы)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type");
    let callbackData: Record<string, string> = {};

    // Обработка разных типов запросов
    if (contentType?.includes("application/json")) {
      // JSON запрос от success страницы
      const jsonData = await request.json();
      console.log("📥 JSON payment data:", jsonData);

      if (jsonData.source === "success_page" && jsonData.transaction_id) {
        // Валидация данных от success страницы
        if (jsonData.state !== "COMPLETE") {
          return NextResponse.json(
            { error: "Payment not completed" },
            { status: 400 }
          );
        }
        // Для запросов от success страницы не проверяем подпись
        callbackData = jsonData;
      } else {
        return NextResponse.json(
          { error: "Invalid payment data" },
          { status: 400 }
        );
      }
    } else {
      // FormData запрос от Modulbank webhook
      const formData = await request.formData();

      // Преобразуем FormData в объект
      for (const [key, value] of formData.entries()) {
        callbackData[key] = value.toString();
      }

      console.log("📥 Form payment data:", callbackData);

      // Если есть данные callback от Modulbank, проверяем подпись
      if (Object.keys(callbackData).length > 0 && callbackData.signature) {
        const isValidSignature = verifyCallback(callbackData);

        if (!isValidSignature) {
          console.error("Invalid Modulbank callback signature", callbackData);
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
          );
        }

        // Проверяем статус платежа от Modulbank
        if (callbackData.state !== "COMPLETE") {
          console.log("Payment not completed", callbackData);
          return NextResponse.json(
            { error: "Payment not completed" },
            { status: 400 }
          );
        }
      }
    }

    // Проверяем существование заказа
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                characteristics: true,
              },
            },
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Проверяем, что заказ еще не оплачен
    if (existingOrder.status === "PAID") {
      return NextResponse.json(
        { error: "Order is already paid" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ не отменен
    if (existingOrder.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot pay for cancelled order" },
        { status: 400 }
      );
    }

    // Обновляем статус на оплачен
    const paidOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                characteristics: true,
              },
            },
          },
        },
      },
    });

    const transformedOrder = transformOrderFromDB(paidOrder);

    // Отправляем уведомление в Telegram
    try {
      await sendOrderNotification(transformedOrder, "paid");
      console.log("✅ Telegram notification sent successfully");

      if (
        transformedOrder.deliveryType === "delivery" &&
        transformedOrder.deliveryAddress
      ) {
        console.log("🚚 Preparing CDEK order for delivery...");
        const cdekData = await prepareCdekData(paidOrder);
        console.log(
          "📦 CDEK data prepared:",
          JSON.stringify(cdekData, null, 2)
        );

        const response = await registerCdekOrder(cdekData);
        console.log("📋 CDEK order registration response:", response);

        if (response.success) {
          console.log("✅ CDEK order registered successfully:", response.order);
        } else {
          console.error("❌ Failed to register CDEK order:", response.error);
        }
      } else {
        console.log(
          "ℹ️ Skipping CDEK registration - not a delivery order or missing address"
        );
      }
    } catch (error) {
      console.error(
        "❌ Error sending Telegram notification or registering CDEK order:",
        error
      );
      // Не блокируем обработку платежа из-за ошибки уведомления
    }

    return NextResponse.json({
      success: true,
      message: "Order paid successfully",
      order: transformedOrder,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      {
        error: "Failed to process payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

interface CdekResponse {
  // Define according to CDEK's API response
  order_id: string;
  // Add other relevant fields
}

interface CdekOrderData {
  recipient: {
    name: string;
    phones: Array<{ number: string }>;
  };
  shipment_point: string;
  delivery_point: string;
  tariff_code: number;
  packages: Array<{
    number: string;
    weight: number;
    items: Array<{
      name: string;
      ware_key: string;
      cost: number;
      weight: number;
      amount: number;
      payment: {
        value: number;
      };
    }>;
  }>;
  delivery_recipient_cost: {
    value: number;
  };
}

export async function registerCdekOrder(
  data: CdekOrderData
): Promise<
  { success: true; order: CdekResponse } | { success: false; error: string }
> {
  const token = await fetchCdekToken();
  try {
    // Determine the environment
    const isProduction = true;
    const url = isProduction
      ? `${CDEK_API_URLS.production}${CDEK_ENDPOINTS.orders}`
      : `${CDEK_API_URLS.test}${CDEK_ENDPOINTS.orders}`;

    console.log("📤 Sending CDEK order to:", url);
    console.log("📦 CDEK order data:", JSON.stringify(data, null, 2));

    // Make the API call
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    console.log("📥 CDEK response status:", response.status);
    console.log(
      "📥 CDEK response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log("📥 CDEK response body:", responseText);

    if (!response.ok) {
      console.error("❌ CDEK API error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      return {
        success: false,
        error: `CDEK API error: ${response.status} ${response.statusText} - ${responseText}`,
      };
    }

    const responseData = JSON.parse(responseText) as CdekResponse;
    console.log("✅ CDEK order created successfully:", responseData);

    return { success: true, order: responseData };
  } catch (error) {
    // Log error securely
    console.error("CDEK order registration error:", {
      timestamp: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: "Unable to process CDEK order registration",
    };
  }
}

export async function calculateDeliveryPrice(cityCode: number, weight: number) {
  const token = await fetchCdekToken();
  const url = `${CDEK_API_URLS.production}${CDEK_ENDPOINTS.calculator}`;
  const data = {
    tariff_code: CDEK_TARIFF_CODE,
    from_location: {
      address: SENDER_ADDRESS,
    },
    to_location: {
      code: cityCode,
    },
    packages: [
      {
        weight: weight,
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const { total_sum } = await response.json();
  return Number(total_sum);
}

export async function prepareCdekData(
  order: PrismaOrder & {
    items: Array<{
      product: {
        id: string;
        name: string;
        characteristics?: string | Array<{ key: string; value: string }>; // Характеристики могут быть массивом объектов или JSON строкой
      };
      quantity: number;
      price: number;
    }>;
  }
) {
  const phoneNumber = order.customerPhone.replace(/\D/g, "").slice(-10);
  console.log("Preparing CDEK data for order:", order);

  // Получаем офисы СДЭК для города
  const cityCode = Number(order.deliveryAddress);
  console.log("🏪 Getting CDEK offices for city code:", cityCode);

  const offices = await getCdekOffices(cityCode);
  console.log("🏪 Found CDEK offices:", offices.length);

  if (offices.length === 0) {
    throw new Error(`No CDEK offices found for city code: ${cityCode}`);
  }

  // Выбираем первый доступный офис
  const selectedOffice = offices[0];
  console.log("🏪 Selected office:", {
    code: selectedOffice.code,
    address: selectedOffice.location.address,
    type: selectedOffice.type,
  });

  // Подготавливаем товары для СДЭК с реальным весом и габаритами
  const cdekItems = order.items.map((item) => {
    // Извлекаем вес из характеристик продукта (в граммах)
    let productWeightGrams = DEFAULT_PRODUCT_WEIGHT_GRAMS;
    let productDimensions = {
      width: 35,
      height: 35,
      length: 35,
    };

    console.log("🔍 Debug characteristics:", {
      type: typeof item.product.characteristics,
      isArray: Array.isArray(item.product.characteristics),
      value: item.product.characteristics,
    });

    if (item.product.characteristics) {
      if (typeof item.product.characteristics === "string") {
        // Если характеристики в виде JSON строки
        console.log("📋 Processing as JSON string");
        productWeightGrams = extractProductWeightFromJson(
          item.product.characteristics
        );
        productDimensions = extractProductDimensionsFromJson(
          item.product.characteristics
        );
      } else if (Array.isArray(item.product.characteristics)) {
        // Если характеристики в виде массива объектов
        console.log("📋 Processing as array");
        productWeightGrams = extractProductWeight(item.product.characteristics);
        productDimensions = extractProductDimensions(
          item.product.characteristics
        );
      } else {
        console.log("⚠️ Unknown characteristics format");
      }
    } else {
      console.log(
        "⚠️ No characteristics found, using default weight and dimensions"
      );
    }

    console.log(
      `📦 Product ${item.product.name}: weight = ${productWeightGrams}g, dimensions = ${productDimensions.width}x${productDimensions.height}x${productDimensions.length}cm`
    );

    // Создаем артикул с датой/временем для dev режима
    const isDev = process.env.NODE_ENV === "development";
    const wareKey = isDev
      ? `${item.product.id}_${new Date().toISOString().replace(/[:.]/g, "-")}`
      : item.product.id;

    return {
      name: item.product.name,
      ware_key: wareKey, // Артикул с датой/временем в dev режиме
      cost: Math.max(item.price, 1), // Стоимость товара
      weight: productWeightGrams, // Реальный вес в граммах для СДЭК API
      amount: Math.max(item.quantity, 1), // Количество
      payment: {
        value: 0, // Товар оплачен, доставка оплачивается отдельно
      },
    };
  });

  // Вычисляем общие габариты упаковки (берем максимальные размеры)
  const maxDimensions = order.items.reduce(
    (max, item) => {
      const itemDimensions = item.product.characteristics
        ? typeof item.product.characteristics === "string"
          ? extractProductDimensionsFromJson(item.product.characteristics)
          : extractProductDimensions(item.product.characteristics)
        : { width: 35, height: 35, length: 35 };

      return {
        width: Math.max(max.width, itemDimensions.width),
        height: Math.max(max.height, itemDimensions.height),
        length: Math.max(max.length, itemDimensions.length),
      };
    },
    { width: 35, height: 35, length: 35 }
  );

  console.log(
    `📦 Package dimensions: ${maxDimensions.width}x${maxDimensions.height}x${maxDimensions.length}cm`
  );

  // Рассчитываем общий вес заказа (в граммах)
  const totalWeightGrams = cdekItems.reduce((weight: number, item) => {
    return weight + item.weight * item.amount; // Вес уже в граммах
  }, 0);

  console.log(`📦 Total order weight: ${totalWeightGrams}g`);

  // Рассчитываем стоимость доставки (используем вес в граммах для калькулятора)
  const deliveryPrice = await calculateDeliveryPrice(
    cityCode,
    totalWeightGrams
  );

  return {
    recipient: {
      name: order.customerName,
      phones: [{ number: "+7" + phoneNumber }],
    },
    shipment_point: CDEK_SHIPMENT_POINT, // Код пункта отправления
    delivery_point: selectedOffice.code, // Код офиса доставки
    tariff_code: CDEK_TARIFF_CODE, // Код тарифа СДЭК
    packages: [
      {
        number: order.orderNumber, // Номер заказа
        weight: totalWeightGrams, // Общий вес в граммах для СДЭК API
        length: maxDimensions.length, // Длина упаковки в см
        width: maxDimensions.width, // Ширина упаковки в см
        height: maxDimensions.height, // Высота упаковки в см
        items: cdekItems,
      },
    ],
    delivery_recipient_cost: {
      value: deliveryPrice, // Стоимость доставки
    },
  };
}
