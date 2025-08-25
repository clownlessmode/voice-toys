#!/usr/bin/env node

/**
 * Скрипт для инкрементального обновления схемы Prisma
 * Пытается сохранить данные при обновлении схемы
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const BACKUP_DIR = './backups';
const SCHEMA_FILE = './prisma/schema.prisma';

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
  
  // Создаем резервную копию старой схемы
  const backupFile = createBackup();
  
  // Заменяем схему
  fs.writeFileSync(SCHEMA_FILE, NEW_SCHEMA_CONTENT);
  
  log(`Схема обновлена. Резервная копия сохранена в: ${backupFile}`);
}

function tryIncrementalMigration() {
  log('Пытаюсь применить инкрементальную миграцию');
  
  try {
    // Сначала пытаемся создать миграцию
    if (runCommand('npx prisma migrate dev --name update-schema --create-only', 'Создание миграции')) {
      log('Миграция создана успешно. Проверяю её содержимое...');
      
      // Проверяем, что миграция создалась
      const migrationsDir = './prisma/migrations';
      if (fs.existsSync(migrationsDir)) {
        const migrations = fs.readdirSync(migrationsDir)
          .filter(dir => dir.includes('update-schema'))
          .sort()
          .reverse();
        
        if (migrations.length > 0) {
          const latestMigration = migrations[0];
          const migrationFile = path.join(migrationsDir, latestMigration, 'migration.sql');
          
          if (fs.existsSync(migrationFile)) {
            const migrationContent = fs.readFileSync(migrationFile, 'utf8');
            log(`Содержимое миграции:\n${migrationContent}`);
            
            // Спрашиваем пользователя о применении
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            
            rl.question('Применить эту миграцию? (yes/no): ', (answer) => {
              if (answer.toLowerCase() === 'yes') {
                rl.close();
                
                if (runCommand('npx prisma migrate deploy', 'Применение миграции')) {
                  log('Миграция применена успешно!', 'success');
                  
                  // Генерируем клиент
                  if (runCommand('npx prisma generate', 'Генерация Prisma клиента')) {
                    log('🎉 Схема успешно обновлена с сохранением данных!', 'success');
                  }
                } else {
                  log('❌ Не удалось применить миграцию', 'error');
                  log('🔄 Попробуйте ручную миграцию или сброс базы данных');
                }
              } else {
                log('❌ Миграция отменена пользователем', 'warning');
                rl.close();
              }
            });
          }
        }
      }
    } else {
      log('❌ Не удалось создать миграцию', 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка при инкрементальной миграции: ${error.message}`, 'error');
    return false;
  }
}

function main() {
  try {
    log('🚀 Начинаю инкрементальное обновление схемы Prisma');
    
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
    updateSchema();
    
    // Пытаемся применить инкрементальную миграцию
    if (!tryIncrementalMigration()) {
      log('⚠️  Инкрементальная миграция не удалась', 'warning');
      log('💡 Попробуйте запустить: npm run update-schema-safely');
    }
    
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
        log(`✅ Схема восстановлена из резервной копии: ${latestBackup}`, 'success');
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

module.exports = { main, createBackup, updateSchema, tryIncrementalMigration };
