// Quick inspection script: find product by name and print images
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const query = process.argv.slice(2).join(" ") || "Бизиборд с часами";
    const products = await prisma.product.findMany({
      where: {
        AND: [
          { name: { contains: "Бизиборд" } },
          { name: { contains: "час" } },
        ],
      },
      take: 10,
    });

    if (products.length === 0) {
      console.log("Не найден продукт по запросу:", query);
      return;
    }

    for (const p of products) {
      let images = [];
      try {
        images = JSON.parse(p.images || "[]");
      } catch {}
      let breadcrumbs = [];
      try {
        breadcrumbs = JSON.parse(p.breadcrumbs || "[]");
      } catch {}
      console.log("—".repeat(60));
      console.log("ID:", p.id);
      console.log("Название:", p.name);
      console.log("Кол-во картинок:", images.length);
      console.log("Превью картинок:", images.slice(0, 5));
      console.log("Хлебные крошки:", breadcrumbs);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
