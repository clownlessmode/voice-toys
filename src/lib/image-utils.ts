import sharp from "sharp";

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export class ImageProcessor {
  /**
   * Конвертирует изображение в WebP формат
   */
  static async convertToWebP(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    const { width, height, quality = 100, fit = "cover" } = options; // Максимальное качество без сжатия

    let sharpInstance = sharp(buffer);

    // Изменяем размер если указан
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, { fit });
    }

    // Конвертируем в WebP с улучшенными настройками
    return sharpInstance
      .webp({
        quality,
        lossless: quality === 100,
        effort: 6, // Максимальное усилие для лучшего качества
        smartSubsample: false, // Отключаем субсэмплинг для лучшего качества
      })
      .toBuffer();
  }

  /**
   * Получает метаданные изображения
   */
  static async getImageMetadata(buffer: Buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
      };
    } catch (error) {
      throw new Error(
        `Failed to get image metadata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Создает превью изображения
   */
  static async createThumbnail(
    buffer: Buffer,
    size: number = 300,
    quality: number = 100
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(size, size, { fit: "cover" })
      .webp({ quality })
      .toBuffer();
  }

  /**
   * Проверяет, является ли файл изображением
   */
  static isValidImage(mimeType: string): boolean {
    const validMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ];
    return validMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Получает расширение файла по MIME типу
   */
  static getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/bmp": "bmp",
      "image/tiff": "tiff",
    };
    return extensions[mimeType.toLowerCase()] || "jpg";
  }

  /**
   * Создает несколько размеров изображения
   */
  static async createMultipleSizes(
    buffer: Buffer,
    sizes: Array<{ width: number; height?: number; suffix: string }>
  ): Promise<
    Array<{ buffer: Buffer; suffix: string; width: number; height?: number }>
  > {
    const results = [];

    for (const size of sizes) {
      const processedBuffer = await sharp(buffer)
        .resize(size.width, size.height, { fit: "cover" })
        .webp({ quality: 100 })
        .toBuffer();

      results.push({
        buffer: processedBuffer,
        suffix: size.suffix,
        width: size.width,
        height: size.height,
      });
    }

    return results;
  }
}

/**
 * Транслитерация для создания безопасных имен файлов
 */
export function transliterate(text: string): string {
  const transliterationMap: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    А: "A",
    Б: "B",
    В: "V",
    Г: "G",
    Д: "D",
    Е: "E",
    Ё: "Yo",
    Ж: "Zh",
    З: "Z",
    И: "I",
    Й: "Y",
    К: "K",
    Л: "L",
    М: "M",
    Н: "N",
    О: "O",
    П: "P",
    Р: "R",
    С: "S",
    Т: "T",
    У: "U",
    Ф: "F",
    Х: "H",
    Ц: "Ts",
    Ч: "Ch",
    Ш: "Sh",
    Щ: "Sch",
    Ъ: "",
    Ы: "Y",
    Ь: "",
    Э: "E",
    Ю: "Yu",
    Я: "Ya",
  };

  return text
    .split("")
    .map((char) => transliterationMap[char] || char)
    .join("")
    .replace(/[^a-zA-Z0-9\-_]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Генерирует уникальное имя файла
 */
export function generateFileName(
  originalName: string,
  prefix?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const transliteratedName = transliterate(nameWithoutExt);

  const fileName = prefix
    ? `${prefix}_${transliteratedName}_${timestamp}_${random}`
    : `${transliteratedName}_${timestamp}_${random}`;

  return fileName.toLowerCase();
}
