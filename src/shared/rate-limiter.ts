interface RateLimiterConfig {
  maxRequestsPerMinute: number;
  maxRetries: number;
  baseBackoffMs: number;
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export enum ApiName {
  CoinGecko = "coingecko",
  DefiLlama = "defillama",
  Etherscan = "etherscan",
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
  [ApiName.Solscan]: {
    maxRequestsPerMinute: 100,
    maxRetries: 2,
    baseBackoffMs: 1000,
  },
};

class RateLimiter {
  private timestamps: number[] = [];
  private queue: QueuedRequest<unknown>[] = [];
  private processing = false;
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
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

      try {
        const result = await this.executeWithRetry(request.execute);
        request.resolve(result);
      } catch (error) {
        request.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
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

export function getRateLimiter(apiName: ApiName): RateLimiter {
  if (!limiters.has(apiName)) {
    const config = API_CONFIGS[apiName];
    limiters.set(apiName, new RateLimiter(config));
  }
  return limiters.get(apiName)!;
}
