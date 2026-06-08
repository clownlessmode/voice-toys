/**
 * Global WB request pacing: ~100 req/min, burst 5, ~600ms between sustained requests.
 * Implemented as a continuous token bucket (matches refill rate 100/60 tokens per second).
 */

export const WB_RATE_MAX_BURST = 5;
export const WB_RATE_REQUESTS_PER_MINUTE = 100;
export const WB_RATE_REFILL_PER_SECOND =
  WB_RATE_REQUESTS_PER_MINUTE / 60; /* ≈1.667 */

export type TokenBucketRateLimiterOptions = {
  capacity: number;
  /** Tokens added per second (e.g. 100/60). */
  refillPerSecond: number;
  /** Inject for tests. */
  now?: () => number;
  /** Inject for tests (default: setTimeout). */
  sleep?: (ms: number) => Promise<void>;
};

export class TokenBucketRateLimiter {
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private tokens: number;
  private lastRefill: number;

  constructor(options: TokenBucketRateLimiterOptions) {
    this.capacity = options.capacity;
    this.refillPerSecond = options.refillPerSecond;
    this.now = options.now ?? (() => Date.now());
    this.sleep =
      options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.tokens = this.capacity;
    this.lastRefill = this.now();
  }

  /**
   * Wait until one request token is available, then consume it.
   */
  async acquire(): Promise<void> {
    for (;;) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const need = 1 - this.tokens;
      const waitSec = need / this.refillPerSecond;
      const waitMs = Math.max(0, Math.ceil(waitSec * 1000));
      await this.sleep(Math.min(waitMs, 60_000));
    }
  }

  private refill(): void {
    const t = this.now();
    const elapsedSec = (t - this.lastRefill) / 1000;
    if (elapsedSec <= 0) return;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSec * this.refillPerSecond
    );
    this.lastRefill = t;
  }
}

/**
 * Default limiter: burst 5, 100 req/min average.
 */
export function createDefaultWbRateLimiter(): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter({
    capacity: WB_RATE_MAX_BURST,
    refillPerSecond: WB_RATE_REFILL_PER_SECOND,
  });
}
