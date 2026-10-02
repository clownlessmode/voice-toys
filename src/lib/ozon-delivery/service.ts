import { extractProductDimensions, extractProductWeight } from "@/lib/product-utils";
import {
  normalizeOzonDeliveryPhone,
  getOzonDeliveryClient,
  OzonDeliveryClient,
  type DeliveryPosting,
  type ParcelDimensions,
} from "./client";
import { isOzonDeliveryProductEligible } from "./rules";

export type DeliveryProduct = {
  id: string;
  name: string;
  price: number;
  characteristics?: Array<{ key: string; value: string }>;
};
export type DeliveryItem = { productId: string; quantity: number };

function rubles(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid RUB amount");
  return value.toFixed(2);
}

function parseProviderMoney(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const money = value as { amount?: unknown; currency_code?: unknown };
  const parts = typeof money.amount === "string" ? money.amount.split(".") : [];
  if (money.currency_code !== "RUB" || parts.length < 1 || parts.length > 2 ||
      parts[0].length === 0 || parts.some((part) => !part || [...part].some((char) => char < "0" || char > "9")) ||
      (parts[1]?.length ?? 0) > 2) {
    throw new Error("Ozon returned invalid delivery money");
  }
  const number = Number(money.amount);
  if (!Number.isFinite(number) || number < 0) throw new Error("Ozon returned invalid delivery money");
  return number;
}

export function buildOzonParcel(
  products: DeliveryProduct[], items: DeliveryItem[], declaredValueRub: number
): { requestId: number; declaredValue: string; dimensions: ParcelDimensions; description: string } {
  const productsById = new Map(products.map((product) => [product.id, product]));
  let weight = 0;
  let length = 0;
  let width = 0;
  let height = 0;
  const labels: string[] = [];
  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid parcel item");
    }
    const characteristics = product.characteristics ?? [];
    const dimensions = extractProductDimensions(characteristics);
    weight += extractProductWeight(characteristics) * item.quantity;
    length = Math.max(length, dimensions.length * 10);
    width = Math.max(width, dimensions.width * 10);
    height += dimensions.height * 10 * item.quantity;
    labels.push(`${product.name} × ${item.quantity}`);
  }
  const rounded = {
    weight_g: Math.ceil(weight), length_mm: Math.ceil(length),
    width_mm: Math.ceil(width), height_mm: Math.ceil(height),
  };
  if (Object.values(rounded).some((value) => !Number.isSafeInteger(value) || value <= 0) ||
      rounded.weight_g > 125_000 || Math.max(rounded.length_mm, rounded.width_mm, rounded.height_mm) > 2_500) {
    throw new Error("Parcel dimensions are outside Ozon Delivery limits");
  }
  return {
    requestId: 1,
    declaredValue: rubles(declaredValueRub),
    dimensions: rounded,
    description: labels.join(", ").slice(0, 500),
  };
}

export type OzonDeliveryQuote = {
  deliveryPointId: number;
  shipmentMethodId: number;
  pointName: string;
  address: string;
  deliveryCost: number;
  estimatedDeliveryDays: number | null;
  cutoffAt: string | null;
};

export async function quoteOzonDelivery(input: {
  client?: OzonDeliveryClient;
  phone: string;
  deliveryPointId: number;
  shipmentMethodId: number;
  products: DeliveryProduct[];
  items: DeliveryItem[];
  declaredValueRub: number;
}): Promise<OzonDeliveryQuote> {
  const client = input.client ?? getOzonDeliveryClient();
  const [point] = await client.getDeliveryPoints([input.deliveryPointId]);
  if (!point || point.delivery_point_id !== input.deliveryPointId) throw new Error("Ozon delivery point was not found");
  if (!point.is_active) throw new Error("Ozon delivery point is inactive");
  const parcel = buildOzonParcel(input.products, input.items, input.declaredValueRub);
  const posting: DeliveryPosting = {
    request_id: parcel.requestId,
    shipment_method_id: input.shipmentMethodId,
    cutoff_at: null,
    declared_value: { amount: parcel.declaredValue, currency_code: "RUB" },
    dimensions: parcel.dimensions,
  };
  const response = await client.checkout({
    recipient: { phone_number: normalizeOzonDeliveryPhone(input.phone) },
    postings: [posting],
    delivery: { delivery_point: { delivery_point_id: input.deliveryPointId } },
  });
  const result = response.results?.find((row) => row.request_id === parcel.requestId);
  if (!result?.posting || result.error) throw new Error("Ozon delivery is unavailable for this order");
  const deliveryCost = Math.round((
    parseProviderMoney(result.posting.estimated_delivery_cost) +
    parseProviderMoney(result.posting.estimated_insurance_cost)
  ) * 100) / 100;
  return {
    deliveryPointId: input.deliveryPointId,
    shipmentMethodId: input.shipmentMethodId,
    pointName: point.name,
    address: point.full_address,
    deliveryCost,
    estimatedDeliveryDays: Number.isSafeInteger(result.posting.estimated_delivery_days)
      ? result.posting.estimated_delivery_days! : null,
    cutoffAt: typeof result.posting.cutoff_at === "string" ? result.posting.cutoff_at : null,
  };
}

type PaidOzonOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  deliveryCost: number;
  ozonDeliveryPointId: string | null;
  ozonShipmentMethodId: string | null;
  ozonCutoffAt: string | null;
  ozonIdempotencyKey: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    product: DeliveryProduct;
  }>;
};

export async function createOzonDeliveryOrder(input: {
  client?: OzonDeliveryClient; order: PaidOzonOrder;
}): Promise<{ orderNumber: string; postingNumber: string }> {
  const { order } = input;
  if (order.items.some((item) => !isOzonDeliveryProductEligible(item.product.price))) {
    throw new Error("Ozon Delivery does not accept products cheaper than 100 RUB");
  }
  const pointId = Number(order.ozonDeliveryPointId);
  const methodId = Number(order.ozonShipmentMethodId);
  if (!Number.isSafeInteger(pointId) || pointId <= 0 || !Number.isSafeInteger(methodId) || methodId <= 0 ||
      !order.ozonIdempotencyKey) throw new Error("Order has incomplete Ozon delivery data");
  // Must match the declared value used during checkout; promo discounts affect
  // what the buyer pays, not the insured retail value of the parcel.
  const merchandiseValue = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const parcel = buildOzonParcel(order.items.map((item) => item.product), order.items, merchandiseValue);
  const response = await (input.client ?? getOzonDeliveryClient()).createOrder({
    order_external_id: order.id,
    recipient: {
      phone_number: normalizeOzonDeliveryPhone(order.customerPhone), full_name: order.customerName.trim().slice(0, 200),
    },
    delivery: { delivery_point: { delivery_point_id: pointId } },
    postings: [{
      request_id: parcel.requestId,
      shipment_method_id: methodId,
      // Checkout currently returns a cutoff equal to the calculation instant.
      // Reusing it after payment makes Ozon reject an otherwise valid posting as
      // already being in the past. Null lets Ozon assign the current shipment slot.
      cutoff_at: null,
      declared_value: { amount: parcel.declaredValue, currency_code: "RUB" },
      dimensions: parcel.dimensions,
      posting_external_id: `${order.id}-1`,
      description: parcel.description,
    }],
  }, order.ozonIdempotencyKey);
  const posting = response.postings?.find((row) => row.request_id === parcel.requestId);
  if (!response.order_number || !posting?.posting_number) throw new Error("Ozon returned an incomplete created order");
  return { orderNumber: response.order_number, postingNumber: posting.posting_number };
}
