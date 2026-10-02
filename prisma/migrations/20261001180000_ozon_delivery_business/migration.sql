ALTER TABLE "orders" ADD COLUMN "deliveryCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "ozonDeliveryPointId" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonShipmentMethodId" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonCutoffAt" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonIdempotencyKey" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonOrderNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonPostingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonDeliveryStatus" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonDeliveryError" TEXT;
ALTER TABLE "orders" ADD COLUMN "ozonDeliveryCreatedAt" DATETIME;

CREATE UNIQUE INDEX "orders_ozonIdempotencyKey_key" ON "orders"("ozonIdempotencyKey");
