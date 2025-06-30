-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "categories" TEXT NOT NULL,
    "ageGroups" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("ageGroups", "breadcrumbs", "categories", "createdAt", "currency", "deliveryAvailability", "description", "discountPercent", "favorite", "id", "images", "name", "oldPrice", "pickupAvailability", "price", "returnDays", "returnDetails", "updatedAt") SELECT "ageGroups", "breadcrumbs", "categories", "createdAt", "currency", "deliveryAvailability", "description", "discountPercent", "favorite", "id", "images", "name", "oldPrice", "pickupAvailability", "price", "returnDays", "returnDetails", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
