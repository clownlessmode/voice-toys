-- CreateTable
CREATE TABLE "products" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_characteristics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "product_characteristics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
