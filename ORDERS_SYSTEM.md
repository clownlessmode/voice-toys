# 🛒 Система заказов Voice Toys

Полноценная система управления заказами интернет-магазина с админ панелью и экспортом в Excel.

## 🌟 Возможности системы

### 📦 Заказы

- **Создание заказов**: Автоматическое создание при оформлении покупки
- **Статусы заказов**: Создан → Оплачен → Отправлен → Доставлен
- **Данные клиента**: Имя, телефон, email, адрес доставки
- **Корзина товаров**: Несколько товаров в одном заказе с количеством
- **Автоподсчет суммы**: Цены на момент заказа сохраняются

### 🎯 Статусы заказов

- **CREATED** (Создан) - Заказ оформлен, ожидает оплаты
- **PAID** (Оплачен) - Платеж получен, заказ в обработке
- **SHIPPED** (Отправлен) - Товар отправлен покупателю
- **DELIVERED** (Доставлен) - Товар получен покупателем
- **CANCELLED** (Отменен) - Заказ отменен

### 💳 Система оплаты

- **Webhook endpoint**: `/api/orders/[id]/pay` для платежных систем
- **Автоматическое изменение статуса** при получении оплаты
- **Timestamp оплаты**: Сохранение времени поступления платежа

## 🗄 Структура базы данных

### Модель Order

```prisma
model Order {
  id          String      @id @default(cuid())
  orderNumber String      @unique // #2025-0001
  status      OrderStatus @default(CREATED)

  // Клиент
  customerName  String
  customerPhone String
  customerEmail String?

  // Доставка
  deliveryType    String // "pickup" | "delivery"
  deliveryAddress String?

  // Финансы
  totalAmount   Float
  currency      String  @default("₽")

  // Связи
  items         OrderItem[]

  // Временные метки
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  paidAt        DateTime?
}
```

### Модель OrderItem

```prisma
model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int     @default(1)
  price     Float   // Цена на момент заказа

  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}
```

## 🔗 API Endpoints

### Заказы

```
GET    /api/orders              - Список заказов с фильтрацией
POST   /api/orders              - Создание нового заказа
GET    /api/orders/[id]         - Получение заказа по ID
PATCH  /api/orders/[id]         - Обновление статуса заказа
DELETE /api/orders/[id]         - Отмена заказа (мягкое удаление)
POST   /api/orders/[id]/pay     - Webhook для оплаты заказа
GET    /api/orders/export       - Экспорт заказов в Excel
```

### Параметры фильтрации

- `status` - Фильтр по статусу
- `search` - Поиск по номеру, имени, телефону
- `dateFrom` / `dateTo` - Период создания заказов
- `page` / `limit` - Пагинация

## 📱 Админ панель

### Страница заказов (`/admin/orders`)

- ✅ **Список всех заказов** с полной информацией
- ✅ **Поиск и фильтрация** по статусу, дате, клиенту
- ✅ **Изменение статуса** прямо из таблицы
- ✅ **Экспорт в Excel** с русскими названиями колонок
- ✅ **Пагинация** для больших объемов данных

### Обновленный дашборд (`/admin`)

- ✅ **Реальная статистика**: Количество заказов, выручка, клиенты
- ✅ **Быстрые ссылки** на управление заказами
- ✅ **Актуальная лента активности**

## 📊 Excel экспорт

### Поля в отчете

```
Номер заказа    | 2025-0001
Статус          | Оплачен
Имя клиента     | Иван Петров
Телефон         | +7 (999) 123-45-67
Email           | ivan@example.com
Тип доставки    | Доставка
Адрес доставки  | г. Москва, ул. Ленина, д. 10
Товары          | Бизиборд с часами x1; Мини-бизиборд x2
Количество      | 3 товаров
Общая сумма     | 5,570 ₽
Дата создания   | 11 июня 2025 г., 19:45
Дата оплаты     | 11 июня 2025 г., 19:47
```

### Особенности Excel файла

- ✅ **Красивое форматирование** с настроенной шириной колонок
- ✅ **Русские названия** всех полей
- ✅ **Читаемые даты** в российском формате
- ✅ **Детализация товаров** в одной строке
- ✅ **Автоматическое имя файла** с датой

## 🚀 Как использовать

### 1. Создание заказа

```javascript
const orderData = {
  customerName: "Иван Петров",
  customerPhone: "+7 (999) 123-45-67",
  customerEmail: "ivan@example.com",
  deliveryType: "delivery",
  deliveryAddress: "г. Москва, ул. Ленина, д. 10",
  items: [
    { productId: "225904711", quantity: 1 },
    { productId: "225904712", quantity: 2 },
  ],
};

const response = await fetch("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(orderData),
});
```

### 2. Получение заказов

```javascript
// Все заказы
const orders = await fetch("/api/orders");

// С фильтрацией
const paidOrders = await fetch("/api/orders?status=PAID&limit=50");
```

### 3. Webhook оплаты

```javascript
// Ваша платежная система должна отправить POST запрос:
await fetch(`/api/orders/${orderId}/pay`, {
  method: "POST",
});
```

### 4. Изменение статуса

```javascript
await fetch(`/api/orders/${orderId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "SHIPPED" }),
});
```

## 🔧 Тестовые данные

### Команды для заполнения БД

```bash
# Продукты (если нужно)
bun run db:seed

# Тестовые заказы (5 штук)
bun run db:seed-orders

# Полный сброс
bun run db:reset
```

### Тестовые заказы в системе

- **2025-0001** - Оплаченный заказ на 5,570 ₽ (Москва)
- **2025-0002** - Новый заказ на 2,290 ₽ (самовывоз)
- **2025-0003** - Отправленный заказ на 3,580 ₽ (СПб)
- **2025-0004** - Оплаченный заказ на 3,310 ₽ (Екатеринбург)
- **2025-0005** - Доставленный заказ на 1,950 ₽ (самовывоз)

## 📈 Статистика в админке

### Показатели дашборда

- **Всего продуктов**: Количество товаров в каталоге
- **Всего заказов**: Общее количество заказов
- **Выручка**: Сумма всех оплаченных заказов
- **Уникальных клиентов**: По номерам телефонов

### Автообновление

Все данные загружаются динамически из API и обновляются в реальном времени.

## 🛟 Интеграция с сайтом

### В форме заказа

```javascript
// Обработчик формы оформления заказа
const handleOrderSubmit = async (formData) => {
  const order = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: formData.name,
      customerPhone: formData.phone,
      customerEmail: formData.email,
      deliveryType: formData.delivery,
      deliveryAddress: formData.address,
      items: cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    }),
  });

  if (order.ok) {
    const orderData = await order.json();
    // Перенаправить на страницу оплаты с orderData.id
    window.location.href = `/payment?order=${orderData.id}`;
  }
};
```

## 🎯 Готовые интеграции

### Платежные системы

Webhook endpoint готов для интеграции с:

- **ЮKassa**
- **Stripe**
- **PayPal**
- **Robokassa**
- **Cloudpayments**

### Достаточно настроить webhook URL:

```
https://yourdomain.com/api/orders/[ORDER_ID]/pay
```

## 💡 Дальнейшее развитие

### Планируемые улучшения

1. **Email уведомления** клиентам
2. **SMS оповещения** о статусе заказа
3. **Печать накладных** и этикеток
4. **Интеграция с доставкой** (СДЭК, Почта России)
5. **Аналитика продаж** и отчеты
6. **Промокоды и скидки**
7. **Возвраты и обмены**

---

**🎉 Система заказов полностью готова к работе!**

Откройте админ панель: [http://localhost:3000/admin/orders](http://localhost:3000/admin/orders)
