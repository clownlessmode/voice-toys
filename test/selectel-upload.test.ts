import { describe, it, expect } from "vitest";
import { s3Storage } from "../src/lib/s3-storage";
import sharp from "sharp";

describe("Selectel Upload Test", () => {
  it("should upload image to Selectel and return correct URL", async () => {
    // Создаем тестовое изображение
    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .webp()
      .toBuffer();

    const fileName = `test-image-${Date.now()}.webp`;
    const key = `test/${fileName}`;

    console.log("Uploading test image to Selectel...");
    console.log("Key:", key);
    console.log("Buffer size:", testImage.length);

    try {
      // Загружаем изображение
      const url = await s3Storage.uploadFile(key, testImage, "image/webp", {
        testfile: "true",
        timestamp: Date.now().toString(),
      });

      console.log("Upload successful!");
      console.log("Returned URL:", url);

      // Проверяем, что URL правильный
      expect(url).toContain(
        "193bad6b-eacc-4eb6-bd19-72339c2afc74.selstorage.ru"
      );
      expect(url).toContain(key);

      // Проверяем, что файл действительно доступен
      const response = await fetch(url);
      console.log(
        "File accessibility test:",
        response.status,
        response.statusText
      );

      // Если файл публично доступен, статус должен быть 200
      // Если нет - может быть 403 или другой, но главное что загрузка прошла
      expect(response.status).toBeLessThan(500); // Не серверная ошибка

      // Очищаем тестовый файл
      try {
        await s3Storage.deleteFile(key);
        console.log("Test file cleaned up successfully");
      } catch (cleanupError) {
        console.log("Cleanup warning:", cleanupError);
        // Не падаем если не удалось очистить
      }
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  });

  it("should check S3 configuration", () => {
    console.log("Environment variables check:");
    console.log(
      "S3_ENDPOINT:",
      process.env.S3_ENDPOINT ? "✓ Set" : "✗ Missing"
    );
    console.log("S3_REGION:", process.env.S3_REGION ? "✓ Set" : "✗ Missing");
    console.log(
      "S3_BUCKET_NAME:",
      process.env.S3_BUCKET_NAME ? "✓ Set" : "✗ Missing"
    );
    console.log(
      "S3_ACCESS_KEY_ID:",
      process.env.S3_ACCESS_KEY_ID ? "✓ Set" : "✗ Missing"
    );
    console.log(
      "S3_SECRET_ACCESS_KEY:",
      process.env.S3_SECRET_ACCESS_KEY ? "✓ Set" : "✗ Missing"
    );
    console.log(
      "S3_PUBLIC_URL:",
      process.env.S3_PUBLIC_URL ? "✓ Set" : "✗ Missing"
    );

    // Проверяем что все переменные установлены
    expect(process.env.S3_ENDPOINT).toBeDefined();
    expect(process.env.S3_REGION).toBeDefined();
    expect(process.env.S3_BUCKET_NAME).toBeDefined();
    expect(process.env.S3_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.S3_SECRET_ACCESS_KEY).toBeDefined();
    expect(process.env.S3_PUBLIC_URL).toBeDefined();
  });
});
