import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPrices,
  fetchPriceChange,
  fetchProtocols,
  fetchTvl,
  fetchFees,
  fetchFundamentals,
  formatCoinId,
} from "./defi-llama";

// Mock chrome.storage.local
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
  },
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("defi-llama", () => {
  describe("formatCoinId", () => {
    it("formats coingecko IDs", () => {
      expect(formatCoinId("coingecko", "aave")).toBe("coingecko:aave");
    });

    it("formats chain:address pairs", () => {
      expect(formatCoinId("ethereum", "0xabc")).toBe("ethereum:0xabc");
      expect(formatCoinId("bsc", "0xdef")).toBe("bsc:0xdef");
      expect(formatCoinId("avalanche", "0x123")).toBe("avax:0x123");
    });
  });

  describe("fetchPrices", () => {
    it("fetches and returns prices by coin ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            coins: {
              "coingecko:aave": {
                price: 250,
                symbol: "AAVE",
                timestamp: 1700000000,
                confidence: 0.99,
              },
            },
          }),
      });

      const prices = await fetchPrices(["coingecko:aave"]);

      expect(prices["coingecko:aave"].price).toBe(250);
      expect(prices["coingecko:aave"].confidence).toBe(0.99);
    });
  });

  describe("fetchPriceChange", () => {
    it("fetches percentage change over a period", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            coins: {
              "coingecko:aave": 5.2,
              "coingecko:uniswap": -3.1,
            },
          }),
      });

      const changes = await fetchPriceChange(
        ["coingecko:aave", "coingecko:uniswap"],
        "7d",
      );

      expect(changes["coingecko:aave"]).toBe(5.2);
      expect(changes["coingecko:uniswap"]).toBe(-3.1);
    });
  });

  describe("fetchProtocols", () => {
    it("fetches protocol list", async () => {
      const mockProtocols = [
        {
          id: "1",
          name: "Aave",
          symbol: "AAVE",
          gecko_id: "aave",
          tvl: 10_000_000_000,
          chain: "Ethereum",
          chains: ["Ethereum", "Polygon"],
          category: "Lending",
          change_1d: 1.5,
          change_7d: 3.2,
          change_1m: -5.0,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProtocols),
      });

      const protocols = await fetchProtocols();

      expect(protocols).toHaveLength(1);
      expect(protocols[0].gecko_id).toBe("aave");
      expect(protocols[0].tvl).toBe(10_000_000_000);
    });
  });

  describe("fetchTvl", () => {
    it("fetches TVL for a protocol", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(10_500_000_000),
      });

      const tvl = await fetchTvl("aave");
      expect(tvl).toBe(10_500_000_000);
    });

    it("returns null on error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const tvl = await fetchTvl("nonexistent");
      expect(tvl).toBeNull();
    });
  });

  describe("fetchFees", () => {
    it("fetches fee summary for a protocol", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total24h: 500_000,
            total7d: 3_500_000,
            total30d: 15_000_000,
            total1y: 180_000_000,
            totalAllTime: 500_000_000,
            totalDataChart: [[1700000000, 500_000]],
            gecko_id: "aave",
            category: "Lending",
          }),
      });

      const fees = await fetchFees("aave");

      expect(fees).not.toBeNull();
      expect(fees!.total30d).toBe(15_000_000);
      expect(fees!.gecko_id).toBe("aave");
    });
  });

  describe("fetchFundamentals", () => {
    it("returns null when protocol has no gecko_id match", async () => {
      // fetchProtocols returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await fetchFundamentals("nonexistent-token");
      expect(result).toBeNull();
    });

    it("builds FundamentalsInfo from protocol data", async () => {
      // fetchProtocols
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "1",
              name: "Aave",
              symbol: "AAVE",
              gecko_id: "aave",
              tvl: 10_000_000_000,
              chain: "Ethereum",
              chains: ["Ethereum"],
              category: "Lending",
              change_1d: 1,
              change_7d: 2,
              change_1m: 3,
            },
          ]),
      });

      // fetchProtocolDetail
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "1",
            name: "Aave",
            symbol: "AAVE",
            gecko_id: "aave",
            tvl: Array.from({ length: 60 }, (_, i) => ({
              date: 1700000000 + i * 86400,
              totalLiquidityUSD: 9_000_000_000 + i * 50_000_000, // growing
            })),
            currentChainTvls: { Ethereum: 10_000_000_000 },
            category: "Lending",
          }),
      });

      // fetchFees
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total24h: 500_000,
            total7d: 3_500_000,
            total30d: 15_000_000,
            total1y: 180_000_000,
            totalAllTime: 500_000_000,
            totalDataChart: Array.from({ length: 60 }, (_, i) => [
              1700000000 + i * 86400,
              400_000 + i * 5_000, // growing revenue
            ]),
            gecko_id: "aave",
            category: "Lending",
          }),
      });

      const fundamentals = await fetchFundamentals("aave");

      expect(fundamentals).not.toBeNull();
      expect(fundamentals!.tvlUsd).toBe(10_000_000_000);
      expect(fundamentals!.tvlTrend).toBe("growing");
      expect(fundamentals!.revenueUsd).toBeGreaterThan(0);
      expect(fundamentals!.revenueTrend).toBe("growing");
    });
  });
});
