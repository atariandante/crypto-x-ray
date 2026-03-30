import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiName, getRateLimiter } from "./rate-limiter";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("rate-limiter", () => {
  it("returns the same limiter instance for the same API", () => {
    const a = getRateLimiter(ApiName.DefiLlama);
    const b = getRateLimiter(ApiName.DefiLlama);
    expect(a).toBe(b);
  });

  it("returns different limiter instances for different APIs", () => {
    const a = getRateLimiter(ApiName.DefiLlama);
    const b = getRateLimiter(ApiName.CoinGecko);
    expect(a).not.toBe(b);
  });

  it("executes requests and returns results", async () => {
    const limiter = getRateLimiter(ApiName.DefiLlama);
    const result = await limiter.execute(async () => 42);
    expect(result).toBe(42);
  });

  it("propagates errors from failed requests", async () => {
    const limiter = getRateLimiter(ApiName.DefiLlama);
    await expect(
      limiter.execute(async () => {
        throw new Error("network failure");
      }),
    ).rejects.toThrow("network failure");
  });

  it("retries on 429 errors with backoff", async () => {
    const limiter = getRateLimiter(ApiName.DefiLlama);
    let attempts = 0;

    const result = await limiter.execute(async () => {
      attempts++;
      if (attempts < 3) throw new Error("429 Too Many Requests");
      return "success";
    });

    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  it("gives up after max retries", async () => {
    const limiter = getRateLimiter(ApiName.DefiLlama);

    await expect(
      limiter.execute(async () => {
        throw new Error("429 Too Many Requests");
      }),
    ).rejects.toThrow("429");
  });

  it("processes queued requests in order", async () => {
    const limiter = getRateLimiter(ApiName.DefiLlama);
    const order: number[] = [];

    const promises = [1, 2, 3].map((n) =>
      limiter.execute(async () => {
        order.push(n);
        return n;
      }),
    );

    const results = await Promise.all(promises);
    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });
});
