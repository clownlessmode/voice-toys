import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const testOrders = [
  {
    orderNumber: "2025-0001",
    status: "PAID",
    customerName: "Иван Петров",
    customerPhone: "+7 (999) 123-45-67",
    customerEmail: "ivan@example.com",
    deliveryType: "delivery",
    deliveryAddress: "г. Москва, ул. Ленина, д. 10, кв. 5",
    items: [
      { productId: "225904711", quantity: 1 }, // Бизиборд с часами
      { productId: "225904712", quantity: 2 }, // Второй продукт
    ],
  },
  {
    orderNumber: "2025-0002",
    status: "CREATED",
    customerName: "Мария Сидорова",
    customerPhone: "+7 (999) 987-65-43",
    customerEmail: "maria@example.com",
    deliveryType: "pickup",
    deliveryAddress: null,
    items: [
      { productId: "225904713", quantity: 1 }, // Третий продукт
    ],
  },
  {
    orderNumber: "2025-0003",
    status: "SHIPPED",
    customerName: "Алексей Козлов",
    customerPhone: "+7 (999) 555-44-33",
    customerEmail: null,
    deliveryType: "delivery",
    deliveryAddress: "г. СПб, пр. Невский, д. 100",
    items: [
      { productId: "225904714", quantity: 1 }, // Четвертый продукт
      { productId: "225904715", quantity: 1 }, // Пятый продукт
    ],
  },
  {
    orderNumber: "2025-0004",
    status: "PAID",
    customerName: "Елена Смирнова",
    customerPhone: "+7 (999) 777-88-99",
    customerEmail: "elena@example.com",
    deliveryType: "delivery",
    deliveryAddress: "г. Екатеринбург, ул. Мира, д. 25, кв. 12",
    items: [
      { productId: "225904716", quantity: 1 }, // Шестой продукт
      { productId: "225904706", quantity: 1 }, // Интерактивный бизиборд
    ],
  },
  {
    orderNumber: "2025-0005",
    status: "DELIVERED",
    customerName: "Дмитрий Новиков",
    customerPhone: "+7 (999) 111-22-33",
    customerEmail: "dmitry@example.com",
    deliveryType: "pickup",
    deliveryAddress: null,
    items: [
      { productId: "225904717", quantity: 1 }, // Седьмой продукт
    ],
  },
];

async function main() {
  console.log("🛒 Начинаем заполнение базы тестовыми заказами...");

  // Удаляем существующие заказы
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  console.log("🗑️ Очистили таблицы заказов");

  // Получаем все продукты для расчета цен
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });
  const productPriceMap = new Map(
    products.map((product) => [product.id, product.price])
  );

  // Создаем заказы
  for (const orderData of testOrders) {
    // Подсчитываем общую сумму заказа
    const totalAmount = orderData.items.reduce((sum, item) => {
      const price = productPriceMap.get(item.productId) || 0;
      return sum + price * item.quantity;
    }, 0);

    // Создаем заказ
    const order = await prisma.order.create({
      data: {
        orderNumber: orderData.orderNumber,
        status: orderData.status as any,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail,
        deliveryType: orderData.deliveryType,
        deliveryAddress: orderData.deliveryAddress,
        totalAmount,
        paidAt: ["PAID", "SHIPPED", "DELIVERED"].includes(orderData.status)
          ? new Date()
          : null,
        items: {
          create: orderData.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: productPriceMap.get(item.productId) || 0,
          })),
        },
      },
    });

    console.log(
      `✅ Создан заказ ${orderData.orderNumber} на сумму ${totalAmount} ₽`
    );
  }

  console.log(
    `🎉 Добавлено ${testOrders.length} тестовых заказов в базу данных`
  );
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при заполнении базы заказами:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
