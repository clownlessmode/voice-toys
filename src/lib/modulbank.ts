import crypto from "crypto";

// Конфигурация Modulbank из переменных окружения
export const MODULBANK_CONFIG = {
  merchant: process.env.STORE_ID || "",
  secretKey:
    process.env.NODE_ENV === "production"
      ? process.env.REAL_KEY || ""
      : process.env.TEST_KEY || "",
  testMode: process.env.NODE_ENV !== "production",
  paymentUrl: "https://pay.modulbank.ru/pay",
  successUrl:
    process.env.MODULBANK_SUCCESS_URL || "https://pay.modulbank.ru/success",
  callbackUrl: process.env.MODULBANK_CALLBACK_URL || "",
};

export interface ModulbankPaymentData {
  merchant: string;
  amount: string;
  order_id: string;
  custom_order_id?: string;
  description: string;
  success_url: string;
  testing?: "0" | "1";
  callback_url?: string;
  callback_on_failure?: "0" | "1";
  client_phone?: string;
  client_name?: string;
  client_email?: string;
  client_id?: string;
  meta?: string;
  receipt_contact?: string;
  receipt_items?: string;
  unix_timestamp: string;
  lifetime?: string;
  timeout_url?: string;
  salt: string;
  signature: string;
  start_recurrent?: "0" | "1";
  preauth?: "0" | "1";
  show_payment_methods?: string;
  callback_with_receipt?: "0" | "1";
}

export interface ReceiptItem {
  discount_sum?: number;
  name: string;
  payment_method:
    | "full_prepayment"
    | "partial_prepayment"
    | "advance"
    | "full_payment"
    | "partial_payment"
    | "credit"
    | "credit_payment";
  payment_object:
    | "commodity"
    | "excise"
    | "job"
    | "service"
    | "gambling_bet"
    | "gambling_prize"
    | "lottery"
    | "lottery_prize"
    | "intellectual_activity"
    | "payment"
    | "agent_commission"
    | "composite"
    | "another";
  price: number;
  quantity: number;
  sno: "osn" | "usn_income" | "usn_income_outcome" | "envd" | "esn" | "patent";
  vat: "vat0" | "vat10" | "vat20" | "vat110" | "vat120" | "without_vat";
}

// Генерация случайной соли
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Алгоритм вычисления подписи согласно документации Modulbank
export function generateSignature(
  data: Partial<ModulbankPaymentData>,
  secretKey: string
): string {
  // 1. Фильтруем и сортируем ключи (исключаем signature и пустые значения)
  const sortedKeys = Object.keys(data)
    .filter(
      (key) =>
        key !== "signature" &&
        data[key as keyof ModulbankPaymentData] !== undefined &&
        data[key as keyof ModulbankPaymentData] !== "" &&
        data[key as keyof ModulbankPaymentData] !== null
    )
    .sort();

  // 2. Кодируем каждое значение в Base64 и формируем строку
  const signatureString = sortedKeys
    .map((key) => {
      const value = data[key as keyof ModulbankPaymentData] as string;
      const base64Value = Buffer.from(value, "utf8").toString("base64");
      return `${key}=${base64Value}`;
    })
    .join("&");

  console.log("Data for signature:", data);
  console.log("Sorted keys:", sortedKeys);
  console.log("Signature string with base64:", signatureString);

  // 3. Двойное SHA1 шифрование: SHA1(secret_key + SHA1(secret_key + values))
  const innerHash = crypto
    .createHash("sha1")
    .update(secretKey + signatureString, "utf8")
    .digest("hex");

  const signature = crypto
    .createHash("sha1")
    .update(secretKey + innerHash, "utf8")
    .digest("hex")
    .toLowerCase();

  console.log("Inner hash:", innerHash);
  console.log("Generated signature:", signature);

  return signature;
}

// Создание данных для платежа
export function createPaymentData(params: {
  orderId: string;
  amount: number;
  description: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  receiptItems?: ReceiptItem[];
  customOrderId?: string;
  callbackUrl?: string;
  successUrl?: string;
}): ModulbankPaymentData {
  const salt = generateSalt();
  const unixTimestamp = Math.floor(Date.now() / 1000).toString();

  // Создаем объект только с заполненными полями
  const baseData: Partial<ModulbankPaymentData> = {
    merchant: MODULBANK_CONFIG.merchant,
    amount: params.amount.toFixed(2),
    order_id: params.orderId,
    description: params.description,
    success_url: params.successUrl || MODULBANK_CONFIG.successUrl,
    testing: MODULBANK_CONFIG.testMode ? "1" : "0",
    unix_timestamp: unixTimestamp,
    salt,
  };

  // Добавляем callback URL для обработки платежей
  if (params.callbackUrl || MODULBANK_CONFIG.callbackUrl) {
    baseData.callback_url = params.callbackUrl || MODULBANK_CONFIG.callbackUrl;
    baseData.callback_on_failure = "1";
  }

  // if (params.customerName) {
  //   baseData.client_name = params.customerName;
  // }

  // if (params.customerPhone) {
  //   baseData.client_phone = params.customerPhone;
  // }

  // if (params.customerEmail) {
  //   baseData.client_email = params.customerEmail;
  //   baseData.receipt_contact = params.customerEmail;
  // }

  // Добавляем чек если есть товары
  if (params.receiptItems && params.receiptItems.length > 0) {
    baseData.receipt_items = JSON.stringify(params.receiptItems);
  }

  // Генерируем подпись
  const signature = generateSignature(baseData, MODULBANK_CONFIG.secretKey);

  return {
    ...baseData,
    signature,
  } as ModulbankPaymentData;
}

// Проверка подписи для callback
export function verifyCallback(callbackData: Record<string, string>): boolean {
  const { signature: receivedSignature, ...dataWithoutSignature } =
    callbackData;

  if (!receivedSignature) {
    return false;
  }

  const expectedSignature = generateSignature(
    dataWithoutSignature,
    MODULBANK_CONFIG.secretKey
  );
  return expectedSignature === receivedSignature.toLowerCase();
}

// Генерация HTML формы для отправки на Modulbank
export function generatePaymentForm(paymentData: ModulbankPaymentData): string {
  const inputs = Object.entries(paymentData)
    .filter(
      ([, value]) => value !== undefined && value !== "" && value !== null
    )
    .map(([key, value]) => {
      // Правильное экранирование HTML атрибутов
      let escapedValue = String(value);

      // Экранируем специальные символы HTML
      escapedValue = escapedValue
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `<input type="hidden" name="${key}" value="${escapedValue}">`;
    })
    .join("\n        ");

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Перенаправление на оплату</title>
</head>
<body>
    <form method="post" action="${MODULBANK_CONFIG.paymentUrl}" id="modulbank-payment-form">
        ${inputs}
        <noscript>
            <input type="submit" value="Перейти к оплате">
        </noscript>
    </form>
    <script>
        // Автоматическая отправка формы
        document.getElementById('modulbank-payment-form').submit();
    </script>
</body>
</html>`;
}
