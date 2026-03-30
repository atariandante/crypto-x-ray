import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCached, setCached, removeCached, clearExpired } from "./cache";

// Mock chrome.storage.local
const storage: Record<string, unknown> = {};

const mockChromeStorage = {
  get: vi.fn((keys: string | string[]) => {
    const result: Record<string, unknown> = {};
    const keyList = typeof keys === "string" ? [keys] : keys === null ? Object.keys(storage) : keys;
    for (const key of keyList) {
      if (key in storage) result[key] = storage[key];
    }
    return Promise.resolve(result);
  }),
  set: vi.fn((items: Record<string, unknown>) => {
    Object.assign(storage, items);
    return Promise.resolve();
  }),
  remove: vi.fn((keys: string | string[]) => {
    const keyList = typeof keys === "string" ? [keys] : keys;
    for (const key of keyList) delete storage[key];
    return Promise.resolve();
  }),
};

vi.stubGlobal("chrome", {
  storage: { local: mockChromeStorage },
});

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
  vi.clearAllMocks();
});

describe("cache", () => {
  it("returns null for missing keys", async () => {
    const result = await getCached("nonexistent");
    expect(result).toBeNull();
  });

  it("stores and retrieves values", async () => {
    await setCached("test-key", { value: 42 }, 60_000);
    const result = await getCached<{ value: number }>("test-key");
    expect(result).toEqual({ value: 42 });
  });

  it("returns null for expired entries", async () => {
    await setCached("expired", "data", 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    const result = await getCached("expired");
    expect(result).toBeNull();
  });

  it("removes cached entries", async () => {
    await setCached("to-remove", "data", 60_000);
    await removeCached("to-remove");
    const result = await getCached("to-remove");
    expect(result).toBeNull();
  });

  it("clears expired entries", async () => {
    // Add an expired entry directly to storage
    storage["cxr_old"] = { data: "stale", timestamp: Date.now() - 120_000, ttl: 60_000 };
    storage["cxr_fresh"] = { data: "current", timestamp: Date.now(), ttl: 60_000 };
    storage["non_cache_key"] = "unrelated";

    await clearExpired();

    expect(storage["cxr_old"]).toBeUndefined();
    expect(storage["cxr_fresh"]).toBeDefined();
    expect(storage["non_cache_key"]).toBe("unrelated");
  });

  it("prefixes keys with cxr_", async () => {
    await setCached("mykey", "value", 60_000);
    expect(mockChromeStorage.set).toHaveBeenCalledWith(
      expect.objectContaining({ cxr_mykey: expect.anything() }),
    );
  });
});
