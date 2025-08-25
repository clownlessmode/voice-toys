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

async function getOfficeAddress(officeCode) {
  try {
    console.log(`🔍 Getting address for office: ${officeCode}`);

    const token = await fetchCdekToken();
    console.log("🔑 Token obtained successfully");

    // Получаем информацию об офисе по коду
    const url = `https://api.cdek.ru/v2/deliverypoints?code=${officeCode}`;
    console.log("📡 Requesting:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch office: ${response.status} ${response.statusText}`
      );
    }

    const offices = await response.json();
    console.log("📥 Response:", JSON.stringify(offices, null, 2));

    if (offices.length === 0) {
      console.log("❌ Office not found");
      return null;
    }

    const office = offices[0];
    console.log("✅ Office found:");
    console.log("   Code:", office.code);
    console.log("   Address:", office.location.address);
    console.log("   Type:", office.type);
    console.log("   Work time:", office.work_time);
    console.log("   Phones:", office.phones);

    return office.location.address;
  } catch (error) {
    console.error("❌ Error getting office address:", error);
    return null;
  }
}

// Получаем код офиса из аргументов командной строки
const officeCode = process.argv[2] || "MSK124";

getOfficeAddress(officeCode)
  .then((address) => {
    if (address) {
      console.log("✅ Office address:", address);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
