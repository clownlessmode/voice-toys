-- Product.wbNmId: Wildberries nmID as INTEGER; catalog IDs fit SQLite INTEGER / typical JS Number use.

-- CreateTable
CREATE TABLE "wb_sync_state" (
    "key" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "mode" TEXT NOT NULL DEFAULT 'incremental',
    "cursorUpdatedAt" TEXT,
    "cursorNmId" INTEGER,
    "lastRunAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastError" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wbNmId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "wbCardUpdatedAt" DATETIME,
    "name" TEXT NOT NULL,
    "breadcrumbs" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "oldPrice" REAL,
    "discountPercent" INTEGER,
    "currency" TEXT NOT NULL DEFAULT '₽',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "pickupAvailability" TEXT NOT NULL,
    "deliveryAvailability" TEXT NOT NULL,
    "returnDays" INTEGER NOT NULL DEFAULT 14,
    "returnDetails" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "videoUrl" TEXT,
    "categories" TEXT NOT NULL,
    "ageGroups" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("ageGroups", "breadcrumbs", "categories", "createdAt", "currency", "deliveryAvailability", "description", "discountPercent", "favorite", "id", "images", "name", "oldPrice", "pickupAvailability", "price", "returnDays", "returnDetails", "updatedAt", "videoUrl") SELECT "ageGroups", "breadcrumbs", "categories", "createdAt", "currency", "deliveryAvailability", "description", "discountPercent", "favorite", "id", "images", "name", "oldPrice", "pickupAvailability", "price", "returnDays", "returnDetails", "updatedAt", "videoUrl" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_wbNmId_key" ON "products"("wbNmId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
