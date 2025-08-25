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

async function findCdekOffice() {
  try {
    console.log("🔍 Searching for CDEK office by address...");

    const targetAddress = "Москва, Варшавское шоссе 160 к2 3 кабинет 1 этаж";
    console.log("📍 Target address:", targetAddress);

    const token = await fetchCdekToken();
    console.log("🔑 Token obtained successfully");

    // Получаем офисы для Москвы (код 44)
    const url = `https://api.cdek.ru/v2/deliverypoints?city_code=44&size=1000`;
    console.log("📡 Requesting:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch offices: ${response.status} ${response.statusText}`
      );
    }

    const offices = await response.json();
    console.log(`🏪 Found ${offices.length} offices in Moscow`);

    // Нормализуем целевой адрес для поиска
    const normalizedTarget = targetAddress
      .toLowerCase()
      .replace(/[.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    console.log("🔍 Normalized target address:", normalizedTarget);

    // Ищем офис по адресу
    for (const office of offices) {
      const officeAddress = office.location.address
        .toLowerCase()
        .replace(/[.,]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Проверяем, содержит ли адрес офиса ключевые слова из целевого адреса
      const targetWords = normalizedTarget
        .split(" ")
        .filter((word) => word.length > 2);
      const officeWords = officeAddress
        .split(" ")
        .filter((word) => word.length > 2);

      // Ищем совпадения ключевых слов
      const matches = targetWords.filter((word) =>
        officeWords.some(
          (officeWord) => officeWord.includes(word) || word.includes(officeWord)
        )
      );

      if (matches.length >= 2) {
        // Минимум 2 совпадения для точности
        console.log("✅ Found matching office:");
        console.log("   Code:", office.code);
        console.log("   Address:", office.location.address);
        console.log("   Type:", office.type);
        console.log("   Matches:", matches);
        console.log("");
        console.log("📋 Use this code in your CDEK integration:");
        console.log(`   shipment_point: "${office.code}"`);
        return office.code;
      }
    }

    console.log("❌ No matching office found");
    console.log("🔍 Available offices with 'варшавск' in address:");

    // Показываем офисы с похожими адресами
    const similarOffices = offices.filter((office) =>
      office.location.address.toLowerCase().includes("варшавск")
    );

    similarOffices.forEach((office) => {
      console.log(`   ${office.code}: ${office.location.address}`);
    });
  } catch (error) {
    console.error("❌ Error finding CDEK office:", error);
  }
}

findCdekOffice()
  .then((officeCode) => {
    if (officeCode) {
      console.log("✅ Office found! Code:", officeCode);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
