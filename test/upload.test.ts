import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { s3Storage } from "../src/lib/s3-storage";
import {
  ImageProcessor,
  generateFileName,
  transliterate,
} from "../src/lib/image-utils";
import sharp from "sharp";

describe("S3 Storage Tests", () => {
  let testImageBuffer: Buffer;
  let testKey: string;

  beforeAll(async () => {
    // Создаем тестовое изображение
    testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    testKey = `test/test-image-${Date.now()}.png`;
  });

  afterAll(async () => {
    // Очищаем тестовые файлы
    try {
      await s3Storage.deleteFile(testKey);
    } catch {
      console.log("Test cleanup: file might not exist");
    }
  });

  it("should upload file to S3", async () => {
    const url = await s3Storage.uploadFile(
      testKey,
      testImageBuffer,
      "image/png"
    );

    expect(url).toContain("voice-toys.s3.ru-7.storage.selcloud.ru");
    expect(url).toContain(testKey);
  });

  it("should check if file exists", async () => {
    const exists = await s3Storage.fileExists(testKey);
    expect(exists).toBe(true);
  });

  it("should get public URL", () => {
    const url = s3Storage.getPublicUrl(testKey);
    expect(url).toContain("voice-toys.s3.ru-7.storage.selcloud.ru");
    expect(url).toContain(testKey);
  });

  it("should extract key from URL", () => {
    const url = `https://voice-toys.s3.ru-7.storage.selcloud.ru/${testKey}`;
    const extractedKey = s3Storage.extractKeyFromUrl(url);
    expect(extractedKey).toBe(testKey);
  });

  it("should delete file from S3", async () => {
    await s3Storage.deleteFile(testKey);
    const exists = await s3Storage.fileExists(testKey);
    expect(exists).toBe(false);
  });
});

describe("Image Processing Tests", () => {
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    // Создаем тестовое изображение
    testImageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();
  });

  it("should convert image to WebP", async () => {
    const webpBuffer = await ImageProcessor.convertToWebP(testImageBuffer);

    const metadata = await sharp(webpBuffer).metadata();
    expect(metadata.format).toBe("webp");
  });

  it("should resize image", async () => {
    const resizedBuffer = await ImageProcessor.convertToWebP(testImageBuffer, {
      width: 100,
      height: 100,
    });

    const metadata = await sharp(resizedBuffer).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
    expect(metadata.format).toBe("webp");
  });

  it("should get image metadata", async () => {
    const metadata = await ImageProcessor.getImageMetadata(testImageBuffer);

    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(200);
    expect(metadata.format).toBe("jpeg");
  });

  it("should create thumbnail", async () => {
    const thumbnail = await ImageProcessor.createThumbnail(testImageBuffer, 50);

    const metadata = await sharp(thumbnail).metadata();
    expect(metadata.width).toBe(50);
    expect(metadata.height).toBe(50);
    expect(metadata.format).toBe("webp");
  });

  it("should validate image mime types", () => {
    expect(ImageProcessor.isValidImage("image/jpeg")).toBe(true);
    expect(ImageProcessor.isValidImage("image/png")).toBe(true);
    expect(ImageProcessor.isValidImage("image/webp")).toBe(true);
    expect(ImageProcessor.isValidImage("text/plain")).toBe(false);
    expect(ImageProcessor.isValidImage("application/pdf")).toBe(false);
  });

  it("should get file extension from mime type", () => {
    expect(ImageProcessor.getFileExtension("image/jpeg")).toBe("jpg");
    expect(ImageProcessor.getFileExtension("image/png")).toBe("png");
    expect(ImageProcessor.getFileExtension("image/webp")).toBe("webp");
  });

  it("should create multiple sizes", async () => {
    const sizes = [
      { width: 100, suffix: "small" },
      { width: 200, suffix: "medium" },
      { width: 400, suffix: "large" },
    ];

    const results = await ImageProcessor.createMultipleSizes(
      testImageBuffer,
      sizes
    );

    expect(results).toHaveLength(3);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const metadata = await sharp(result.buffer).metadata();

      expect(metadata.width).toBe(sizes[i].width);
      expect(metadata.format).toBe("webp");
      expect(result.suffix).toBe(sizes[i].suffix);
    }
  });
});

describe("Utility Functions Tests", () => {
  it("should transliterate Russian text", () => {
    expect(transliterate("Привет мир")).toBe("Privet_mir");
    expect(transliterate("Тест123")).toBe("Test123");
    expect(transliterate("Игрушка для детей")).toBe("Igrushka_dlya_detey");
  });

  it("should generate unique file names", () => {
    const fileName1 = generateFileName("test.jpg");
    const fileName2 = generateFileName("test.jpg");

    expect(fileName1).not.toBe(fileName2);
    expect(fileName1).toContain("test");
    expect(fileName2).toContain("test");
  });

  it("should generate file names with prefix", () => {
    const fileName = generateFileName("image.png", "product");

    expect(fileName).toContain("product_");
    expect(fileName).toContain("image");
  });
});

describe("Upload API Integration Tests", () => {
  it("should handle file upload", async () => {
    // Создаем тестовое изображение
    const testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    // Создаем FormData
    const formData = new FormData();
    const file = new File([testImageBuffer], "test-upload.png", {
      type: "image/png",
    });
    formData.append("files", file);
    formData.append("folder", "test-uploads");

    // Отправляем запрос
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    expect(response.ok).toBe(true);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].url).toContain(
      "voice-toys.s3.ru-7.storage.selcloud.ru"
    );

    // Очищаем загруженный файл
    if (result.files[0].key) {
      await s3Storage.deleteFile(result.files[0].key);
    }
  });

  it("should reject non-image files", async () => {
    const textBuffer = Buffer.from("This is not an image", "utf-8");

    const formData = new FormData();
    const file = new File([textBuffer], "test.txt", { type: "text/plain" });
    formData.append("files", file);

    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(400);

    const result = await response.json();
    expect(result.error).toContain("Invalid file type");
  });

  it("should handle file deletion", async () => {
    // Сначала загружаем файл
    const testImageBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const testKey = `test-delete/test-${Date.now()}.png`;
    const url = await s3Storage.uploadFile(
      testKey,
      testImageBuffer,
      "image/png"
    );

    // Теперь удаляем через API
    const deleteResponse = await fetch(
      `http://localhost:3000/api/upload?url=${encodeURIComponent(url)}`,
      {
        method: "DELETE",
      }
    );

    expect(deleteResponse.ok).toBe(true);

    const result = await deleteResponse.json();
    expect(result.success).toBe(true);

    // Проверяем, что файл действительно удален
    const exists = await s3Storage.fileExists(testKey);
    expect(exists).toBe(false);
  });
});
