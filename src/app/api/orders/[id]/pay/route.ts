import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformOrderFromDB } from "@/lib/order-utils";
import { MODULBANK_CONFIG, verifyCallback } from "@/lib/modulbank";
import { sendOrderNotification } from "@/lib/telegram";
import { createOzonDeliveryOrder } from "@/lib/ozon-delivery/service";

class PaymentCallbackError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

async function readCallback(request: NextRequest): Promise<Record<string, string>> {
  try {
    const fields = new Map<string, string>();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body: unknown = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new PaymentCallbackError("Invalid payment data");
      }
      for (const [key, value] of Object.entries(body)) {
        if (typeof value !== "string" && !(typeof value === "number" && Number.isFinite(value))) {
          throw new PaymentCallbackError("Invalid payment data");
        }
        fields.set(key, String(value));
      }
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        if (typeof value !== "string" || fields.has(key)) {
          throw new PaymentCallbackError("Invalid payment data");
        }
        fields.set(key, value);
      }
    } else {
      throw new PaymentCallbackError("Unsupported payment content type");
    }
    return Object.fromEntries(fields);
  } catch (error) {
    if (error instanceof PaymentCallbackError) throw error;
    throw new PaymentCallbackError("Invalid payment data");
  }
}

function validateCallback(callback: Record<string, string>, orderId: string) {
  if (!MODULBANK_CONFIG.merchant || !MODULBANK_CONFIG.secretKey) {
    throw new PaymentCallbackError("Payment processing is not configured", 503);
  }
  if (!verifyCallback(callback)) throw new PaymentCallbackError("Invalid signature");
  if (
    callback.order_id !== orderId || !callback.transaction_id?.trim() ||
    callback.state !== "COMPLETE" || callback.merchant !== MODULBANK_CONFIG.merchant ||
    callback.testing !== (MODULBANK_CONFIG.testMode ? "1" : "0") ||
    !(/^\d+$/.test(callback.amount ?? "") || /^\d+\.\d{1,2}$/.test(callback.amount ?? ""))
  ) {
    throw new PaymentCallbackError("Invalid payment data");
  }
  const amountMinor = Math.round(Number(callback.amount) * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new PaymentCallbackError("Invalid payment amount");
  }
  return amountMinor;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const callback = await readCallback(request);
    const amountMinor = validateCallback(callback, id);
    const paidOrder = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id } });
      if (!existing) throw new PaymentCallbackError("Order not found", 404);
      const currency = existing.currency === "₽" ? "RUB" : existing.currency;
      if (amountMinor !== Math.round(existing.totalAmount * 100) || callback.currency !== currency) {
        throw new PaymentCallbackError("Payment does not match order");
      }
      if (existing.paymentTransactionId === callback.transaction_id &&
          ["PAID", "SHIPPED", "DELIVERED"].includes(existing.status)) return null;
      if (existing.status !== "CREATED" || existing.paidAt || existing.paymentTransactionId ||
          existing.paymentType !== "online") {
        throw new PaymentCallbackError("Order cannot accept this payment", 409);
      }
      const claimed = await tx.order.updateMany({
        where: { id, status: "CREATED", paidAt: null, paymentTransactionId: null },
        data: { status: "PAID", paidAt: new Date(), paymentTransactionId: callback.transaction_id },
      });
      if (claimed.count !== 1) throw new PaymentCallbackError("Payment is being processed; retry callback", 409);
      if (existing.promoCodeId) {
        await tx.promoCode.update({
          where: { id: existing.promoCodeId }, data: { currentUses: { increment: 1 } },
        });
      }
      const paid = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { product: { include: { characteristics: true } } } }, promoCode: true },
      });
      if (!paid) throw new Error("Paid order missing");
      return paid;
    });

    if (paidOrder) {
      try {
        await sendOrderNotification(transformOrderFromDB(paidOrder), "paid");
      } catch {
        console.error("Paid order notification failed", { orderId: id });
      }
      if (paidOrder.deliveryType === "ozon_pvz") {
        try {
          const shipment = await createOzonDeliveryOrder({ order: paidOrder });
          await prisma.order.update({
            where: { id },
            data: {
              ozonOrderNumber: shipment.orderNumber,
              ozonPostingNumber: shipment.postingNumber,
              ozonDeliveryStatus: "CREATED",
              ozonDeliveryError: null,
              ozonDeliveryCreatedAt: new Date(),
            },
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message.slice(0, 240) : "Неизвестная ошибка Ozon";
          await prisma.order.update({
            where: { id },
            data: {
              ozonDeliveryStatus: "CREATE_FAILED",
              ozonDeliveryError: `Не удалось создать отправление Ozon: ${reason}`,
            },
          });
          console.error("Ozon Delivery registration failed", { orderId: id, reason });
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PaymentCallbackError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Transaction already belongs to an order" }, { status: 409 });
    }
    console.error("Payment callback could not be committed");
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}
