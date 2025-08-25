#!/usr/bin/env node

/**
 * Скрипт для обновления схемы Prisma с восстановлением данных
 * 1. Применяет новую схему
 * 2. Очищает БД
 * 3. Восстанавливает данные из папки prisma-backup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const BACKUP_DIR = './prisma-backup';
const SCHEMA_FILE = './prisma/schema.prisma';
const DB_FILE = './dev.db';

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
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function runCommand(command, description) {
  try {
    log(`Выполняю: ${description}`);
    execSync(command, { stdio: 'inherit' });
    log(`${description} выполнено успешно`, 'success');
    return true;
  } catch (error) {
    log(`Ошибка при выполнении: ${description}`, 'error');
    return false;
  }
}

function createBackup() {
  log('Создаю резервную копию текущей схемы и базы данных');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `./backups/schema-update-${timestamp}`;
  
  if (!fs.existsSync('./backups')) {
    fs.mkdirSync('./backups', { recursive: true });
  }
  
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Копируем текущую схему
  if (fs.existsSync(SCHEMA_FILE)) {
    fs.copyFileSync(SCHEMA_FILE, path.join(backupDir, 'schema.prisma'));
    log(`Схема сохранена в: ${backupDir}/schema.prisma`);
  }
  
  // Копируем базу данных
  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(DB_FILE, path.join(backupDir, 'dev.db'));
    log(`База данных сохранена в: ${backupDir}/dev.db`);
  }
  
  // Копируем папку prisma полностью
  if (fs.existsSync('./prisma')) {
    const prismaBackupDir = path.join(backupDir, 'prisma');
    fs.mkdirSync(prismaBackupDir, { recursive: true });
    
    // Рекурсивно копируем все файлы из папки prisma
    function copyDir(src, dest) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const items = fs.readdirSync(src);
      for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        
        if (fs.statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    
    copyDir('./prisma', prismaBackupDir);
    log(`Папка prisma полностью сохранена в: ${prismaBackupDir}`);
  }
  
  return backupDir;
}

function updateSchema() {
  log('Обновляю схему Prisma до версии из продакшена');
  
  // Создаем резервную копию
  const backupDir = createBackup();
  log(`Резервная копия создана в: ${backupDir}`);
  
  // Заменяем схему
  fs.writeFileSync(SCHEMA_FILE, NEW_SCHEMA_CONTENT);
  log('Схема обновлена');
  
  return backupDir;
}

function applyMigration() {
  log('Применяю новую схему к базе данных');
  
  // Сбрасываем базу данных
  if (!runCommand('npx prisma migrate reset --force', 'Сброс базы данных')) {
    throw new Error('Не удалось сбросить базу данных');
  }
  
  // Создаем новую миграцию
  if (!runCommand('npx prisma migrate dev --name update-schema', 'Создание новой миграции')) {
    throw new Error('Не удалось создать миграцию');
  }
  
  // Генерируем клиент
  if (!runCommand('npx prisma generate', 'Генерация Prisma клиента')) {
    throw new Error('Не удалось сгенерировать клиент');
  }
  
  log('Миграция успешно применена');
}

function restoreDataFromBackup(backupDir) {
  log('Восстанавливаю данные из резервной копии');
  
  const prismaBackupDir = path.join(backupDir, 'prisma');
  
  if (!fs.existsSync(prismaBackupDir)) {
    log('Папка prisma в резервной копии не найдена', 'warning');
    return false;
  }
  
  // Проверяем, есть ли файл seed
  const seedFile = path.join(prismaBackupDir, 'seed.ts');
  if (fs.existsSync(seedFile)) {
    log('Найден файл seed.ts, пытаюсь восстановить данные...');
    
    // Копируем seed файл в текущую папку prisma
    fs.copyFileSync(seedFile, './prisma/seed.ts');
    
    // Запускаем seed
    if (runCommand('bun run prisma/seed.ts', 'Восстановление данных через seed')) {
      log('Данные успешно восстановлены через seed');
      return true;
    } else {
      log('Не удалось восстановить данные через seed', 'warning');
    }
  }
  
  // Если seed не сработал, пытаемся восстановить из SQL файлов
  const migrationsDir = path.join(prismaBackupDir, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    log('Найдены миграции в резервной копии');
    
    // Показываем пользователю, что нужно сделать вручную
    log('⚠️  Для восстановления данных из старых миграций выполните вручную:', 'warning');
    log('1. Скопируйте нужные миграции из папки резервной копии в ./prisma/migrations/');
    log('2. Запустите: npx prisma migrate deploy');
    log('3. Или используйте Prisma Studio для ручного восстановления данных');
  }
  
  return false;
}

function main() {
  try {
    log('🚀 Начинаю обновление схемы Prisma с восстановлением данных');
    
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
    
    // Обновляем схему
    const backupDir = updateSchema();
    
    // Применяем миграцию
    applyMigration();
    
    // Восстанавливаем данные
    restoreDataFromBackup(backupDir);
    
    log('🎉 Схема успешно обновлена!');
    log(`📋 Резервная копия сохранена в: ${backupDir}`);
    log('💡 Если данные не восстановились автоматически, используйте Prisma Studio для ручного восстановления');
    log('🔧 Команда: npx prisma studio');
    
  } catch (error) {
    log(`❌ Критическая ошибка: ${error.message}`, 'error');
    log('🔄 Проверьте резервные копии в папке ./backups/');
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { main, createBackup, updateSchema, applyMigration, restoreDataFromBackup };
