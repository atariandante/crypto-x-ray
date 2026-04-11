import type { RiskEntity, RiskInsight, RiskProvider } from "../types";

/**
 * Applies local heuristics to already-resolved token profiles so the extension
 * can surface risk signals even when no chain-specific provider is available.
 */
export class InternalHeuristicsProvider implements RiskProvider {
  readonly id = "internal-heuristics";
  readonly name = "Internal Heuristics";

  canHandle(entity: RiskEntity): boolean {
    return entity.type === "token" && entity.tokenProfile !== undefined;
  }

  async getInsights(entity: RiskEntity): Promise<RiskInsight[]> {
    const profile = entity.tokenProfile;
    if (!profile) {
      return [];
    }

    const insights: RiskInsight[] = [];

    if (profile.supply.fdvToMcapRatio > 5) {
      insights.push({
        signal: "High dilution risk",
        severity: "warning",
        detail: "Fully diluted valuation is much higher than market cap",
        provider: this.name,
        category: "supply",
      });
    }

    if (profile.supply.circulatingPercent < 30) {
      insights.push({
        signal: "Low circulating supply",
        severity: "warning",
        detail: "A small share of total supply is currently circulating",
        provider: this.name,
        category: "supply",
      });
    }

    if ((profile.fundamentals?.tvlUsd ?? Number.POSITIVE_INFINITY) < 1_000_000) {
      insights.push({
        signal: "Low liquidity",
        severity: "warning",
        detail: "Protocol TVL is below the minimum liquidity threshold",
        provider: this.name,
        category: "liquidity",
      });
    }

    if (profile.fundamentals?.revenueTrend === "shrinking") {
      insights.push({
        signal: "Revenue is shrinking",
        severity: "warning",
        detail: "Protocol revenue trend is currently negative",
        provider: this.name,
        category: "fundamentals",
      });
    }

    return insights;
  }
}
