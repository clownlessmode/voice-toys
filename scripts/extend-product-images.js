// Extend images to a target count following existing pattern
const { PrismaClient } = require("@prisma/client");

function inferPattern(urls) {
  // Try to detect a common numeric suffix pattern, e.g., .../bizibord-01.jpg
  for (const url of urls) {
    const m = url.match(/^(.*?)(\d{1,3})(\.[a-zA-Z0-9]+)$/);
    if (m) {
      const [, base, num, ext] = m;
      return { base, start: parseInt(num, 10), digits: num.length, ext };
    }
  }
  return null;
}

function buildUrlsFromPattern(pattern, count, existing) {
  const urls = [...existing];
  let i = pattern.start + 1;
  while (urls.length < count) {
    const numStr = String(i).padStart(pattern.digits, "0");
    urls.push(`${pattern.base}${numStr}${pattern.ext}`);
    i += 1;
  }
  return urls;
}

// Fallback for placehold.co URLs like https://placehold.co/600x400?text=Часы+1
function tryExtendPlacehold(urls, count) {
  const urlsCopy = [...urls];
  const placehold = urls.find((u) => /placehold\.co\//.test(u));
  if (!placehold) return null;

  // Extract size (e.g., 600x400) and current max index
  const sizeMatch = placehold.match(/placehold\.co\/(\d+x\d+)/);
  const size = sizeMatch ? sizeMatch[1] : "600x400";

  // Find base label and max index from existing items
  let baseLabel = null;
  let maxIndex = 0;
  for (const url of urls) {
    if (!/placehold\.co\//.test(url)) continue;
    const textMatch = url.match(/[?&]text=([^&]+)/);
    if (!textMatch) continue;
    const raw = decodeURIComponent(textMatch[1]).replace(/\+/g, " ");
    // Detect patterns like "Часы 1" or "Часы Главное"
    const numMatch = raw.match(/^(.*\S)\s+(\d+)$/);
    if (numMatch) {
      baseLabel = (baseLabel || numMatch[1]).trim();
      const idx = parseInt(numMatch[2], 10);
      if (idx > maxIndex) maxIndex = idx;
    } else if (/главн/i.test(raw) && !baseLabel) {
      // If we find "Главное", set base from preceding word in other entries later
      continue;
    } else if (!baseLabel) {
      // Single word label without number, use as base
      baseLabel = raw.trim();
    }
  }

  // If we still have no baseLabel, default to "Фото"
  if (!baseLabel) baseLabel = "Фото";

  while (urlsCopy.length < count) {
    maxIndex += 1;
    const textParam = encodeURIComponent(`${baseLabel} ${maxIndex}`).replace(
      /%20/g,
      "+"
    );
    urlsCopy.push(`https://placehold.co/${size}?text=${textParam}`);
  }
  return urlsCopy;
}

async function main() {
  const prisma = new PrismaClient();
  const targetCount = parseInt(process.env.TARGET_COUNT || "20", 10);
  const nameQuery = process.argv.slice(2).join(" ") || "Бизиборд";
  try {
    const p = await prisma.product.findFirst({
      where: {
        AND: [
          { name: { contains: "Бизиборд" } },
          { name: { contains: "час" } },
        ],
      },
    });
    if (!p) {
      console.log("Продукт не найден по запросу:", nameQuery);
      return;
    }

    let images = [];
    try {
      images = JSON.parse(p.images || "[]");
    } catch {}

    if (images.length >= targetCount) {
      console.log("Уже достаточно изображений:", images.length);
      return;
    }

    let newImages;
    const pattern = inferPattern(images);
    if (pattern) {
      newImages = buildUrlsFromPattern(pattern, targetCount, images);
    } else {
      const extended = tryExtendPlacehold(images, targetCount);
      if (!extended) {
        console.log(
          "Не удалось определить паттерн имен файлов по существующим URL."
        );
        console.log("Текущие изображения:", images);
        process.exit(2);
      }
      newImages = extended;
    }
    const updated = await prisma.product.update({
      where: { id: p.id },
      data: { images: JSON.stringify(newImages) },
    });
    console.log("Обновлено. Было:", images.length, "Стало:", newImages.length);
    console.log("Пример последних URL:", newImages.slice(-5));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
