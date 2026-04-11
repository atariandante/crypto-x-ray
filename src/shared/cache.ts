import { CacheEntry } from "./types";

const CACHE_PREFIX = "cxr_";

/**
 * Namespaces storage keys so extension cache entries do not collide with other
 * persisted data in `chrome.storage.local`.
 */
function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function isCacheEntry<T>(value: unknown): value is CacheEntry<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "timestamp" in value &&
    "ttl" in value
  );
}

/**
 * Reads a typed cache entry and enforces TTL expiration on access.
 * The helper centralizes cache eviction so API clients do not repeat expiry
 * logic at every call site.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const fullKey = cacheKey(key);
  const result = await chrome.storage.local.get(fullKey);
  const value = result[fullKey];

  if (!isCacheEntry<T>(value)) return null;

  const age = Date.now() - value.timestamp;
  if (age > value.ttl) {
    await chrome.storage.local.remove(fullKey);
    return null;
  }

  return value.data;
}

/**
 * Persists a value under a TTL-backed cache envelope.
 * Callers provide raw data while the cache layer owns timestamp bookkeeping.
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttl: number,
): Promise<void> {
  const fullKey = cacheKey(key);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  await chrome.storage.local.set({ [fullKey]: entry });
}

/**
 * Reads through the cache and only invokes the fetcher on cache miss.
 * This keeps API clients focused on provider-specific mapping while the cache
 * layer owns the common cache-first control flow.
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  await setCached(key, data, ttl);
  return data;
}

/**
 * Removes a single cached item by logical cache key.
 */
export async function removeCached(key: string): Promise<void> {
  await chrome.storage.local.remove(cacheKey(key));
}

/**
 * Sweeps expired cache entries from extension storage.
 * This keeps long-lived background sessions from accumulating stale API data.
 */
export async function clearExpired(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keysToRemove: string[] = [];
  const now = Date.now();

  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(CACHE_PREFIX)) continue;
    if (
      isCacheEntry(value) &&
      now - value.timestamp > value.ttl
    ) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
}
