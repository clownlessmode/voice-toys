import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
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
  },
  {
    id: "225904712",
    name: "Бизиборд с замками",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд с замками",
    ],
    images: [
      "https://placehold.co/600x400?text=Замки+Главное",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
    ],
    price: 1890,
    oldPrice: 2490,
    discountPercent: 24,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Бизиборд с замками развивает мелкую моторику и учит ребёнка безопасно открывать и закрывать различные механизмы.",
    characteristics: [
      { key: "Артикул", value: "225904712" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "1+" },
      { key: "Габариты", value: "20×20 см" },
    ],
  },
  {
    id: "225904713",
    name: "Бизиборд с шестерёнками продвинутый",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд с шестерёнками продвинутый",
    ],
    images: [
      "https://placehold.co/600x400?text=Шестерёнки+Главное",
      "https://placehold.co/600x400?text=Шестерёнки+1",
      "https://placehold.co/600x400?text=Шестерёнки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
    ],
    price: 2290,
    oldPrice: null,
    discountPercent: null,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Продвинутый бизиборд со множеством шестерёнок для изучения принципов механики и развития координации движений.",
    characteristics: [
      { key: "Артикул", value: "225904713" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "2+" },
      { key: "Габариты", value: "18×18 см" },
    ],
  },
  {
    id: "225904714",
    name: "Бизиборд-лабиринт",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд-лабиринт",
    ],
    images: [
      "https://placehold.co/600x400?text=Лабиринт+Главное",
      "https://placehold.co/600x400?text=Лабиринт+1",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
    ],
    price: 1990,
    oldPrice: 2090,
    discountPercent: 4,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Бизиборд-лабиринт с подвижными шариками развивает логику и мелкую моторику.",
    characteristics: [
      { key: "Артикул", value: "225904714" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "1+" },
      { key: "Габариты", value: "14×14 см" },
    ],
  },
  {
    id: "225904715",
    name: "Бизиборд в форме сердца",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд в форме сердца",
    ],
    images: [
      "https://placehold.co/600x400?text=Сердце+Главное",
      "https://placehold.co/600x400?text=Сердце+1",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
      "https://placehold.co/600x400?text=Замки+1",
      "https://placehold.co/600x400?text=Замки+2",
    ],
    price: 1590,
    oldPrice: null,
    discountPercent: null,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Нежный бизиборд в форме сердца с разнообразными застёжками и шестерёнками для малышей.",
    characteristics: [
      { key: "Артикул", value: "225904715" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "0+" },
      { key: "Габариты", value: "16×13 см" },
    ],
  },
  {
    id: "225904716",
    name: "Бизиборд с дверцей",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд с дверцей",
    ],
    images: [
      "https://placehold.co/600x400?text=Дверца+Главное",
      "https://placehold.co/600x400?text=Дверца+1",
      "https://placehold.co/600x400?text=Дверца+2",
    ],
    price: 1750,
    oldPrice: 2000,
    discountPercent: 12,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Бизиборд с открывающейся дверцей и замочком для развития мелкой моторики и координации.",
    characteristics: [
      { key: "Артикул", value: "225904716" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "1+" },
      { key: "Габариты", value: "17×17 см" },
    ],
  },
  {
    id: "225904717",
    name: "Бизиборд с колесиком",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд с колесиком",
    ],
    images: [
      "https://placehold.co/600x400?text=Колесико+Главное",
      "https://placehold.co/600x400?text=Колесико+1",
    ],
    price: 1950,
    oldPrice: null,
    discountPercent: null,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Бизиборд с вращающимся колесиком для изучения причинно-следственных связей и моторики.",
    characteristics: [
      { key: "Артикул", value: "225904717" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "1+" },
      { key: "Габариты", value: "18×15 см" },
    ],
  },
  {
    id: "225904718",
    name: "Бизиборд с кнопками",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд с кнопками",
    ],
    images: [
      "https://placehold.co/600x400?text=Кнопки+Главное",
      "https://placehold.co/600x400?text=Кнопки+1",
      "https://placehold.co/600x400?text=Кнопки+2",
    ],
    price: 1650,
    oldPrice: 1850,
    discountPercent: 11,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Бизиборд с большими яркими кнопками, которые щелкают и возвращаются обратно, развивая пальчиковую моторику.",
    characteristics: [
      { key: "Артикул", value: "225904718" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "0+" },
      { key: "Габариты", value: "15×15 см" },
    ],
  },
  {
    id: "225904719",
    name: "Бизиборд с интерактивными элементами",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд с интерактивными элементами",
    ],
    images: [
      "https://placehold.co/600x400?text=Интерактивные+Главное",
      "https://placehold.co/600x400?text=Интерактивные+1",
    ],
    price: 2490,
    oldPrice: null,
    discountPercent: null,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Комплексный бизиборд с кнопками, шестерёнками и замочками — максимальный набор для развития навыков.",
    characteristics: [
      { key: "Артикул", value: "225904719" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "2+" },
      { key: "Габариты", value: "19×19 см" },
    ],
  },
  {
    id: "225904720",
    name: "Мини-бизиборд с фигурками",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Мини-бизиборд с фигурками",
    ],
    images: [
      "https://placehold.co/600x400?text=Мини+Главное",
      "https://placehold.co/600x400?text=Мини+1",
    ],
    price: 1390,
    oldPrice: null,
    discountPercent: null,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Компактный мини-бизиборд с небольшими фигурками, удобно брать с собой в дорогу.",
    characteristics: [
      { key: "Артикул", value: "225904720" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "0+" },
      { key: "Габариты", value: "12×12 см" },
    ],
  },
  {
    id: "225904706",
    name: "Интерактивный бизиборд",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Интерактивный бизиборд",
    ],
    images: [
      "https://placehold.co/600x400?text=Главное+изображение",
      "https://placehold.co/600x400?text=Изображение+1",
      "https://placehold.co/600x400?text=Изображение+2",
      "https://placehold.co/600x400?text=Изображение+3",
    ],
    price: 1560,
    oldPrice: 2360,
    discountPercent: 56,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Интерактивный бизиборд – многофункциональная игрушка для детей младшего возраста. Развивающий центр подходит мальчикам и девочкам в возрасте от 0+ месяцев до 3 лет.",
    characteristics: [
      { key: "Артикул", value: "225904706" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "0+" },
      { key: "Габариты", value: "13×16 см" },
    ],
  },
  {
    id: "225904709",
    name: "Бизиборд с зеркалом",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд с зеркалом",
    ],
    images: [
      "https://placehold.co/600x400?text=Зеркало+Главное",
      "https://placehold.co/600x400?text=Зеркало+1",
    ],
    price: 1420,
    oldPrice: 1980,
    discountPercent: 28,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Бизиборд с зеркалом – развивающая игрушка с безопасным зеркальным элементом для малышей от 0+ до 3 лет.",
    characteristics: [
      { key: "Артикул", value: "225904709" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "0+" },
      { key: "Габариты", value: "13×16 см" },
    ],
  },
  {
    id: "225904710",
    name: "Бизиборд в форме кубика",
    breadcrumbs: [
      "Главная",
      "Каталог",
      "Интерактивные игрушки",
      "Бизиборд в форме кубика",
    ],
    images: [
      "https://placehold.co/600x400?text=Кубик+Главное",
      "https://placehold.co/600x400?text=Кубик+1",
      "https://placehold.co/600x400?text=Кубик+2",
    ],
    price: 1990,
    oldPrice: null,
    discountPercent: null,
    currency: "₽",
    favorite: false,
    pickupAvailability: "Самовывоз сегодня",
    deliveryAvailability: "Доставка от 1 дня",
    returnDays: 14,
    returnDetails:
      "Можно обменять или вернуть в течение 14 дней с момента покупки",
    description:
      "Бизиборд в форме кубика – компактный развивающий набор с различными элементами для тактильного и визуального развития ребёнка.",
    characteristics: [
      { key: "Артикул", value: "225904710" },
      { key: "Питание", value: "Пальчиковые батарейки" },
      { key: "Материал", value: "ABS-пластик" },
      { key: "Страна производства", value: "Китай" },
      { key: "Возраст", value: "0+" },
      { key: "Габариты", value: "13×16 см" },
    ],
  },
];

async function main() {
  console.log("🌱 Начинаем заполнение базы данных...");

  // Удаляем все существующие продукты
  await prisma.productCharacteristic.deleteMany({});
  await prisma.product.deleteMany({});

  console.log("🗑️ Очистили базу данных");

  // Добавляем продукты
  for (const productData of products) {
    await prisma.product.create({
      data: {
        id: productData.id,
        name: productData.name,
        breadcrumbs: JSON.stringify(productData.breadcrumbs),
        images: JSON.stringify(productData.images),
        price: productData.price,
        oldPrice: productData.oldPrice,
        discountPercent: productData.discountPercent,
        currency: productData.currency,
        favorite: productData.favorite,
        pickupAvailability: productData.pickupAvailability,
        deliveryAvailability: productData.deliveryAvailability,
        returnDays: productData.returnDays,
        returnDetails: productData.returnDetails,
        description: productData.description,
        characteristics: {
          create: productData.characteristics.map((char) => ({
            key: char.key,
            value: char.value,
          })),
        },
      },
    });
  }

  console.log(`✅ Добавлено ${products.length} продуктов в базу данных`);
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при заполнении базы данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
