// Простая функция для получения токена СДЭК
async function fetchCdekToken() {
  const clientId = process.env.CDEK_CLIENT_ID;
  const clientSecret = process.env.CDEK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("CDEK_CLIENT_ID and CDEK_CLIENT_SECRET must be set");
  }

  const tokenUrl = `https://api.cdek.ru/v2/oauth/token?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`;

  const response = await fetch(tokenUrl, { method: "POST" });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get CDEK token: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  return data.access_token;
}

const CDEK_API_URLS = {
  production: "https://api.cdek.ru/v2",
  test: "https://api.edu.cdek.ru/v2",
};

async function checkCdekOrderStatus(orderUuid) {
  try {
    console.log(`🔍 Checking CDEK order status for UUID: ${orderUuid}`);

    const token = await fetchCdekToken();
    console.log("🔑 Token obtained successfully");

    const url = `${CDEK_API_URLS.production}/orders/${orderUuid}`;
    console.log("📡 Requesting:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Response status:", response.status);
    console.log(
      "📥 Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log("📥 Response body:", responseText);

    if (!response.ok) {
      console.error("❌ CDEK API error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      return;
    }

    const orderData = JSON.parse(responseText);
    console.log("✅ CDEK order details:");
    console.log(JSON.stringify(orderData, null, 2));
  } catch (error) {
    console.error("❌ Error checking CDEK order status:", error);
  }
}

// Получаем UUID заказа из аргументов командной строки
const orderUuid = process.argv[2];

if (!orderUuid) {
  console.log("Usage: node scripts/check-cdek-order-status.js <order_uuid>");
  console.log(
    "Example: node scripts/check-cdek-order-status.js d9643930-f2c5-420d-a9c2-47e90b800111"
  );
  process.exit(1);
}

checkCdekOrderStatus(orderUuid)
  .then(() => {
    console.log("✅ Check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });
