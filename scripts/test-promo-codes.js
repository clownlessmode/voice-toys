const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPromoCodes() {
  try {
    console.log("🚀 Testing promo codes system...");
    
    // 1. Создаем тестовые промокоды
    console.log("📦 Creating test promo codes...");
    
    const promoCode1 = await prisma.promoCode.create({
      data: {
        code: "WELCOME20",
        name: "Добро пожаловать",
        description: "Скидка 20% для новых клиентов",
        type: "PERCENTAGE",
        value: 20,
        minOrderAmount: 1000,
        maxUses: 100,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // +90 дней
        isActive: true,
      },
    });

    const promoCode2 = await prisma.promoCode.create({
      data: {
        code: "SAVE500",
        name: "Экономия 500₽",
        description: "Скидка 500 рублей на заказ от 2000₽",
        type: "FIXED_AMOUNT",
        value: 500,
        minOrderAmount: 2000,
        maxUses: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 дней
        isActive: true,
      },
    });

    console.log("✅ Promo codes created:");
    console.log("   - WELCOME20: 20% скидка");
    console.log("   - SAVE500: 500₽ скидка");

    // 2. Тестируем валидацию промокодов
    console.log("\n🔍 Testing promo code validation...");
    
    const testCases = [
      { code: "WELCOME20", orderAmount: 1500 },
      { code: "SAVE500", orderAmount: 2500 },
      { code: "INVALID", orderAmount: 1000 },
      { code: "WELCOME20", orderAmount: 500 }, // Меньше минимальной суммы
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 Testing: ${testCase.code} with order amount ${testCase.orderAmount}₽`);
      
      try {
        const response = await fetch("http://localhost:3000/api/promo-codes/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testCase),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.isValid) {
            console.log(`✅ Valid: ${result.discountAmount}₽ discount`);
          } else {
            console.log(`❌ Invalid: ${result.error}`);
          }
        } else {
          console.log(`❌ API Error: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
      }
    }

    // 3. Создаем тестовый заказ с промокодом
    console.log("\n📋 Creating test order with promo code...");
    
    const product = await prisma.product.findFirst();
    if (!product) {
      console.log("❌ No products found, creating one...");
      await prisma.product.create({
        data: {
          name: "Тестовый продукт для промокода",
          breadcrumbs: JSON.stringify(["Тест"]),
          images: JSON.stringify(["test.jpg"]),
          price: 1500,
          pickupAvailability: "В наличии",
          deliveryAvailability: "Доступна доставка",
          returnDays: 14,
          returnDetails: "Возврат в течение 14 дней",
          description: "Тестовый продукт",
          categories: JSON.stringify(["test"]),
          ageGroups: JSON.stringify(["3-6"]),
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: `PROMO-TEST-${Date.now()}`,
        status: "CREATED",
        customerName: "Тест Промокода",
        customerPhone: "+7 (999) 123-45-67",
        customerEmail: "test-promo@example.com",
        deliveryType: "delivery",
        deliveryAddress: "44",
        totalAmount: 1500,
        originalAmount: 1500,
        discountAmount: 300, // 20% от 1500
        promoCodeId: promoCode1.id,
        currency: "₽",
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              price: 1500,
            },
          ],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log("✅ Order created:", order.orderNumber);
    console.log("   - Original amount:", order.originalAmount);
    console.log("   - Discount amount:", order.discountAmount);
    console.log("   - Final amount:", order.totalAmount);
    console.log("   - Promo code ID:", order.promoCodeId);

    // 4. Проверяем счетчик использований промокода
    const updatedPromoCode = await prisma.promoCode.findUnique({
      where: { id: promoCode1.id },
    });

    console.log("\n📊 Promo code usage stats:");
    console.log(`   - WELCOME20: ${updatedPromoCode.currentUses} / ${updatedPromoCode.maxUses} uses`);

    console.log("\n🎯 System is ready! You can now:");
    console.log("   1. Go to /admin/promo-codes to manage promo codes");
    console.log("   2. Use promo codes in the checkout form");
    console.log("   3. Track usage statistics");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPromoCodes();
