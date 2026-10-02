import { expect, test, type Page } from "@playwright/test";
import { generateSignature } from "../../src/lib/modulbank";

async function addSeedProductToCart(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Перейти в каталог" }).first().click();
  await expect(page).toHaveURL(/\/catalogue/);
  await expect(page.getByText("Бизиборд с часами").first()).toBeVisible();
  await page.getByText("Бизиборд с часами").first().click();
  await expect(page).toHaveURL(/\/catalogue\/225904711/);
  await expect(page.getByRole("heading", { name: "Бизиборд с часами" }).first()).toBeVisible();
  await page.locator("button:visible").filter({ hasText: "В корзину" }).first().click();
  await expect(page.locator("button:visible").filter({ hasText: "Добавлено в корзину" })).toBeVisible();
}

test("покупатель проходит весь путь, а заказ появляется у администратора", async ({ page }) => {
  await addSeedProductToCart(page);

  await page.locator("button:visible").filter({ hasText: "Добавить в избранное" }).click();
  await expect(page.locator("button:visible").filter({ hasText: "Убрать из избранного" })).toBeVisible();

  await page.goto("/favorites");
  await expect(page.getByText("Бизиборд с часами").first()).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Корзина" })).toBeVisible();
  await expect(page.getByText("1790 ₽").first()).toBeVisible();
  await page.getByRole("link", { name: "Перейти к оформлению" }).click();

  await expect(page.getByRole("heading", { name: "Оформление заказа" })).toBeVisible();
  await page.getByLabel("Имя *").fill("Е2Е Покупатель");
  await page.getByLabel("Телефон *").fill("79991234567");
  await page.getByLabel("Email").fill("e2e@example.test");
  await expect(page.getByLabel("Тип доставки").locator("option")).toHaveCount(2);
  await expect(page.getByLabel("Тип доставки")).not.toContainText("СДЭК");
  await page.getByLabel("Тип доставки").selectOption("pickup");
  await page.getByLabel("Тип оплаты").selectOption("cash_on_delivery");
  await page.getByRole("button", { name: "Оформить заказ" }).click();

  await expect(page).toHaveURL(/\/order\/success\/[a-z0-9-]+/i);
  await expect(page.getByRole("heading", { name: "Заказ успешно оформлен!" })).toBeVisible();
  const orderId = page.url().split("/").pop();
  expect(orderId).toBeTruthy();

  await page.goto("/cart");
  await expect(page.getByText("Корзина пуста")).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Пароль").fill("неверный пароль");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByText("Неверный пароль")).toBeVisible();
  await page.getByLabel("Пароль").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();
  await expect(page.getByText("Е2Е Покупатель").first()).toBeVisible();
  await page.getByPlaceholder("Поиск заказов...").fill("Е2Е Покупатель");
  await expect(page.getByText("Е2Е Покупатель").first()).toBeVisible();
  await page.getByRole("link", { name: "" }).filter({ has: page.locator("svg") }).last().click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${orderId}$`));
  await expect(page.locator("p:visible").filter({ hasText: "Е2Е Покупатель" }).first()).toBeVisible();
  await expect(page.getByText("Самовывоз").filter({ visible: true }).first()).toBeVisible();
});

test("реальная интеграция Ozon согласованно показывает доступность ПВЗ", async ({ page, request }) => {
  const apiResponse = await request.get("/api/ozon-delivery/points?limit=100");
  expect(apiResponse.ok()).toBeTruthy();
  const apiData = await apiResponse.json();
  expect(Array.isArray(apiData.points)).toBeTruthy();

  await addSeedProductToCart(page);
  await page.goto("/order");
  await page.getByLabel("Телефон *").fill("79991234567");
  await page.getByLabel("Тип доставки").selectOption("ozon_pvz");
  const pointSelect = page.getByLabel("Пункт выдачи Ozon *");

  if (apiData.points.length === 0) {
    await expect(page.getByText("Ozon пока не вернул доступные пункты выдачи для этого кабинета")).toBeVisible();
    await expect(pointSelect).toBeDisabled();
    await expect(page.getByRole("button", { name: "Оформить заказ" })).toBeDisabled();
  } else {
    await expect(pointSelect.locator("option")).toHaveCount(apiData.points.length + 1);
    await expect(pointSelect).toBeEnabled();
  }
});

test("покупатель получает живой расчёт Ozon без создания заказа", async ({ page }) => {
  const phone = process.env.OZON_E2E_PHONE;
  test.skip(!phone, "Для живого расчёта задайте OZON_E2E_PHONE с номером клиента Ozon");

  let createOrderRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/orders/create") {
      createOrderRequests += 1;
    }
  });

  await addSeedProductToCart(page);
  await page.goto("/cart");
  await page.getByRole("link", { name: "Перейти к оформлению" }).click();
  await expect(page.getByRole("heading", { name: "Оформление заказа" })).toBeVisible();

  await page.getByLabel("Телефон *").fill(phone!);
  await page.getByLabel("Тип доставки").selectOption("ozon_pvz");

  const pointSelect = page.getByLabel("Пункт выдачи Ozon *");
  await expect(pointSelect).toBeEnabled({ timeout: 30_000 });
  await expect(pointSelect.locator("option")).not.toHaveCount(1, { timeout: 30_000 });
  await pointSelect.selectOption({ index: 1 });

  await expect(page.getByText(/Доставка: \d+(?:[.,]\d+)? ₽/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Оформить заказ" })).toBeEnabled();
  expect(createOrderRequests).toBe(0);
});

test("товар дешевле 100 рублей доступен только для самовывоза", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Пароль").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const productResponse = await page.request.post("/api/products", {
    data: {
      name: "Тестовый товар 99 рублей",
      breadcrumbs: ["Главная", "Тест"],
      images: ["https://placehold.co/600x400?text=99"],
      price: 99,
      currency: "₽",
      pickupAvailability: "Самовывоз сегодня",
      deliveryAvailability: "Доставка от 1 дня",
      returnDetails: "Возврат в течение 14 дней",
      description: "Проверка ограничения Ozon Доставки",
      characteristics: [{ key: "Вес", value: "100 г" }],
      categories: ["Тест"],
      ageGroups: ["3+"],
    },
  });
  expect(productResponse.status()).toBe(201);
  const product = await productResponse.json() as { id: string };

  await page.goto(`/catalogue/${product.id}`);
  await expect(page.locator("p:visible").filter({
    hasText: "Ozon Доставка недоступна — только самовывоз",
  }).first()).toBeVisible();
  await page.locator("button:visible").filter({ hasText: "В корзину" }).first().click();
  await page.goto("/cart");
  await page.getByRole("link", { name: "Перейти к оформлению" }).click();

  const deliveryType = page.getByLabel("Тип доставки");
  await expect(deliveryType.locator('option[value="ozon_pvz"]')).toBeDisabled();
  await expect(page.getByText(/товары дешевле 100 ₽ можно заказать только самовывозом/)).toBeVisible();
  await page.getByLabel("Имя *").fill("E2E Самовывоз");
  await page.getByLabel("Телефон *").fill("79991234567");
  await deliveryType.selectOption("pickup");
  await page.getByLabel("Тип оплаты").selectOption("cash_on_delivery");
  await page.getByRole("button", { name: "Оформить заказ" }).click();
  await expect(page).toHaveURL(/\/order\/success\/[a-z0-9-]+/i);
  await expect(page.getByRole("heading", { name: "Заказ успешно оформлен!" })).toBeVisible();
});

test("оплаченный заказ автоматически уходит в Ozon и отменяется через интерфейс", async ({ page, request }) => {
  const phone = process.env.OZON_E2E_PHONE;
  const merchant = process.env.STORE_ID;
  const secret = process.env.TEST_KEY;
  test.skip(process.env.OZON_E2E_CREATE !== "1", "Живое создание Ozon включается явно");
  test.skip(!phone || !merchant || !secret, "Нужны OZON_E2E_PHONE, STORE_ID и TEST_KEY");

  let orderId = "";
  let cancellationRequested = false;

  try {
    await page.route("https://pay.modulbank.ru/**", (route) => route.abort());
    await addSeedProductToCart(page);
    await page.goto("/cart");
    await page.getByRole("link", { name: "Перейти к оформлению" }).click();
    await page.getByLabel("Имя *").fill("E2E Ozon");
    await page.getByLabel("Телефон *").fill(phone!);
    await page.getByLabel("Email").fill("e2e-ozon@example.test");
    await page.getByLabel("Тип доставки").selectOption("ozon_pvz");

    const pointSelect = page.getByLabel("Пункт выдачи Ozon *");
    await expect(pointSelect).toBeEnabled({ timeout: 30_000 });
    await expect(pointSelect.locator("option")).not.toHaveCount(1, { timeout: 30_000 });
    await pointSelect.selectOption({ index: 1 });
    await expect(page.getByText(/Доставка: \d+(?:[.,]\d+)? ₽/)).toBeVisible({ timeout: 30_000 });

    const paymentPageRequestPromise = page.waitForRequest((request) =>
      /\/api\/orders\/[^/]+\/pay\/modulbank$/.test(new URL(request.url()).pathname)
    );
    await page.getByRole("button", { name: "Оформить заказ" }).click();
    const paymentPageRequest = await paymentPageRequestPromise;
    const match = new URL(paymentPageRequest.url()).pathname.match(/\/api\/orders\/([^/]+)\/pay\/modulbank$/);
    expect(match?.[1]).toBeTruthy();
    orderId = match![1];
    const orderResponse = await request.get(`/api/orders/${orderId}`);
    expect(orderResponse.ok()).toBeTruthy();
    const order = await orderResponse.json() as { totalAmount: number };

    const callback = {
      state: "COMPLETE",
      order_id: orderId,
      amount: order.totalAmount.toFixed(2),
      currency: "RUB",
      transaction_id: `e2e-ozon-${Date.now()}`,
      merchant: merchant!,
      testing: "1",
      unix_timestamp: Math.floor(Date.now() / 1000).toString(),
    };
    const paymentResponse = await request.post(`/api/orders/${orderId}/pay`, {
      form: { ...callback, signature: generateSignature(callback, secret!) },
    });
    expect(paymentResponse.ok(), await paymentResponse.text()).toBeTruthy();

    await page.goto(`/order/success/${orderId}`);
    await expect(page.getByRole("heading", { name: "Заказ успешно оформлен!" })).toBeVisible({ timeout: 30_000 });

    await page.goto("/admin");
    await page.getByLabel("Пароль").fill("e2e-admin-password");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/orders/${orderId}`);
    await expect(page.getByText("CREATED", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/\d+-\d+-\d+/).first()).toBeVisible();

    page.on("dialog", async (dialog) => {
      await dialog.accept(dialog.type() === "prompt" ? dialog.defaultValue() : undefined);
    });
    await page.getByRole("button", { name: "Отменить отправление Ozon" }).click();
    await expect(page.getByText("CANCELLED", { exact: true })).toBeVisible({ timeout: 30_000 });
    cancellationRequested = true;
  } finally {
    if (orderId && !cancellationRequested) {
      await page.goto("/admin");
      if (page.url().includes("/admin/login")) {
        await page.getByLabel("Пароль").fill("e2e-admin-password");
        await page.getByRole("button", { name: "Войти" }).click();
      }
      const cancelResponse = await page.request.post(`/api/admin/orders/${orderId}/ozon-cancel`);
      cancellationRequested = cancelResponse.ok();
    }
  }
  expect(cancellationRequested).toBeTruthy();
});

test("@mobile основные страницы работают без горизонтального переполнения", async ({ page }) => {
  for (const path of ["/", "/catalogue", "/faq", "/favorites", "/admin/login"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} переполняет экран по горизонтали`).toBeLessThanOrEqual(1);
  }
});
