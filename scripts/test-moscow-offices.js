// Функция для получения токена СДЭК
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

// Функция для получения офисов СДЭК
async function getCdekOffices(cityCode) {
  const token = await fetchCdekToken();

  const url = `https://api.cdek.ru/v2/deliverypoints?city_code=${cityCode}`;

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

  const data = await response.json();
  return data;
}

async function testMoscowOffices() {
  try {
    console.log("🚀 Testing Moscow CDEK offices...");

    const offices = await getCdekOffices(44); // Код Москвы

    console.log(`📋 Found ${offices.length} offices in Moscow`);

    // Показываем первые 5 офисов
    offices.slice(0, 5).forEach((office, index) => {
      console.log(`\n🏪 Office ${index + 1}:`);
      console.log(`   Code: ${office.code}`);
      console.log(`   Name: ${office.name}`);
      console.log(`   Address: ${office.location.address}`);
      console.log(`   Type: ${office.type}`);
    });

    if (offices.length > 5) {
      console.log(`\n... and ${offices.length - 5} more offices`);
    }

    // Ищем офис с кодом, который начинается с "44" (код Москвы)
    const moscowOffices = offices.filter((office) =>
      office.code.startsWith("44")
    );
    console.log(
      `\n🏪 Found ${moscowOffices.length} offices with code starting with '44'`
    );

    if (moscowOffices.length > 0) {
      console.log("First Moscow office:");
      console.log(`   Code: ${moscowOffices[0].code}`);
      console.log(`   Name: ${moscowOffices[0].name}`);
      console.log(`   Address: ${moscowOffices[0].location.address}`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testMoscowOffices()
  .then(() => {
    console.log("✅ Moscow offices test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Moscow offices test failed:", error);
    process.exit(1);
  });
