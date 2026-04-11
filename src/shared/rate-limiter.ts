interface RateLimiterConfig {
  maxRequestsPerMinute: number;
  maxRetries: number;
  baseBackoffMs: number;
}

/**
 * Identifies each external API so shared rate-limit policy can be configured
 * in one place instead of being duplicated across clients.
 */
export enum ApiName {
  CoinGecko = "coingecko",
  DefiLlama = "defillama",
  Etherscan = "etherscan",
  RugCheck = "rugcheck",
  Solscan = "solscan",
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const SLOT_BUFFER_MS = 50;
const JITTER_MAX_MS = 500;
const HTTP_STATUS_RATE_LIMITED = "429";
const HTTP_STATUS_SERVER_ERROR = "5";

const API_CONFIGS: Record<ApiName, RateLimiterConfig> = {
  [ApiName.CoinGecko]: {
    maxRequestsPerMinute: 30, // conservative vs 10-50 free tier limit
    maxRetries: 3,
    baseBackoffMs: 2000,
  },
  [ApiName.DefiLlama]: {
    maxRequestsPerMinute: 500, // very generous, ~1000+/min actual
    maxRetries: 2,
    baseBackoffMs: 1000,
  },
  [ApiName.Etherscan]: {
    maxRequestsPerMinute: 300, // 5/sec = 300/min
    maxRetries: 2,
    baseBackoffMs: 1000,
  },
  [ApiName.RugCheck]: {
    maxRequestsPerMinute: 60,
    maxRetries: 2,
    baseBackoffMs: 1000,
  },
  [ApiName.Solscan]: {
    maxRequestsPerMinute: 100,
    maxRetries: 2,
    baseBackoffMs: 1000,
  },
};

/**
 * Serializes outbound API calls under per-provider rate and retry policies.
 * This protects the extension from burst traffic and keeps retry behavior
 * consistent across all HTTP clients.
 */
class RateLimiter {
  private timestamps: number[] = [];
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRetry(fn);
          resolve(result);
        } catch (error) {
          reject(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      await this.waitForSlot();
      const request = this.queue.shift();
      if (!request) break;
      await request();
    }

    this.processing = false;
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length >= this.config.maxRequestsPerMinute) {
      const oldest = this.timestamps[0];
      const waitMs = oldest + RATE_LIMIT_WINDOW_MS - now + SLOT_BUFFER_MS;
      await new Promise((r) => setTimeout(r, waitMs));
      return this.waitForSlot();
    }

    this.timestamps.push(now);
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isRateLimit = message.includes(HTTP_STATUS_RATE_LIMITED);
      const isServerError = message.includes(HTTP_STATUS_SERVER_ERROR);

      if (
        (isRateLimit || isServerError) &&
        attempt < this.config.maxRetries
      ) {
        const backoff =
          this.config.baseBackoffMs * Math.pow(2, attempt) +
          Math.random() * JITTER_MAX_MS;
        await new Promise((r) => setTimeout(r, backoff));
        return this.executeWithRetry(fn, attempt + 1);
      }

      throw error;
    }
  }
}

const limiters = new Map<string, RateLimiter>();

/**
 * Returns a shared rate limiter instance for the requested provider.
 * Reusing instances lets all callers contribute to the same budget.
 */
export function getRateLimiter(apiName: ApiName): RateLimiter {
  if (!limiters.has(apiName)) {
    const config = API_CONFIGS[apiName];
    limiters.set(apiName, new RateLimiter(config));
  }
  return limiters.get(apiName)!;
}
