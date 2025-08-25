#!/usr/bin/env node

/**
 * Скрипт для восстановления реальных данных из папки prisma-backup
 * Восстанавливает данные из старой базы данных в новую схему
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Конфигурация
const BACKUP_SOURCE = "./prisma-backup";
const CURRENT_PRISMA = "./prisma";
const BACKUP_DB = "./prisma-backup/dev.db";
const CURRENT_DB = "./prisma/dev.db";

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix =
    type === "error"
      ? "❌"
      : type === "warning"
      ? "⚠️"
      : type === "success"
      ? "✅"
      : "ℹ️";
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function runCommand(command, description) {
  try {
    log(`Выполняю: ${description}`);
    execSync(command, { stdio: "inherit" });
    log(`${description} выполнено успешно`, "success");
    return true;
  } catch (error) {
    log(`Ошибка при выполнении: ${description}`, "error");
    return false;
  }
}

function checkBackupExists() {
  if (!fs.existsSync(BACKUP_SOURCE)) {
    log(`Папка ${BACKUP_SOURCE} не найдена!`, "error");
    log("Убедитесь, что у вас есть папка prisma-backup с данными", "warning");
    return false;
  }

  if (!fs.existsSync(BACKUP_DB)) {
    log(`Файл базы данных ${BACKUP_DB} не найден!`, "error");
    return false;
  }

  log(`Найдена папка резервной копии: ${BACKUP_SOURCE}`);
  log(`Найден файл базы данных: ${BACKUP_DB}`);
  return true;
}

function showBackupContents() {
  log("Содержимое папки резервной копии:");

  function listDir(dir, indent = "") {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        log(`${indent}📁 ${item}/`);
        listDir(itemPath, indent + "  ");
      } else {
        const size = stats.size;
        const sizeStr =
          size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
        log(`${indent}📄 ${item} (${sizeStr})`);
      }
    }
  }

  listDir(BACKUP_SOURCE);
}

function createDataRestoreScript() {
  log("Создаю скрипт для восстановления данных...");

  const restoreScript = `#!/usr/bin/env tsx

/**
 * Скрипт для восстановления данных из старой базы данных
 * Запускается после обновления схемы
 */

import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const prisma = new PrismaClient();

