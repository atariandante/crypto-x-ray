import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenProfile } from "../shared/types";

const fetchTokenById = vi.fn();
const fetchTokenByContract = vi.fn();
const fetchSimplePrices = vi.fn();
const fetchFundamentals = vi.fn();
const fetchPrices = vi.fn();
const formatCoinId = vi.fn(() => "coingecko:ethereum");
const clearExpired = vi.fn();
const getRiskAssessment = vi.fn();

vi.mock("../shared/api/coingecko", () => ({
  fetchTokenById,
  fetchTokenByContract,
  fetchSimplePrices,
}));

vi.mock("../shared/api/defi-llama", () => ({
  fetchFundamentals,
  fetchPrices,
  formatCoinId,
}));

vi.mock("../shared/cache", () => ({
  clearExpired,
}));

vi.mock("../shared/risk/engine", () => ({
  InsightEngine: class {
    register(): void {}
    getRiskAssessment = getRiskAssessment;
  },
}));

vi.mock("../shared/risk/providers/rugcheck", () => ({
  RugCheckProvider: class {},
}));

vi.mock("../shared/risk/providers/internal", () => ({
  InternalHeuristicsProvider: class {},
}));

vi.stubGlobal("chrome", {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
});

describe("background handleMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profile and risk assessment for RESOLVE_TOKEN", async () => {
    const profile: TokenProfile = {
      id: "ethereum",
      coingeckoId: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
      chains: ["ethereum"],
      price: 1000,
      priceChange24h: 0,
      ath: 4000,
      supply: {
        type: "inflationary",
        circulatingSupply: 100,
        totalSupply: 100,
        circulatingPercent: 100,
        marketCap: 1000000,
        fdv: 1000000,
        fdvToMcapRatio: 1,
        hasBurnMechanism: false,
      },
      lastUpdated: Date.now(),
    };

    fetchTokenById.mockResolvedValue(profile);
    fetchFundamentals.mockResolvedValue({ tvlUsd: 10_000_000, tvlTrend: "growing" });
    fetchPrices.mockResolvedValue({ "coingecko:ethereum": { price: 1100 } });
    getRiskAssessment.mockResolvedValue({
      riskLevel: "low",
      score: 10,
      verdict: "No major concerns detected",
      insights: [],
      providers: ["Internal Heuristics"],
    });

    const { handleMessage } = await import("./index");
    const result = await handleMessage({
      type: "RESOLVE_TOKEN",
      payload: { id: "ethereum" },
    });

    expect(result).toEqual({
      success: true,
      data: {
        profile: expect.objectContaining({ id: "ethereum", price: 1100 }),
        risk: expect.objectContaining({ riskLevel: "low" }),
      },
    });
  });
});
