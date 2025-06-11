import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  transformOrderFromDB,
  validateOrderData,
  generateOrderNumber,
  calculateOrderTotal,
} from "@/lib/order-utils";
import {
  CreateOrderRequest,
  OrderFilters,
} from "@/components/entities/order/model/types";

// GET - Получение списка заказов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: OrderFilters = {
      status: (searchParams.get("status") as any) || undefined,
      search: searchParams.get("search") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
    };

    const skip = ((filters.page || 1) - 1) * (filters.limit || 10);

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

    // Получение заказов с пагинацией
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: filters.limit || 10,
      }),
      prisma.order.count({ where }),
    ]);

    const transformedOrders = orders.map(transformOrderFromDB);

    return NextResponse.json({
      orders: transformedOrders,
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Создание нового заказа
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();

    // Валидация данных
    const validationErrors = validateOrderData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Проверяем существование всех продуктов и получаем их цены
    const productIds = body.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 400 }
      );
    }

    // Создаем мапу цен продуктов
    const productPriceMap = new Map(
      products.map((product) => [product.id, product.price])
    );

    // Подготавливаем данные для создания заказа
    const orderItems = body.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: productPriceMap.get(item.productId) || 0,
    }));

    const totalAmount = calculateOrderTotal(orderItems);
    const orderNumber = generateOrderNumber();

    // Создаем заказ в транзакции
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        deliveryType: body.deliveryType,
        deliveryAddress: body.deliveryAddress,
        totalAmount,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const transformedOrder = transformOrderFromDB(order);

    return NextResponse.json(transformedOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      {
        error: "Failed to create order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
