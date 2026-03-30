import { describe, it, expect, vi } from "vitest";

// Mock chrome.storage.local (not available outside extension)
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
  },
});

import {
  fetchTokenById,
  fetchTokenByContract,
  fetchSimplePrices,
  fetchCoinList,
} from "./coingecko";

describe("coingecko integration", { timeout: 30_000 }, () => {
  it("fetchTokenById returns a valid TokenProfile for ethereum", async () => {
    const profile = await fetchTokenById("ethereum");

    expect(profile.id).toBe("ethereum");
    expect(profile.coingeckoId).toBe("ethereum");
    expect(profile.name).toBe("Ethereum");
    expect(profile.symbol).toBe("ETH");
    expect(profile.price).toBeGreaterThan(0);
    expect(profile.supply.circulatingSupply).toBeGreaterThan(0);
    expect(profile.supply.totalSupply).toBeGreaterThan(0);
    expect(profile.supply.marketCap).toBeGreaterThan(0);
    expect(profile.supply.fdv).toBeGreaterThan(0);
    expect(profile.supply.circulatingPercent).toBeGreaterThan(0);
    expect(profile.supply.circulatingPercent).toBeLessThanOrEqual(100);
    expect(profile.supply.type).toBe("inflationary"); // ETH has no max supply
    expect(profile.ath).toBeGreaterThan(0);
    expect(profile.lastUpdated).toBeGreaterThan(0);
  });

  it("fetchTokenById returns a fixed supply type for bitcoin", async () => {
    const profile = await fetchTokenById("bitcoin");

    expect(profile.id).toBe("bitcoin");
    expect(profile.symbol).toBe("BTC");
    expect(profile.supply.type).toBe("fixed");
    expect(profile.supply.maxSupply).toBe(21_000_000);
  });

  it("fetchTokenByContract resolves USDC on ethereum", async () => {
    const profile = await fetchTokenByContract(
      "ethereum",
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );

    expect(profile).not.toBeNull();
    expect(profile!.symbol).toBe("USDC");
    expect(profile!.price).toBeGreaterThan(0);
    expect(profile!.price).toBeLessThan(2); // stablecoin, should be ~1
  });

  it("fetchTokenByContract returns null for invalid address", async () => {
    const profile = await fetchTokenByContract(
      "ethereum",
      "0x0000000000000000000000000000000000000000",
    );

    expect(profile).toBeNull();
  });

  it("fetchSimplePrices returns prices for multiple tokens", async () => {
    const prices = await fetchSimplePrices(["bitcoin", "ethereum"]);

    expect(prices.bitcoin).toBeDefined();
    expect(prices.bitcoin.usd).toBeGreaterThan(0);
    expect(prices.ethereum).toBeDefined();
    expect(prices.ethereum.usd).toBeGreaterThan(0);
  });

  it.skip("fetchCoinList returns a large list with expected structure — skipped: hits CoinGecko rate limit on free tier when run with other tests", async () => {
    const list = await fetchCoinList();

    expect(list.length).toBeGreaterThan(10_000);
    const btc = list.find((c) => c.id === "bitcoin");
    expect(btc).toBeDefined();
    expect(btc!.symbol).toBe("btc");
    expect(btc!.name).toBe("Bitcoin");
  });
});
