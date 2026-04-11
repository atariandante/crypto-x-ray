import { describe, expect, it } from "vitest";
import { InternalHeuristicsProvider } from "./internal";
import type { RiskEntity } from "../types";
import type { TokenProfile } from "../../types";

function createProfile(overrides: Partial<TokenProfile> = {}): TokenProfile {
  return {
    id: "sample",
    coingeckoId: "sample",
    name: "Sample",
    symbol: "SMP",
    chains: ["ethereum"],
    price: 1,
    priceChange24h: 0,
    ath: 2,
    supply: {
      type: "inflationary",
      circulatingSupply: 20,
      totalSupply: 100,
      circulatingPercent: 20,
      marketCap: 100000,
      fdv: 1000000,
      fdvToMcapRatio: 10,
      hasBurnMechanism: false,
    },
    lastUpdated: Date.now(),
    ...overrides,
  };
}

describe("InternalHeuristicsProvider", () => {
  it("only handles entities that already have a token profile", () => {
    const provider = new InternalHeuristicsProvider();

    expect(
      provider.canHandle({ type: "token", identifier: "eth", tokenProfile: createProfile() }),
    ).toBe(true);
    expect(provider.canHandle({ type: "token", identifier: "eth" })).toBe(false);
  });

  it("emits dilution, circulation, liquidity, and revenue insights", async () => {
    const provider = new InternalHeuristicsProvider();
    const entity: RiskEntity = {
      type: "token",
      identifier: "sample",
      tokenProfile: createProfile({
        fundamentals: {
          tvlUsd: 500000,
          tvlTrend: "shrinking",
          revenueUsd: 100000,
          revenueTrend: "shrinking",
        },
      }),
    };

    const insights = await provider.getInsights(entity);

    expect(insights.map((insight) => insight.signal)).toEqual(
      expect.arrayContaining([
        "High dilution risk",
        "Low circulating supply",
        "Low liquidity",
        "Revenue is shrinking",
      ]),
    );
  });
});
