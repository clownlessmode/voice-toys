import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformOrderFromDB } from "@/lib/order-utils";
import {
  OrderFilters,
  ORDER_STATUS_LABELS,
} from "@/components/entities/order/model/types";
import * as XLSX from "xlsx";

// GET - Экспорт заказов в Excel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: OrderFilters = {
      status: (searchParams.get("status") as any) || undefined,
      search: searchParams.get("search") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      limit: parseInt(searchParams.get("limit") || "10000"),
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
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
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
    const excelData = transformedOrders.map((order) => {
      const itemsText = order.items
        .map(
          (item) => `${item.product.name} x${item.quantity} (${item.price} ₽)`
        )
        .join("; ");

      return {
        "Номер заказа": order.orderNumber,
        Статус: ORDER_STATUS_LABELS[order.status] || order.status,
        "Имя клиента": order.customerName,
        Телефон: order.customerPhone,
        Email: order.customerEmail || "",
        "Тип доставки":
          order.deliveryType === "pickup" ? "Самовывоз" : "Доставка",
        "Адрес доставки": order.deliveryAddress || "",
        Товары: itemsText,
        "Количество товаров": order.items.length,
        "Общая сумма": `${order.totalAmount} ${order.currency}`,
        "Дата создания": new Date(order.createdAt).toLocaleDateString("ru-RU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "Дата оплаты": order.paidAt
          ? new Date(order.paidAt).toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      };
    });

    // Создание workbook и worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Настройка ширины колонок
    const colWidths = [
      { wch: 15 }, // Номер заказа
      { wch: 12 }, // Статус
      { wch: 20 }, // Имя клиента
      { wch: 15 }, // Телефон
      { wch: 25 }, // Email
      { wch: 12 }, // Тип доставки
      { wch: 30 }, // Адрес доставки
      { wch: 50 }, // Товары
      { wch: 8 }, // Количество
      { wch: 15 }, // Сумма
      { wch: 20 }, // Дата создания
      { wch: 20 }, // Дата оплаты
    ];
    ws["!cols"] = colWidths;

    // Добавляем worksheet в workbook
    XLSX.utils.book_append_sheet(wb, ws, "Заказы");

    // Генерируем Excel файл
    const excelBuffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Формируем имя файла
    const fileName = `orders-${new Date().toISOString().split("T")[0]}.xlsx`;

    // Возвращаем файл
    return new NextResponse(excelBuffer, {
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
