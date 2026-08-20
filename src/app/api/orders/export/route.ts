import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-request";
import { prisma } from "@/lib/prisma";
import { transformOrderFromDB } from "@/lib/order-utils";
import {
  OrderStatus,
  OrderFilters,
  ORDER_STATUS_LABELS,
} from "@/components/entities/order/model/types";
import writeXlsxFile, { type SheetData } from "write-excel-file/node";

const MAX_EXPORT_LIMIT = 10000;
const EXCEL_FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;
const ORDER_STATUSES = new Set<OrderStatus>(
  Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
);

function parseExportLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return MAX_EXPORT_LIMIT;
  }

  return Math.min(parsed, MAX_EXPORT_LIMIT);
}

function parseOrderStatus(value: string | null): OrderStatus | undefined {
  if (!value) return undefined;

  return ORDER_STATUSES.has(value as OrderStatus)
    ? (value as OrderStatus)
    : undefined;
}

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function safeExcelText(value: unknown): string {
  const text = String(value ?? "");

  return EXCEL_FORMULA_PREFIX_PATTERN.test(text) ? `'${text}` : text;
}

// GET - Экспорт заказов в Excel
export async function GET(request: NextRequest) {
  try {
    const auth = await assertAdmin(request);
    if (auth) return auth;

    const { searchParams } = new URL(request.url);

    const filters: OrderFilters = {
      status: parseOrderStatus(searchParams.get("status")),
      search: searchParams.get("search") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      limit: parseExportLimit(searchParams.get("limit")),
    };

    // Построение условий фильтрации
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search } },
        { customerName: { contains: filters.search } },
        { customerPhone: { contains: filters.search } },
        { customerEmail: { contains: filters.search } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};

      const dateFrom = parseDateParam(filters.dateFrom);
      const dateTo = parseDateParam(filters.dateTo);

      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Получение всех заказов для экспорта
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit || 10000,
    });

    const transformedOrders = orders.map(transformOrderFromDB);

    // Подготовка данных для Excel
    const excelRows = transformedOrders.map((order) => {
      const itemsText = order.items
        .map(
          (item) =>
            `${safeExcelText(item.product.name)} x${item.quantity} (${item.price} ₽)`
        )
        .join("; ");

      return [
        safeExcelText(order.orderNumber),
        ORDER_STATUS_LABELS[order.status] || order.status,
        safeExcelText(order.customerName),
        safeExcelText(order.customerPhone),
        safeExcelText(order.customerEmail),
        safeExcelText(
          order.deliveryType === "pickup" ? "Самовывоз" : "Доставка"
        ),
        safeExcelText(order.deliveryAddress),
        safeExcelText(itemsText),
        order.items.length,
        safeExcelText(`${order.totalAmount} ${order.currency}`),
        new Date(order.createdAt).toLocaleDateString("ru-RU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        order.paidAt
          ? new Date(order.paidAt).toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      ];
    });

    const sheetData: SheetData = [
      [
        "Номер заказа",
        "Статус",
        "Имя клиента",
        "Телефон",
        "Email",
        "Тип доставки",
        "Адрес доставки",
        "Товары",
        "Количество товаров",
        "Общая сумма",
        "Дата создания",
        "Дата оплаты",
      ].map((value) => ({
        value,
        fontWeight: "bold",
        backgroundColor: "#F3F4F6",
        alignVertical: "center",
      })),
      ...excelRows,
    ];

    // Генерируем Excel файл
    const excelBuffer = await writeXlsxFile(sheetData, {
      sheet: "Заказы",
      columns: [
        { width: 15 }, // Номер заказа
        { width: 12 }, // Статус
        { width: 20 }, // Имя клиента
        { width: 15 }, // Телефон
        { width: 25 }, // Email
        { width: 12 }, // Тип доставки
        { width: 30 }, // Адрес доставки
        { width: 50 }, // Товары
        { width: 16 }, // Количество
        { width: 15 }, // Сумма
        { width: 20 }, // Дата создания
        { width: 20 }, // Дата оплаты
      ],
    }).toBuffer();

    // Формируем имя файла
    const fileName = `orders-${new Date().toISOString().split("T")[0]}.xlsx`;

    // Возвращаем файл
    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting orders:", error);
    return NextResponse.json(
      {
        error: "Failed to export orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
