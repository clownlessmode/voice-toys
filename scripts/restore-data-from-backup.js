#!/usr/bin/env node

/**
 * Скрипт для восстановления данных из папки prisma-backup
 * Используйте этот скрипт, если у вас есть папка prisma-backup с данными
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Конфигурация
const BACKUP_SOURCE = './prisma-backup';
const CURRENT_PRISMA = './prisma';

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

function checkBackupExists() {
  if (!fs.existsSync(BACKUP_SOURCE)) {
    log(`Папка ${BACKUP_SOURCE} не найдена!`, 'error');
    log('Убедитесь, что у вас есть папка prisma-backup с данными', 'warning');
    return false;
  }
  
  log(`Найдена папка резервной копии: ${BACKUP_SOURCE}`);
  return true;
}

function showBackupContents() {
  log('Содержимое папки резервной копии:');
  
  function listDir(dir, indent = '') {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        log(`${indent}📁 ${item}/`);
        listDir(itemPath, indent + '  ');
      } else {
        const size = stats.size;
        const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
        log(`${indent}📄 ${item} (${sizeStr})`);
      }
    }
  }
  
  listDir(BACKUP_SOURCE);
}

function restoreSeedFile() {
  const seedFile = path.join(BACKUP_SOURCE, 'seed.ts');
  
  if (fs.existsSync(seedFile)) {
    log('Найден файл seed.ts в резервной копии');
    
    // Копируем seed файл
    fs.copyFileSync(seedFile, path.join(CURRENT_PRISMA, 'seed.ts'));
    log('Файл seed.ts скопирован в текущую папку prisma');
    
    // Запускаем seed
    if (runCommand('bun run prisma/seed.ts', 'Восстановление данных через seed')) {
      log('✅ Данные успешно восстановлены через seed!');
      return true;
    } else {
      log('❌ Не удалось восстановить данные через seed', 'warning');
      return false;
    }
  } else {
    log('Файл seed.ts не найден в резервной копии', 'warning');
    return false;
  }
}

function restoreMigrations() {
  const migrationsDir = path.join(BACKUP_SOURCE, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    log('Папка migrations не найдена в резервной копии', 'warning');
    return false;
  }
  
  log('Найдены миграции в резервной копии');
  
  // Показываем доступные миграции
  const migrations = fs.readdirSync(migrationsDir)
    .filter(item => fs.statSync(path.join(migrationsDir, item)).isDirectory())
    .sort();
  
  log(`Доступные миграции (${migrations.length}):`);
  migrations.forEach((migration, index) => {
    log(`  ${index + 1}. ${migration}`);
  });
  
  // Спрашиваем пользователя, какие миграции применить
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Применить все миграции из резервной копии? (yes/no): ', (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'yes') {
        log('Копирую миграции из резервной копии...');
        
        // Создаем папку migrations если её нет
        const currentMigrationsDir = path.join(CURRENT_PRISMA, 'migrations');
        if (!fs.existsSync(currentMigrationsDir)) {
          fs.mkdirSync(currentMigrationsDir, { recursive: true });
        }
        
        // Копируем все миграции
        for (const migration of migrations) {
          const srcPath = path.join(migrationsDir, migration);
          const destPath = path.join(currentMigrationsDir, migration);
          
          // Рекурсивно копируем папку миграции
          function copyMigrationDir(src, dest) {
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true });
            }
            
            const items = fs.readdirSync(src);
            for (const item of items) {
              const itemSrcPath = path.join(src, item);
              const itemDestPath = path.join(dest, item);
              
              if (fs.statSync(itemSrcPath).isDirectory()) {
                copyMigrationDir(itemSrcPath, itemDestPath);
              } else {
                fs.copyFileSync(itemSrcPath, itemDestPath);
              }
            }
          }
          
          copyMigrationDir(srcPath, destPath);
          log(`  ✅ Скопирована миграция: ${migration}`);
        }
        
        log('Все миграции скопированы. Теперь применяю их...');
        
        if (runCommand('npx prisma migrate deploy', 'Применение миграций из резервной копии')) {
          log('✅ Миграции успешно применены!');
          resolve(true);
        } else {
          log('❌ Не удалось применить миграции', 'error');
          resolve(false);
        }
      } else {
        log('Миграции не применены', 'warning');
        resolve(false);
      }
    });
  });
}

function restoreDatabaseFile() {
  const dbFile = path.join(BACKUP_SOURCE, 'dev.db');
  
  if (fs.existsSync(dbFile)) {
    log('Найден файл базы данных в резервной копии');
    
    const currentDbFile = './dev.db';
    
    // Создаем резервную копию текущей БД
    if (fs.existsSync(currentDbFile)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `./dev-backup-${timestamp}.db`;
      fs.copyFileSync(currentDbFile, backupFile);
      log(`Текущая БД сохранена в: ${backupFile}`);
    }
    
    // Восстанавливаем БД из резервной копии
    fs.copyFileSync(dbFile, currentDbFile);
    log('База данных восстановлена из резервной копии');
    
    // Генерируем клиент
    if (runCommand('npx prisma generate', 'Генерация Prisma клиента')) {
      log('✅ Prisma клиент сгенерирован');
      return true;
    } else {
      log('❌ Не удалось сгенерировать клиент', 'error');
      return false;
    }
  } else {
    log('Файл базы данных не найден в резервной копии', 'warning');
    return false;
  }
}

async function main() {
  try {
    log('🔍 Проверяю наличие резервной копии...');
    
    if (!checkBackupExists()) {
      process.exit(1);
    }
    
    // Показываем содержимое резервной копии
    showBackupContents();
    
    log('\n🚀 Начинаю восстановление данных...');
    
    // Пытаемся восстановить через seed
    let restored = restoreSeedFile();
    
    // Если seed не сработал, пытаемся восстановить миграции
    if (!restored) {
      log('\n🔄 Пытаюсь восстановить через миграции...');
      restored = await restoreMigrations();
    }
    
    // Если и миграции не сработали, пытаемся восстановить файл БД
    if (!restored) {
      log('\n🔄 Пытаюсь восстановить файл базы данных...');
      restored = restoreDatabaseFile();
    }
    
    if (restored) {
      log('\n🎉 Данные успешно восстановлены!');
      log('💡 Проверьте данные в Prisma Studio: npx prisma studio');
    } else {
      log('\n⚠️  Автоматическое восстановление не удалось', 'warning');
      log('💡 Для ручного восстановления:', 'warning');
      log('1. Откройте Prisma Studio: npx prisma studio');
      log('2. Скопируйте данные из старой БД в новую');
      log('3. Или используйте SQLite Browser для работы с файлом БД');
    }
    
  } catch (error) {
    log(`❌ Критическая ошибка: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { main, checkBackupExists, restoreSeedFile, restoreMigrations, restoreDatabaseFile };
