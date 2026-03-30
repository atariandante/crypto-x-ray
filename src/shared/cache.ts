import { CacheEntry } from "./types";

const CACHE_PREFIX = "cxr_";

function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const fullKey = cacheKey(key);
  const result = await chrome.storage.local.get(fullKey);
  const entry = result[fullKey] as CacheEntry<T> | undefined;

  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    await chrome.storage.local.remove(fullKey);
    return null;
  }

  return entry.data;
}

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

export async function removeCached(key: string): Promise<void> {
  await chrome.storage.local.remove(cacheKey(key));
}

export async function clearExpired(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keysToRemove: string[] = [];
  const now = Date.now();

  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(CACHE_PREFIX)) continue;
    const entry = value as CacheEntry<unknown>;
    if (entry.timestamp && entry.ttl && now - entry.timestamp > entry.ttl) {
      keysToRemove.push(key);
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
}
