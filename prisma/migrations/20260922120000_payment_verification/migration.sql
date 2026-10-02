ALTER TABLE "orders" ADD COLUMN "paymentType" TEXT NOT NULL DEFAULT 'online';
ALTER TABLE "orders" ADD COLUMN "paymentTransactionId" TEXT;
CREATE UNIQUE INDEX "orders_paymentTransactionId_key" ON "orders"("paymentTransactionId");
