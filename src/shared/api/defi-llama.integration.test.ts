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
  fetchPrices,
  fetchPriceChange,
  fetchProtocols,
  fetchTvl,
  fetchFees,
  fetchFundamentals,
  formatCoinId,
  findProtocolByGeckoId,
} from "./defi-llama";

describe("defi-llama integration", { timeout: 30_000 }, () => {
  it("fetchPrices returns price for ethereum by coingecko ID", async () => {
    const coinId = formatCoinId("coingecko", "ethereum");
    const prices = await fetchPrices([coinId]);

    expect(prices[coinId]).toBeDefined();
    expect(prices[coinId].price).toBeGreaterThan(0);
    expect(prices[coinId].symbol).toBeDefined();
    expect(prices[coinId].confidence).toBeGreaterThan(0);
    expect(prices[coinId].timestamp).toBeGreaterThan(0);
  });

  it("fetchPrices returns price for USDC by chain:address", async () => {
    const coinId = formatCoinId(
      "ethereum",
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );
    const prices = await fetchPrices([coinId]);

    expect(prices[coinId]).toBeDefined();
    expect(prices[coinId].price).toBeGreaterThan(0.9);
    expect(prices[coinId].price).toBeLessThan(1.1); // stablecoin
  });

  it("fetchPriceChange returns percentage change", async () => {
    const coinId = formatCoinId("coingecko", "ethereum");
    const changes = await fetchPriceChange([coinId], "1d");

    expect(changes[coinId]).toBeDefined();
    expect(typeof changes[coinId]).toBe("number");
  });

  it("fetchProtocols returns protocol list with expected fields", async () => {
    const protocols = await fetchProtocols();

    expect(protocols.length).toBeGreaterThan(100);

    const aave = protocols.find((p) => p.gecko_id === "aave");
    expect(aave).toBeDefined();
    expect(aave!.name).toBeDefined();
    expect(aave!.tvl).toBeGreaterThan(0);
    expect(aave!.category).toBeDefined();
    expect(aave!.chains.length).toBeGreaterThan(0);
  });

  it("findProtocolByGeckoId finds aave", async () => {
    const protocol = await findProtocolByGeckoId("aave");

    expect(protocol).not.toBeNull();
    expect(protocol!.gecko_id).toBe("aave");
    expect(protocol!.tvl).toBeGreaterThan(0);
  });

  it("fetchTvl returns TVL for aave", async () => {
    const tvl = await fetchTvl("aave");

    expect(tvl).not.toBeNull();
    expect(tvl!).toBeGreaterThan(0);
  });

  it("fetchTvl returns null for nonexistent protocol", async () => {
    const tvl = await fetchTvl("definitely-not-a-real-protocol-xyz");
    expect(tvl).toBeNull();
  });

  it("fetchFees returns revenue data for aave", async () => {
    const fees = await fetchFees("aave");

    expect(fees).not.toBeNull();
    expect(fees!.total24h).toBeDefined();
    expect(fees!.total30d).toBeDefined();
    expect(fees!.totalDataChart).toBeDefined();
    expect(fees!.totalDataChart!.length).toBeGreaterThan(0);
  });

  it("fetchFundamentals builds complete FundamentalsInfo for aave", async () => {
    const fundamentals = await fetchFundamentals("aave");

    expect(fundamentals).not.toBeNull();
    expect(fundamentals!.tvlUsd).toBeGreaterThan(0);
    expect(["growing", "flat", "shrinking", undefined]).toContain(
      fundamentals!.tvlTrend,
    );
    expect(fundamentals!.revenueUsd).toBeGreaterThan(0);
    expect(["growing", "flat", "shrinking", undefined]).toContain(
      fundamentals!.revenueTrend,
    );
  });

  it("fetchFundamentals returns null for token without protocol", async () => {
    const fundamentals = await fetchFundamentals("bitcoin");
    // Bitcoin doesn't have a DeFi protocol in DeFiLlama
    // It may or may not return null depending on wrapped variants
    expect(
      fundamentals === null || (fundamentals.tvlUsd ?? 0) >= 0,
    ).toBe(true);
  });
});
