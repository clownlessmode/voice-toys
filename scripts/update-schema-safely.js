#!/usr/bin/env node

/**
 * Скрипт для безопасного обновления схемы Prisma
 * Создает резервную копию, обновляет схему и применяет миграции
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const BACKUP_DIR = './backups';
const SCHEMA_FILE = './prisma/schema.prisma';
const NEW_SCHEMA_FILE = './prisma/schema.new.prisma';

// Новая схема (из продакшена)
const NEW_SCHEMA_CONTENT = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Product {
  id                String            @id @default(cuid())
  name              String
  breadcrumbs       String            // JSON string
  images            String            // JSON string array
  price             Float
  oldPrice          Float?
  discountPercent   Int?
  currency          String            @default("₽")
  favorite          Boolean           @default(false)
  pickupAvailability String
  deliveryAvailability String
  returnDays        Int               @default(14)
  returnDetails     String
  description       String
  videoUrl          String?           // ссылка на видео (опционально)
  characteristics   ProductCharacteristic[]
  orderItems        OrderItem[]
  categories        String            // JSON array of category strings
  ageGroups         String            // JSON array of age group strings
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@map("products")
}

model ProductCharacteristic {
  id        String  @id @default(cuid())
  productId String
  key       String
  value     String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_characteristics")
}

model Order {
  id          String      @id @default(cuid())
  orderNumber String      @unique // Номер заказа для клиента (например, #2024-001)
  status      OrderStatus @default(CREATED)
  
  // Данные покупателя
  customerName  String
  customerPhone String
  customerEmail String?
  
  // Доставка
  deliveryType    String // "pickup" или "delivery"
  deliveryAddress String?
  
  // Сумма заказа
  totalAmount   Float
  currency      String  @default("₽")
  
  // Промокод
  promoCodeId   String?  // ID использованного промокода
  promoCode     PromoCode? @relation(fields: [promoCodeId], references: [id])
  discountAmount Float?   // Сумма скидки по промокоду
  originalAmount Float?   // Исходная сумма заказа
  
  // Товары в заказе
  items         OrderItem[]
  
  // Даты
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  paidAt        DateTime?
  
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int     @default(1)
  price     Float   // Цена на момент заказа
  
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("order_items")
}

enum OrderStatus {
  CREATED    // Создан
  PAID       // Оплачен
  SHIPPED    // Отправлен
  DELIVERED  // Доставлен
  CANCELLED  // Отменен
}

model PromoCode {
  id          String   @id @default(cuid())
  code        String   @unique // Уникальный код промокода
  name        String   // Название промокода
  description String?  // Описание
  type        PromoCodeType // Тип промокода
  value       Float    // Значение (процент или сумма в рублях)
  minOrderAmount Float?  // Минимальная сумма заказа для применения
  maxUses     Int?     // Максимальное количество использований
  currentUses Int      @default(0) // Текущее количество использований
  validFrom   DateTime @default(now()) // Дата начала действия
  validUntil  DateTime // Дата окончания действия
  isActive    Boolean  @default(true) // Активен ли промокод
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Связи
  orders     Order[]  // Заказы, где использовался промокод

  @@map("promo_codes")
}

enum PromoCodeType {
  PERCENTAGE // Скидка в процентах
  FIXED_AMOUNT // Скидка в рублях
}`;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function runCommand(command, description) {
  try {
    log(`Выполняю: ${description}`);
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} выполнено успешно`);
  } catch (error) {
    log(`❌ Ошибка при выполнении: ${description}`, 'error');
    throw error;
  }
}

function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `schema-backup-${timestamp}.prisma`);
  
  log(`Создаю резервную копию схемы: ${backupFile}`);
  fs.copyFileSync(SCHEMA_FILE, backupFile);
  
  // Также создаем резервную копию базы данных
  const dbBackupFile = path.join(BACKUP_DIR, `dev-backup-${timestamp}.db`);
  if (fs.existsSync('./dev.db')) {
    log(`Создаю резервную копию базы данных: ${dbBackupFile}`);
    fs.copyFileSync('./dev.db', dbBackupFile);
  }
  
  return backupFile;
}

function updateSchema() {
  log('Обновляю схему Prisma');
  
  // Создаем новый файл схемы
  fs.writeFileSync(NEW_SCHEMA_FILE, NEW_SCHEMA_CONTENT);
  
  // Создаем резервную копию старой схемы
  const backupFile = createBackup();
  
  // Заменяем старую схему новой
  fs.copyFileSync(NEW_SCHEMA_FILE, SCHEMA_FILE);
  
  // Удаляем временный файл
  fs.unlinkSync(NEW_SCHEMA_FILE);
  
  log(`Схема обновлена. Резервная копия сохранена в: ${backupFile}`);
}

function applyMigrations() {
  log('Применяю миграции к новой схеме');
  
  try {
    // Сбрасываем базу данных (осторожно!)
    log('⚠️  ВНИМАНИЕ: Сброс базы данных приведет к потере всех данных!');
    log('⚠️  Убедитесь, что у вас есть резервная копия!');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Продолжить сброс базы данных? (yes/no): ', (answer) => {
      if (answer.toLowerCase() === 'yes') {
        rl.close();
        
        // Сбрасываем базу
        runCommand('npx prisma migrate reset --force', 'Сброс базы данных');
        
        // Создаем новую миграцию
        runCommand('npx prisma migrate dev --name update-schema', 'Создание новой миграции');
        
        // Генерируем клиент
        runCommand('npx prisma generate', 'Генерация Prisma клиента');
        
        log('🎉 Схема успешно обновлена!');
        log('📋 Проверьте, что все работает корректно');
        
      } else {
        log('❌ Операция отменена пользователем');
        rl.close();
        process.exit(0);
      }
    });
    
  } catch (error) {
    log(`❌ Ошибка при применении миграций: ${error.message}`, 'error');
    throw error;
  }
}

function main() {
  try {
    log('🚀 Начинаю безопасное обновление схемы Prisma');
    
    // Проверяем, что мы в правильной директории
    if (!fs.existsSync(SCHEMA_FILE)) {
      throw new Error('Файл схемы не найден. Убедитесь, что вы находитесь в корневой директории проекта.');
    }
    
    // Проверяем, что Prisma установлен
    try {
      execSync('npx prisma --version', { stdio: 'ignore' });
    } catch {
      throw new Error('Prisma CLI не найден. Установите его: npm install -g prisma');
    }
    
    // Создаем резервную копию
    createBackup();
    
    // Обновляем схему
    updateSchema();
    
    // Применяем миграции
    applyMigrations();
    
  } catch (error) {
    log(`❌ Критическая ошибка: ${error.message}`, 'error');
    log('🔄 Восстанавливаю схему из резервной копии...');
    
    // Пытаемся восстановить из резервной копии
    try {
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.endsWith('.prisma'))
        .sort()
        .reverse();
      
      if (backups.length > 0) {
        const latestBackup = path.join(BACKUP_DIR, backups[0]);
        fs.copyFileSync(latestBackup, SCHEMA_FILE);
        log(`✅ Схема восстановлена из резервной копии: ${latestBackup}`);
      }
    } catch (restoreError) {
      log(`❌ Не удалось восстановить схему: ${restoreError.message}`, 'error');
    }
    
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { main, createBackup, updateSchema, applyMigrations };
