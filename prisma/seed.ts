import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const singleProduct = {
  id: "225904711",
  name: "Бизиборд с часами",
  breadcrumbs: [
    "Главная",
    "Каталог",
    "Интерактивные игрушки",
    "Бизиборд с часами",
  ],
  images: [
    "https://placehold.co/600x400?text=Часы+Главное",
    "https://placehold.co/600x400?text=Часы+1",
    "https://placehold.co/600x400?text=Часы+2",
  ],
  price: 1790,
  oldPrice: 2190,
  discountPercent: 18,
  currency: "₽",
  favorite: false,
  pickupAvailability: "Самовывоз сегодня",
  deliveryAvailability: "Доставка от 1 дня",
  returnDays: 14,
  returnDetails:
    "Можно обменять или вернуть в течение 14 дней с момента покупки",
  description:
    "Бизиборд с часами — развивающая игрушка, помогающая ребёнку освоить понятие времени и моторику.",
  characteristics: [
    { key: "Артикул", value: "225904711" },
    { key: "Питание", value: "Пальчиковые батарейки" },
    { key: "Материал", value: "ABS-пластик" },
    { key: "Страна производства", value: "Китай" },
    { key: "Возраст", value: "1+" },
    { key: "Габариты", value: "15×15 см" },
  ],
  categories: ["Интерактивные игрушки", "Бизиборды"],
  ageGroups: ["1+", "2+", "3+"],
  videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // пример видео
};

async function main() {
  console.log("🧹 Очистка базы данных...");

  // Удаляем все данные в правильном порядке (с учетом foreign keys)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productCharacteristic.deleteMany();
  await prisma.product.deleteMany();

  console.log("✅ База данных очищена");

  console.log("📦 Создание одного товара...");

  // Создаем один товар
  const product = await prisma.product.create({
    data: {
      id: singleProduct.id,
      name: singleProduct.name,
      breadcrumbs: JSON.stringify(singleProduct.breadcrumbs),
      images: JSON.stringify(singleProduct.images),
      price: singleProduct.price,
      oldPrice: singleProduct.oldPrice,
      discountPercent: singleProduct.discountPercent,
      currency: singleProduct.currency,
      favorite: singleProduct.favorite,
      pickupAvailability: singleProduct.pickupAvailability,
      deliveryAvailability: singleProduct.deliveryAvailability,
      returnDays: singleProduct.returnDays,
      returnDetails: singleProduct.returnDetails,
      description: singleProduct.description,
      categories: JSON.stringify(singleProduct.categories),
      ageGroups: JSON.stringify(singleProduct.ageGroups),
      videoUrl: singleProduct.videoUrl, // добавляем видео
    },
  });

  // Создаем характеристики для товара
  for (const characteristic of singleProduct.characteristics) {
    await prisma.productCharacteristic.create({
      data: {
        productId: product.id,
        key: characteristic.key,
        value: characteristic.value,
      },
    });
  }

  console.log("✅ Товар создан:", product.name);
  console.log("🎉 База данных готова с одним товаром!");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при заполнении базы данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
