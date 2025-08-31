/* eslint-disable @typescript-eslint/no-explicit-any */
import { Order } from "@/components/entities/order/model/types";
import nodemailer from "nodemailer"; // если ругается — попробуй: import * as nodemailer from "nodemailer";
const TELEGRAM_BOT_TOKEN = "7749626891:AAGwK5_ZSNoCy_H91prfz4BMVGwmByfv24k";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "@voice_toys_orders"; // Можно настроить через env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "eclipselucky@gmail.com",
    pass: "rrsp cziy zmze xdxo", // пароль приложения Gmail
  },
  logger: false, // общий лог
  debug: true, // SMTP-трафик
});

// Проверка подключения и авторизации (1 раз при старте)
transporter
  .verify()
  .then(() => console.log("[MAIL] Transport ready (verify ok)"))
  .catch((err) =>
    console.error("[MAIL] Transport verify failed:", err?.message || err)
  );

async function sendEmailToMe(subject: string, text: string): Promise<void> {
  const to = "clownessmode@bk.ru"; // оставляю как в твоём коде (если нужно на другой адрес — поменяй тут)
  const mailOptions = {
    from: "eclipselucky@gmail.com",
    to,
    subject,
    text,
    html: text.replace(/\n/g, "<br>"),
  };

  const start = Date.now();
  console.log(
    `[MAIL] Try send -> to=${to} subject="${subject}" text_len=${text.length}`
  );

  try {
    const info = await transporter.sendMail(mailOptions);
    const ms = Date.now() - start;

    console.log(`[MAIL] SENT ok in ${ms}ms id=${info.messageId}`);
    if (info.response) console.log(`[MAIL] response: ${info.response}`);
    if (info.accepted?.length)
      console.log(`[MAIL] accepted: ${info.accepted.join(", ")}`);
    if (info.rejected?.length)
      console.warn(`[MAIL] rejected: ${info.rejected.join(", ")}`);
    if (info.envelope) console.log("[MAIL] envelope:", info.envelope);
  } catch (e: any) {
    const ms = Date.now() - start;
    console.error(`[MAIL] FAIL in ${ms}ms: ${e?.message || e}`);
    if (e?.response) console.error(`[MAIL] smtp response: ${e.response}`);
    if (e?.code) console.error(`[MAIL] code: ${e.code} command: ${e.command}`);
  }
}
// Функция для экранирования символов в Markdown v2
function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// Функция для отправки сообщения в Telegram
async function sendTelegramMessage(message: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "MarkdownV2",
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Ошибка отправки в Telegram:", result);
      return false;
    }

    console.log("Сообщение отправлено в Telegram:", result);
    return true;
  } catch (error) {
    console.error("Ошибка при отправке в Telegram:", error);
    return false;
  }
}

export interface OrderExtended extends Order {
  customerEmail?: string;
}
// Функция для форматирования заказа в красивое сообщение
export async function sendOrderNotification(
  order: OrderExtended,
  type: "created" | "paid"
): Promise<boolean> {
  try {
    const emoji = type === "paid" ? "💰" : "🛒";
    const title = type === "paid" ? "ЗАКАЗ ОПЛАЧЕН" : "НОВЫЙ ЗАКАЗ";

    // Экранируем данные
    const orderNumber = escapeMarkdownV2(order.orderNumber);
    const customerName = escapeMarkdownV2(order.customerName);
    const customerPhone = escapeMarkdownV2(order.customerPhone);
    const amount = escapeMarkdownV2(order.totalAmount.toString());
    const currency = escapeMarkdownV2(order.currency);

    // Форматируем товары
    const itemsText = order.items
      .map((item) => {
        const name = escapeMarkdownV2(item.product.name);
        const quantity = escapeMarkdownV2(item.quantity.toString());
        const price = escapeMarkdownV2(item.price.toString());
        return `  • ${name} \\- ${quantity} шт\\. \\(${price} ${currency}\\)`;
      })
      .join("\n");

    // Определяем тип доставки
    const deliveryType =
      order.deliveryType === "pickup" ? "Самовывоз" : "Доставка";
    const deliveryText = escapeMarkdownV2(deliveryType);

    // Добавляем адрес если есть
    let deliveryInfo = deliveryText;
    if (order.deliveryAddress) {
      const address = escapeMarkdownV2(order.deliveryAddress);
      deliveryInfo += `\n*Адрес:* ${address}`;
    }

    const message = `${emoji} *${title}*

*Заказ:* ${orderNumber}
*Клиент:* ${customerName}
*Телефон:* ${customerPhone}

*Товары:*
${itemsText}

*Итого:* ${amount} ${currency}

*Доставка:* ${deliveryInfo}

*Время:* ${escapeMarkdownV2(new Date().toLocaleString("ru-RU"))}`;
    const emailSubject = `${title} — ${order.orderNumber}`;
    const emailText = message.replace(/\\/g, ""); // убираем экранирование Markdown из текста
    sendEmailToMe(emailSubject, emailText).catch(() => {});
    return await sendTelegramMessage(message);
  } catch (error) {
    console.error("Ошибка формирования уведомления:", error);
    return false;
  }
}
