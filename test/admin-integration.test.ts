import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { s3Storage } from "../src/lib/s3-storage";
import sharp from "sharp";

// Тесты для интеграции админ-панели с загрузкой файлов
describe("Admin Panel Integration Tests", () => {
  let testProductId: string;
  const uploadedImageUrls: string[] = [];

  beforeAll(async () => {
    // Создаем тестовые изображения для загрузки
    console.log("Setting up test environment...");
  });

  afterAll(async () => {
    // Очищаем созданные тестовые данные
    try {
      // Удаляем тестовый продукт если создался
      if (testProductId) {
        await fetch(`http://localhost:3000/api/products/${testProductId}`, {
          method: "DELETE",
        });
      }

      // Удаляем загруженные изображения
      for (const url of uploadedImageUrls) {
        try {
          const key = s3Storage.extractKeyFromUrl(url);
          await s3Storage.deleteFile(key);
        } catch {
          console.log(`Failed to cleanup image: ${url}`);
        }
      }
    } catch (error) {
      console.log("Cleanup error:", error);
    }
  });

  describe("File Upload API Integration", () => {
    it("should upload multiple images and return URLs", async () => {
      // Создаем тестовые изображения
      const testImages = await Promise.all([
        sharp({
          create: {
            width: 400,
            height: 400,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
          },
        })
          .png()
          .toBuffer(),

        sharp({
          create: {
            width: 600,
            height: 400,
            channels: 3,
            background: { r: 0, g: 255, b: 0 },
          },
        })
          .jpeg()
          .toBuffer(),
      ]);

      // Создаем FormData как в реальном приложении
      const formData = new FormData();
      testImages.forEach((buffer, index) => {
        const file = new File(
          [buffer],
          `test-image-${index + 1}.${index === 0 ? "png" : "jpg"}`,
          {
            type: index === 0 ? "image/png" : "image/jpeg",
          }
        );
        formData.append("files", file);
      });

      formData.append("folder", "test-products");
      formData.append("resize", "true");
      formData.append("width", "1200");
      formData.append("height", "1200");
      formData.append("quality", "90");

      // Отправляем запрос на загрузку
      const response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);

      // Проверяем, что все файлы имеют правильную структуру
      for (const file of result.files) {
        expect(file.url).toContain("voice-toys.s3.ru-7.storage.selcloud.ru");
        expect(file.url).toContain("test-products/");
        expect(file.fileName).toContain(".webp");
        expect(file.metadata.width).toBe(1200);
        expect(file.metadata.height).toBe(1200);
        expect(file.metadata.format).toBe("webp");

        uploadedImageUrls.push(file.url);
      }

      // Проверяем, что файлы действительно доступны по URL
      for (const file of result.files) {
        const imageResponse = await fetch(file.url);
        expect(imageResponse.ok).toBe(true);
        expect(imageResponse.headers.get("content-type")).toContain("image");
      }
    });
  });

  describe("Product Creation with Uploaded Images", () => {
    it("should create product with uploaded images", async () => {
      // Сначала загружаем изображения
      const testImage = await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      const file = new File([testImage], "product-image.png", {
        type: "image/png",
      });
      formData.append("files", file);
      formData.append("folder", "products");
      formData.append("resize", "true");
      formData.append("width", "1200");
      formData.append("height", "1200");

      const uploadResponse = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      expect(uploadResult.success).toBe(true);

      const uploadedImageUrl = uploadResult.files[0].url;
      uploadedImageUrls.push(uploadedImageUrl);

      // Теперь создаем продукт с этим изображением
      const productData = {
        name: "Тестовый товар с загруженным изображением",
        breadcrumbs: [
          "Главная",
          "Каталог",
          "Интерактивные игрушки",
          "Тестовый товар",
        ],
        images: [uploadedImageUrl, "https://example.com/manual-url.jpg"], // Комбинируем загруженное и ручное
        price: 1500,
        oldPrice: 2000,
        discountPercent: 25,
        currency: "₽",
        pickupAvailability: "Самовывоз сегодня",
        deliveryAvailability: "Доставка от 1 дня",
        returnDays: 14,
        returnDetails: "Можно обменять или вернуть в течение 14 дней",
        description: "Тестовое описание товара с загруженным изображением",
        characteristics: [
          { key: "Возраст", value: "3-4года" },
          { key: "Материал", value: "ABS-пластик" },
        ],
      };

      const createResponse = await fetch("http://localhost:3000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      expect(createResponse.ok).toBe(true);

      const createdProduct = await createResponse.json();
      testProductId = createdProduct.id;

      // Проверяем, что продукт создался с правильными изображениями
      expect(createdProduct.images).toContain(uploadedImageUrl);
      expect(createdProduct.images).toContain(
        "https://example.com/manual-url.jpg"
      );
      expect(createdProduct.images).toHaveLength(2);
      expect(createdProduct.name).toBe(
        "Тестовый товар с загруженным изображением"
      );
    });
  });

  describe("Product Update with New Images", () => {
    it("should update product with additional uploaded images", async () => {
      // Создаем базовый продукт
      const initialProductData = {
        name: "Товар для обновления",
        breadcrumbs: [
          "Главная",
          "Каталог",
          "Интерактивные игрушки",
          "Товар для обновления",
        ],
        images: ["https://example.com/initial-image.jpg"],
        price: 1000,
        currency: "₽",
        pickupAvailability: "Самовывоз сегодня",
        deliveryAvailability: "Доставка от 1 дня",
        returnDays: 14,
        returnDetails: "Можно обменять или вернуть в течение 14 дней",
        description: "Первоначальное описание",
        characteristics: [{ key: "Возраст", value: "1+" }],
      };

      const createResponse = await fetch("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialProductData),
      });

      const createdProduct = await createResponse.json();
      const productId = createdProduct.id;

      // Загружаем новое изображение
      const newTestImage = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 255, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      const file = new File([newTestImage], "updated-image.png", {
        type: "image/png",
      });
      formData.append("files", file);
      formData.append("folder", "products");

      const uploadResponse = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      const newImageUrl = uploadResult.files[0].url;
      uploadedImageUrls.push(newImageUrl);

      // Обновляем продукт с новым изображением
      const updatedProductData = {
        ...initialProductData,
        name: "Обновленный товар",
        images: [
          "https://example.com/initial-image.jpg", // Старое изображение
          newImageUrl, // Новое загруженное изображение
          "https://example.com/another-manual-url.jpg", // Еще одно ручное
        ],
        description: "Обновленное описание с новым изображением",
      };

      const updateResponse = await fetch(
        `http://localhost:3000/api/products/${productId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedProductData),
        }
      );

      expect(updateResponse.ok).toBe(true);

      const updatedProduct = await updateResponse.json();

      // Проверяем, что продукт обновился правильно
      expect(updatedProduct.name).toBe("Обновленный товар");
      expect(updatedProduct.images).toHaveLength(3);
      expect(updatedProduct.images).toContain(
        "https://example.com/initial-image.jpg"
      );
      expect(updatedProduct.images).toContain(newImageUrl);
      expect(updatedProduct.images).toContain(
        "https://example.com/another-manual-url.jpg"
      );
      expect(updatedProduct.description).toBe(
        "Обновленное описание с новым изображением"
      );

      // Проверяем, что загруженное изображение доступно
      const imageResponse = await fetch(newImageUrl);
      expect(imageResponse.ok).toBe(true);

      // Очищаем тестовый продукт
      await fetch(`http://localhost:3000/api/products/${productId}`, {
        method: "DELETE",
      });
    });
  });

  describe("Image Deletion Integration", () => {
    it("should delete uploaded images when requested", async () => {
      // Загружаем изображение
      const testImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      const file = new File([testImage], "delete-test.png", {
        type: "image/png",
      });
      formData.append("files", file);
      formData.append("folder", "test-delete");

      const uploadResponse = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      const imageUrl = uploadResult.files[0].url;

      // Проверяем, что изображение доступно
      let imageResponse = await fetch(imageUrl);
      expect(imageResponse.ok).toBe(true);

      // Удаляем изображение через API
      const deleteResponse = await fetch(
        `http://localhost:3000/api/upload?url=${encodeURIComponent(imageUrl)}`,
        {
          method: "DELETE",
        }
      );

      expect(deleteResponse.ok).toBe(true);

      const deleteResult = await deleteResponse.json();
      expect(deleteResult.success).toBe(true);

      // Проверяем, что изображение больше недоступно
      imageResponse = await fetch(imageUrl);
      expect(imageResponse.ok).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid file types", async () => {
      const textContent = "This is not an image";
      const textBuffer = new TextEncoder().encode(textContent);

      const formData = new FormData();
      const file = new File([textBuffer], "not-an-image.txt", {
        type: "text/plain",
      });
      formData.append("files", file);

      const response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toContain("Invalid file type");
    });

    it("should handle oversized files", async () => {
      // Создаем очень большое изображение (симулируем большой файл)
      const largeImage = await sharp({
        create: {
          width: 5000,
          height: 5000,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();

      // Если изображение меньше лимита, создаем искусственно большой файл
      const paddedBuffer = Buffer.concat([
        largeImage,
        Buffer.alloc(15 * 1024 * 1024),
      ]); // 15MB+

      const formData = new FormData();
      const file = new File([paddedBuffer], "huge-image.png", {
        type: "image/png",
      });
      formData.append("files", file);

      const response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toContain("too large");
    });
  });
});
