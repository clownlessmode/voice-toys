import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, Browser, Page } from "playwright";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

// Тесты UI интеграции админ-панели
describe("Admin Panel UI Integration Tests", () => {
  let browser: Browser;
  let page: Page;
  const testImagesDir = path.join(process.cwd(), "test", "temp-images");
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    // Создаем временную папку для тестовых изображений
    await fs.mkdir(testImagesDir, { recursive: true });

    // Создаем тестовые изображения
    await createTestImages();

    // Авторизуемся в админ-панели (если требуется)
    await page.goto("http://localhost:3000/admin/login");

    // Если есть форма логина, заполняем её
    const loginForm = await page.$("form");
    if (loginForm) {
      await page.fill(
        'input[type="password"]',
        process.env.ADMIN_PASSWORD || "admin123"
      );
      await page.click('button[type="submit"]');
      await page.waitForURL("**/admin");
    }
  });

  afterAll(async () => {
    // Очищаем созданные продукты
    for (const productId of createdProductIds) {
      try {
        await fetch(`http://localhost:3000/api/products/${productId}`, {
          method: "DELETE",
        });
      } catch {
        // Игнорируем ошибки очистки
      }
    }

    // Удаляем временные файлы
    try {
      await fs.rm(testImagesDir, { recursive: true, force: true });
    } catch {
      // Игнорируем ошибки очистки
    }

    await browser.close();
  });

  async function createTestImages() {
    // Создаем несколько тестовых изображений разных форматов
    const images = [
      {
        name: "test-product-1.png",
        buffer: await sharp({
          create: {
            width: 800,
            height: 600,
            channels: 3,
            background: { r: 255, g: 100, b: 100 },
          },
        })
          .png()
          .toBuffer(),
      },
      {
        name: "test-product-2.jpg",
        buffer: await sharp({
          create: {
            width: 600,
            height: 800,
            channels: 3,
            background: { r: 100, g: 255, b: 100 },
          },
        })
          .jpeg()
          .toBuffer(),
      },
      {
        name: "test-product-3.webp",
        buffer: await sharp({
          create: {
            width: 1000,
            height: 1000,
            channels: 3,
            background: { r: 100, g: 100, b: 255 },
          },
        })
          .webp()
          .toBuffer(),
      },
    ];

    for (const image of images) {
      await fs.writeFile(path.join(testImagesDir, image.name), image.buffer);
    }
  }

  describe("Product Creation with File Upload", () => {
    it("should create product using file upload component", async () => {
      await page.goto("http://localhost:3000/admin/products/new");

      // Ждем загрузки страницы
      await page.waitForSelector('input[name="name"]');

      // Заполняем основные поля
      await page.fill('input[name="name"]', "Тестовый товар через UI");
      await page.fill(
        'textarea[name="description"]',
        "Описание товара созданного через UI тест"
      );
      await page.fill('input[name="price"]', "2500");

      // Находим компонент загрузки файлов
      const fileUploadComponent = await page.$('[data-testid="file-upload"]');
      expect(fileUploadComponent).toBeTruthy();

      // Загружаем изображения через drag & drop или file input
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const testImagePath = path.join(testImagesDir, "test-product-1.png");
        await fileInput.setInputFiles([testImagePath]);

        // Ждем завершения загрузки
        await page.waitForSelector('[data-testid="upload-progress"]', {
          state: "hidden",
          timeout: 10000,
        });

        // Проверяем, что изображение появилось в превью
        const imagePreview = await page.$('[data-testid="image-preview"]');
        expect(imagePreview).toBeTruthy();
      }

      // Также добавляем ручной URL для проверки комбинированной функциональности
      const manualUrlInput = await page.$('input[placeholder*="URL"]');
      if (manualUrlInput) {
        await manualUrlInput.fill("https://example.com/manual-image.jpg");
      }

      // Сохраняем продукт
      await page.click('button[type="submit"]');

      // Ждем редиректа или уведомления об успехе
      await page.waitForURL("**/admin/products", { timeout: 10000 });

      // Проверяем, что продукт появился в списке
      const productsList = await page.textContent("main");
      expect(productsList).toContain("Тестовый товар через UI");

      // Получаем ID созданного продукта для очистки
      const productLinks = await page.$$('a[href*="/admin/products/"]');
      if (productLinks.length > 0) {
        const href = await productLinks[0].getAttribute("href");
        const productId = href?.split("/").pop();
        if (productId && productId !== "new") {
          createdProductIds.push(productId);
        }
      }
    });

    it("should handle multiple file uploads simultaneously", async () => {
      await page.goto("http://localhost:3000/admin/products/new");

      await page.fill(
        'input[name="name"]',
        "Товар с множественными изображениями"
      );
      await page.fill('input[name="price"]', "1800");

      // Загружаем несколько файлов одновременно
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const testImages = [
          path.join(testImagesDir, "test-product-1.png"),
          path.join(testImagesDir, "test-product-2.jpg"),
          path.join(testImagesDir, "test-product-3.webp"),
        ];

        await fileInput.setInputFiles(testImages);

        // Ждем загрузки всех файлов
        await page.waitForFunction(
          () => {
            const previews = document.querySelectorAll(
              '[data-testid="image-preview"]'
            );
            return previews.length >= 3;
          },
          { timeout: 15000 }
        );

        // Проверяем, что все изображения загрузились
        const imagePreviews = await page.$$('[data-testid="image-preview"]');
        expect(imagePreviews.length).toBeGreaterThanOrEqual(3);
      }

      await page.click('button[type="submit"]');
      await page.waitForURL("**/admin/products", { timeout: 10000 });
    });
  });

  describe("Product Editing with File Upload", () => {
    it("should edit existing product and add new images", async () => {
      // Сначала создаем продукт через API
      const productData = {
        name: "Товар для редактирования",
        breadcrumbs: ["Главная", "Каталог", "Тест"],
        images: ["https://example.com/existing-image.jpg"],
        price: 1000,
        currency: "₽",
        pickupAvailability: "Самовывоз сегодня",
        deliveryAvailability: "Доставка от 1 дня",
        returnDays: 14,
        returnDetails: "Можно обменять или вернуть в течение 14 дней",
        description: "Исходное описание",
        characteristics: [{ key: "Возраст", value: "3+" }],
      };

      const createResponse = await fetch("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const createdProduct = await createResponse.json();
      const productId = createdProduct.id;
      createdProductIds.push(productId);

      // Переходим на страницу редактирования
      await page.goto(`http://localhost:3000/admin/products/${productId}/edit`);

      // Ждем загрузки формы
      await page.waitForSelector('input[name="name"]');

      // Проверяем, что существующие данные загрузились
      const nameValue = await page.inputValue('input[name="name"]');
      expect(nameValue).toBe("Товар для редактирования");

      // Добавляем новое изображение
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles([
          path.join(testImagesDir, "test-product-2.jpg"),
        ]);

        // Ждем загрузки
        await page.waitForSelector('[data-testid="upload-progress"]', {
          state: "hidden",
          timeout: 10000,
        });
      }

      // Изменяем название
      await page.fill('input[name="name"]', "Обновленный товар через UI");

      // Сохраняем изменения
      await page.click('button[type="submit"]');

      // Проверяем успешное обновление
      await page.waitForURL("**/admin/products", { timeout: 10000 });

      // Проверяем, что изменения применились
      const updatedProductsList = await page.textContent("main");
      expect(updatedProductsList).toContain("Обновленный товар через UI");
    });
  });

  describe("File Upload Error Handling", () => {
    it("should show error for invalid file types", async () => {
      await page.goto("http://localhost:3000/admin/products/new");

      // Создаем временный текстовый файл
      const textFilePath = path.join(testImagesDir, "invalid-file.txt");
      await fs.writeFile(textFilePath, "This is not an image");

      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles([textFilePath]);

        // Ждем появления сообщения об ошибке
        const errorMessage = await page.waitForSelector(
          '[data-testid="upload-error"]',
          { timeout: 5000 }
        );
        const errorText = await errorMessage.textContent();
        expect(errorText).toContain("Invalid file type");
      }
    });

    it("should show progress during upload", async () => {
      await page.goto("http://localhost:3000/admin/products/new");

      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        // Загружаем большое изображение
        await fileInput.setInputFiles([
          path.join(testImagesDir, "test-product-3.webp"),
        ]);

        // Проверяем появление индикатора прогресса
        const progressIndicator = await page.waitForSelector(
          '[data-testid="upload-progress"]',
          { timeout: 2000 }
        );
        expect(progressIndicator).toBeTruthy();

        // Ждем завершения загрузки
        await page.waitForSelector('[data-testid="upload-progress"]', {
          state: "hidden",
          timeout: 10000,
        });
      }
    });
  });

  describe("Image Management", () => {
    it("should allow removing uploaded images", async () => {
      await page.goto("http://localhost:3000/admin/products/new");

      // Загружаем изображение
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles([
          path.join(testImagesDir, "test-product-1.png"),
        ]);
        await page.waitForSelector('[data-testid="image-preview"]');

        // Нажимаем кнопку удаления
        const removeButton = await page.$('[data-testid="remove-image"]');
        if (removeButton) {
          await removeButton.click();

          // Проверяем, что изображение удалилось
          const imagePreview = await page.$('[data-testid="image-preview"]');
          expect(imagePreview).toBeFalsy();
        }
      }
    });

    it("should show image preview with correct dimensions", async () => {
      await page.goto("http://localhost:3000/admin/products/new");

      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles([
          path.join(testImagesDir, "test-product-2.jpg"),
        ]);

        const imagePreview = await page.waitForSelector(
          '[data-testid="image-preview"] img'
        );

        // Проверяем, что изображение загрузилось и имеет корректные размеры
        const imageElement = await imagePreview.boundingBox();
        expect(imageElement?.width).toBeGreaterThan(0);
        expect(imageElement?.height).toBeGreaterThan(0);
      }
    });
  });

  describe("Combined Upload and Manual URL Input", () => {
    it("should handle both uploaded files and manual URLs", async () => {
      await page.goto("http://localhost:3000/admin/products/new");

      await page.fill(
        'input[name="name"]',
        "Товар с комбинированными изображениями"
      );
      await page.fill('input[name="price"]', "3000");

      // Загружаем файл
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles([
          path.join(testImagesDir, "test-product-1.png"),
        ]);
        await page.waitForSelector('[data-testid="image-preview"]');
      }

      // Добавляем ручной URL
      const manualUrlInputs = await page.$$(
        'input[placeholder*="URL"], input[placeholder*="url"]'
      );
      if (manualUrlInputs.length > 0) {
        await manualUrlInputs[0].fill("https://example.com/manual-image-1.jpg");

        // Если есть возможность добавить еще один URL
        if (manualUrlInputs.length > 1) {
          await manualUrlInputs[1].fill(
            "https://example.com/manual-image-2.jpg"
          );
        }
      }

      // Сохраняем продукт
      await page.click('button[type="submit"]');
      await page.waitForURL("**/admin/products", { timeout: 10000 });

      // Проверяем, что продукт создался с комбинированными изображениями
      const productsList = await page.textContent("main");
      expect(productsList).toContain("Товар с комбинированными изображениями");
    });
  });
});
