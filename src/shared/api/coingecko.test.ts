import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTokenById,
  fetchTokenByContract,
  fetchSimplePrices,
  fetchCoinList,
} from "./coingecko";

// Mock chrome.storage.local (cache always misses for clean tests)
const storage: Record<string, unknown> = {};
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(storage, items);
        return Promise.resolve();
      }),
      remove: vi.fn(() => Promise.resolve()),
    },
  },
});

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(storage)) delete storage[key];
});

const MOCK_COIN_RESPONSE = {
  id: "ethereum",
  symbol: "eth",
  name: "Ethereum",
  image: { small: "https://example.com/eth.png" },
  categories: ["Smart Contract Platform"],
  detail_platforms: {
    "": { contract_address: "" },
  },
  market_data: {
    current_price: { usd: 3500 },
    market_cap: { usd: 420_000_000_000 },
    fully_diluted_valuation: { usd: 420_000_000_000 },
    circulating_supply: 120_000_000,
    total_supply: 120_000_000,
    max_supply: null,
    price_change_percentage_24h: 2.5,
    ath: { usd: 4800 },
    ath_date: { usd: "2021-11-10T00:00:00.000Z" },
  },
};

describe("coingecko", () => {
  describe("fetchTokenById", () => {
    it("fetches and maps token data to TokenProfile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_COIN_RESPONSE),
      });

      const profile = await fetchTokenById("ethereum");

      expect(profile.id).toBe("ethereum");
      expect(profile.name).toBe("Ethereum");
      expect(profile.symbol).toBe("ETH");
      expect(profile.price).toBe(3500);
      expect(profile.priceChange24h).toBe(2.5);
      expect(profile.ath).toBe(4800);
      expect(profile.supply.circulatingSupply).toBe(120_000_000);
      expect(profile.supply.totalSupply).toBe(120_000_000);
      expect(profile.supply.maxSupply).toBeUndefined();
      expect(profile.supply.type).toBe("inflationary");
      expect(profile.supply.marketCap).toBe(3500 * 120_000_000);
      expect(profile.logo).toBe("https://example.com/eth.png");
      expect(profile.category).toBe("Smart Contract Platform");
    });

    it("correctly infers fixed supply type", async () => {
      const fixedCoin = {
        ...MOCK_COIN_RESPONSE,
        market_data: {
          ...MOCK_COIN_RESPONSE.market_data,
          circulating_supply: 21_000_000,
          total_supply: 21_000_000,
          max_supply: 21_000_000,
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fixedCoin),
      });

      const profile = await fetchTokenById("bitcoin");
      expect(profile.supply.type).toBe("fixed");
    });

    it("caches the result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_COIN_RESPONSE),
      });

      await fetchTokenById("ethereum");

      // Verify cache was written
      const cacheKeys = Object.keys(storage);
      expect(cacheKeys.some((k) => k.includes("coin:ethereum"))).toBe(true);
    });
  });

  describe("fetchTokenByContract", () => {
    it("returns null for failed lookups", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchTokenByContract("ethereum", "0xbadaddress");
      expect(result).toBeNull();
    });

    it("maps contract response to TokenProfile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_COIN_RESPONSE),
      });

      const profile = await fetchTokenByContract(
        "ethereum",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      );

      expect(profile).not.toBeNull();
      expect(profile!.name).toBe("Ethereum");
    });
  });

  describe("fetchSimplePrices", () => {
    it("fetches batch prices", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ethereum: { usd: 3500, usd_market_cap: 420e9, usd_24h_vol: 15e9 },
            bitcoin: { usd: 65000, usd_market_cap: 1.3e12, usd_24h_vol: 30e9 },
          }),
      });

      const prices = await fetchSimplePrices(["ethereum", "bitcoin"]);

      expect(prices.ethereum.usd).toBe(3500);
      expect(prices.bitcoin.usd).toBe(65000);
    });
  });

  describe("fetchCoinList", () => {
    it("fetches the full coin list", async () => {
      const mockList = [
        { id: "bitcoin", symbol: "btc", name: "Bitcoin", platforms: {} },
        { id: "ethereum", symbol: "eth", name: "Ethereum", platforms: {} },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockList),
      });

      const list = await fetchCoinList();

      expect(list).toHaveLength(2);
      expect(list[0].id).toBe("bitcoin");
    });
  });
});
