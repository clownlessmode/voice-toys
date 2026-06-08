import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  TokenBucketRateLimiter,
  WB_RATE_MAX_BURST,
  WB_RATE_REFILL_PER_SECOND,
} from "@/lib/wb/rate-limiter";
import { shouldStopWbCardPagination } from "@/lib/wb/client";

describe("TokenBucketRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows burst 5 with no delay, then delays the 6th until one refill", async () => {
    let virtualNow = 0;
    const limiter = new TokenBucketRateLimiter({
      capacity: WB_RATE_MAX_BURST,
      refillPerSecond: WB_RATE_REFILL_PER_SECOND,
      now: () => virtualNow,
      sleep: (ms) =>
        new Promise((r) => {
          setTimeout(() => {
            virtualNow += ms;
            r();
          }, ms);
        }),
    });

    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    expect(virtualNow).toBe(0);

    const sixth = limiter.acquire();
    await vi.advanceTimersByTimeAsync(599);
    expect(virtualNow).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    await sixth;
    expect(virtualNow).toBe(600);
  });
});

describe("shouldStopWbCardPagination", () => {
  it("stops when response cursor includes total and total is less than request limit", () => {
    expect(
      shouldStopWbCardPagination(100, {
        cards: [1] as unknown[],
        cursor: { updatedAt: "t", nmID: 1, total: 50 },
      })
    ).toBe(true);
    expect(
      shouldStopWbCardPagination(100, {
        cards: Array.from({ length: 100 }, () => 1),
        cursor: { updatedAt: "t", nmID: 1, total: 100 },
      })
    ).toBe(false);
  });

  it("stops when response cursor includes total: 0 (explicit API value)", () => {
    expect(
      shouldStopWbCardPagination(100, {
        cards: Array.from({ length: 100 }, () => 1),
        cursor: { updatedAt: "t", nmID: 1, total: 0 },
      })
    ).toBe(true);
  });

  it("uses cards length when cursor is null (no field vs missing total is separate)", () => {
    expect(
      shouldStopWbCardPagination(100, { cards: [1] as unknown[], cursor: null })
    ).toBe(true);
    expect(
      shouldStopWbCardPagination(100, {
        cards: Array.from({ length: 100 }, () => 1),
        cursor: null,
      })
    ).toBe(false);
  });

  it("uses cards length when cursor has updatedAt/nmID but total was omitted (full page does not stop)", () => {
    expect(
      shouldStopWbCardPagination(100, {
        cards: Array.from({ length: 100 }, () => 1),
        cursor: { updatedAt: "t", nmID: 1 },
      })
    ).toBe(false);
  });

  it("uses cards length when cursor has updatedAt/nmID but total was omitted (short page stops)", () => {
    expect(
      shouldStopWbCardPagination(100, {
        cards: [1] as unknown[],
        cursor: { updatedAt: "t", nmID: 1 },
      })
    ).toBe(true);
  });
});
