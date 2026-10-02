import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Success from "@/app/order/success/[id]/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "order-one" }),
  useSearchParams: () => new URLSearchParams("transaction_id=forged"),
}));
vi.mock("@/components/widgets/Header", () => ({ default: () => null }));
vi.mock("@/components/widgets/Footer", () => ({ default: () => null }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("reads stored status and waits for a signed callback instead of trusting the redirect", async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({ status: "CREATED", paymentType: "online" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ status: "PAID", paymentType: "online" })));
  await act(async () => { render(<Success />); });
  expect(screen.getByRole("heading", { name: /Подтверждаем оплату/ })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/api/orders/order-one/payment-status", expect.objectContaining({ method: "GET", cache: "no-store" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(screen.getByRole("heading", { name: /Ваш заказ оплачен/ })).toBeInTheDocument();
});

it("shows payment on collection only when the stored order says so", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: "CREATED", paymentType: "cash_on_delivery" })));
  await act(async () => { render(<Success />); });
  expect(screen.getByText(/Оплата производится при получении/)).toBeInTheDocument();
});

it("cancels polling on unmount", async () => {
  vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ status: "CREATED", paymentType: "online" })));
  let unmount: () => void;
  await act(async () => { unmount = render(<Success />).unmount; });
  unmount!();
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(fetch).toHaveBeenCalledTimes(1);
});