async function restoreData() {
  console.log('🔄 Начинаю восстановление данных из резервной копии...');
  
  try {
    // Открываем старую базу данных
    const oldDb = await open({
      filename: './prisma-backup/dev.db',
      driver: sqlite3.Database
    });
    
    console.log('📊 Получаю данные из старой базы...');
    
    // Получаем все продукты
    const products = await oldDb.all('SELECT * FROM products');
    console.log(\`📦 Найдено продуктов: \${products.length}\`);
    
    // Получаем все характеристики продуктов
    const characteristics = await oldDb.all('SELECT * FROM product_characteristics');
    console.log(\`🔍 Найдено характеристик: \${characteristics.length}\`);
    
    // Получаем все заказы
    const orders = await oldDb.all('SELECT * FROM orders');
    console.log(\`📋 Найдено заказов: \${orders.length}\`);
    
    // Получаем все элементы заказов
    const orderItems = await oldDb.all('SELECT * FROM order_items');
    console.log(\`📦 Найдено элементов заказов: \${orderItems.length}\`);
    
    // Получаем все промокоды
    const promoCodes = await oldDb.all('SELECT * FROM promo_codes');
    console.log(\`🎫 Найдено промокодов: \${promoCodes.length}\`);
    
    await oldDb.close();
    
    console.log('\\n🔄 Восстанавливаю данные в новую базу...');
    
    // Очищаем новую базу данных
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productCharacteristic.deleteMany();
    await prisma.product.deleteMany();
    await prisma.promoCode.deleteMany();
    
    console.log('🧹 Новая база данных очищена');
    
    // Восстанавливаем промокоды
    if (promoCodes.length > 0) {
      console.log('🎫 Восстанавливаю промокоды...');
      for (const promoCode of promoCodes) {
        await prisma.promoCode.create({
          data: {
            id: promoCode.id,
            code: promoCode.code,
            name: promoCode.name,
            description: promoCode.description,
            type: promoCode.type,
            value: promoCode.value,
            minOrderAmount: promoCode.minOrderAmount,
            maxUses: promoCode.maxUses,
            currentUses: promoCode.currentUses,
            validFrom: new Date(promoCode.validFrom),
            validUntil: new Date(promoCode.validUntil),
            isActive: promoCode.isActive,
            createdAt: new Date(promoCode.createdAt),
            updatedAt: new Date(promoCode.updatedAt)
          }
        });
      }
      console.log(\`✅ Восстановлено промокодов: \${promoCodes.length}\`);
    }
    
    // Восстанавливаем продукты
    if (products.length > 0) {
      console.log('📦 Восстанавливаю продукты...');
      for (const product of products) {
        await prisma.product.create({
          data: {
            id: product.id,
            name: product.name,
            breadcrumbs: product.breadcrumbs,
            images: product.images,
            price: product.price,
            oldPrice: product.oldPrice,
            discountPercent: product.discountPercent,
            currency: product.currency,
            favorite: product.favorite,
            pickupAvailability: product.pickupAvailability,
            deliveryAvailability: product.deliveryAvailability,
            returnDays: product.returnDays,
            returnDetails: product.returnDetails,
            description: product.description,
            videoUrl: product.videoUrl,
            categories: product.categories,
            ageGroups: product.ageGroups,
            createdAt: new Date(product.createdAt),
            updatedAt: new Date(product.updatedAt)
          }
        });
      }
      console.log(\`✅ Восстановлено продуктов: \${products.length}\`);
    }
    
    // Восстанавливаем характеристики продуктов
    if (characteristics.length > 0) {
      console.log('🔍 Восстанавливаю характеристики продуктов...');
      for (const characteristic of characteristics) {
        await prisma.productCharacteristic.create({
          data: {
            id: characteristic.id,
            productId: characteristic.productId,
            key: characteristic.key,
            value: characteristic.value
          }
        });
      }
      console.log(\`✅ Восстановлено характеристик: \${characteristics.length}\`);
    }
    
    // Восстанавливаем заказы
    if (orders.length > 0) {
      console.log('📋 Восстанавливаю заказы...');
      for (const order of orders) {
        await prisma.order.create({
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            deliveryType: order.deliveryType,
            deliveryAddress: order.deliveryAddress,
            totalAmount: order.totalAmount,
            currency: order.currency,
            promoCodeId: order.promoCodeId,
            discountAmount: order.discountAmount,
            originalAmount: order.originalAmount,
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.updatedAt),
            paidAt: order.paidAt ? new Date(order.paidAt) : null
          }
        });
      }
      console.log(\`✅ Восстановлено заказов: \${orders.length}\`);
    }
    
    // Восстанавливаем элементы заказов
    if (orderItems.length > 0) {
      console.log('📦 Восстанавливаю элементы заказов...');
      for (const orderItem of orderItems) {
        await prisma.orderItem.create({
          data: {
            id: orderItem.id,
            orderId: orderItem.orderId,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            price: orderItem.price
          }
        });
      }
      console.log(\`✅ Восстановлено элементов заказов: \${orderItems.length}\`);
    }
    
    console.log('\\n🎉 Все данные успешно восстановлены!');
    
  } catch (error) {
    console.error('❌ Ошибка при восстановлении данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
restoreData().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
`;

  const scriptPath = "./restore-data.ts";
  fs.writeFileSync(scriptPath, restoreScript);

  // Делаем скрипт исполняемым
  fs.chmodSync(scriptPath, "755");

  log(`Скрипт восстановления создан: ${scriptPath}`);
  return scriptPath;
}

function restoreDataFromBackup() {
  log("Восстанавливаю данные из резервной копии...");

  try {
    // Создаем скрипт восстановления
    const restoreScript = createDataRestoreScript();

    // Запускаем скрипт восстановления
    log("Запускаю скрипт восстановления данных...");
    if (runCommand("npx tsx restore-data.ts", "Восстановление данных")) {
      log("✅ Данные успешно восстановлены!");

      // Удаляем временный скрипт
      fs.unlinkSync("./restore-data.ts");

      return true;
    } else {
      log("❌ Не удалось восстановить данные", "error");
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка при восстановлении данных: ${error.message}`, "error");
    return false;
  }
}

function main() {
  try {
    log("🚀 Начинаю восстановление данных из папки prisma-backup");

    // Проверяем наличие резервной копии
    if (!checkBackupExists()) {
      process.exit(1);
    }

    // Показываем содержимое резервной копии
    showBackupContents();

    // Восстанавливаем данные
    if (restoreDataFromBackup()) {
      log("🎉 Восстановление завершено успешно!");
      log("💡 Проверьте данные в Prisma Studio: npx prisma studio");
    } else {
      log("⚠️  Автоматическое восстановление не удалось", "warning");
      log("💡 Для ручного восстановления:", "warning");
      log("1. Откройте Prisma Studio: npx prisma studio");
      log("2. Скопируйте данные из старой БД в новую");
      log("3. Или используйте SQLite Browser для работы с файлом БД");
    }
  } catch (error) {
    log(`❌ Критическая ошибка: ${error.message}`, "error");
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { main, checkBackupExists, restoreDataFromBackup };
