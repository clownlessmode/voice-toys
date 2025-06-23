import { describe, it, expect } from "vitest";
import { s3Storage } from "../src/lib/s3-storage";
import sharp from "sharp";

describe("Selectel Simple Upload Test", () => {
  it("should upload image to root of bucket", async () => {
    // Создаем очень маленькое тестовое изображение
    const testImage = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .webp()
      .toBuffer();

    // Загружаем прямо в корень bucket'а
    const fileName = `simple-test-${Date.now()}.webp`;

    console.log("Uploading to root of bucket...");
    console.log("File name:", fileName);
    console.log("Buffer size:", testImage.length);

    try {
      // Загружаем изображение без папки
      const url = await s3Storage.uploadFile(
        fileName, // Без папки
        testImage,
        "image/webp",
        {
          test: "simple",
          size: testImage.length.toString(),
        }
      );

      console.log("Upload successful!");
      console.log("Returned URL:", url);

      // Проверяем, что URL правильный
      expect(url).toContain(
        "193bad6b-eacc-4eb6-bd19-72339c2afc74.selstorage.ru"
      );
      expect(url).toContain(fileName);

      // Проверяем доступность файла
      const response = await fetch(url);
      console.log("File check:", response.status, response.statusText);

      if (response.ok) {
        console.log("✓ File is publicly accessible");
        const contentType = response.headers.get("content-type");
        console.log("Content-Type:", contentType);
        expect(contentType).toContain("image");
      } else {
        console.log("⚠ File uploaded but not publicly accessible");
      }

      // Очищаем тестовый файл
      try {
        await s3Storage.deleteFile(fileName);
        console.log("✓ Test file cleaned up");
      } catch (cleanupError) {
        console.log("⚠ Cleanup failed:", cleanupError);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  });

  it("should upload image to products folder", async () => {
    // Создаем тестовое изображение
    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .webp()
      .toBuffer();

    const fileName = `test-product-${Date.now()}.webp`;
    const key = `products/${fileName}`;

    console.log("Uploading to products folder...");
    console.log("Key:", key);

    try {
      const url = await s3Storage.uploadFile(key, testImage, "image/webp", {
        folder: "products",
        test: "folder",
      });

      console.log("Upload to products folder successful!");
      console.log("URL:", url);

      expect(url).toContain(
        "193bad6b-eacc-4eb6-bd19-72339c2afc74.selstorage.ru"
      );
      expect(url).toContain("products/");
      expect(url).toContain(fileName);

      // Проверяем доступность
      const response = await fetch(url);
      console.log("Products folder file check:", response.status);

      // Очищаем
      try {
        await s3Storage.deleteFile(key);
        console.log("✓ Products folder test file cleaned up");
      } catch (cleanupError) {
        console.log("⚠ Products folder cleanup failed:", cleanupError);
      }
    } catch (error) {
      console.error("Products folder upload failed:", error);
      throw error;
    }
  });
});
