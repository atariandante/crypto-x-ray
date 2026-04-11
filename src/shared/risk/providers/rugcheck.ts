import { fetchTokenSummary } from "../../api/rugcheck";
import type { RiskEntity, RiskInsight, RiskProvider, RiskSeverity } from "../types";

/**
 * Adapts RugCheck's Solana-specific token summary into normalized risk signals.
 */
export class RugCheckProvider implements RiskProvider {
  readonly id = "rugcheck";
  readonly name = "RugCheck";

  canHandle(entity: RiskEntity): boolean {
    return entity.type === "token" && entity.chain === "solana";
  }

  async getInsights(entity: RiskEntity): Promise<RiskInsight[]> {
    const summary = await fetchTokenSummary(entity.identifier);
    if (!summary) {
      return [];
    }

    const insights = summary.risks.map((risk) => ({
      signal: risk.name,
      severity: mapSeverity(risk.level),
      detail: risk.description ?? "RugCheck flagged this token",
      provider: this.name,
      category: "contract" as const,
    }));

    if (summary.lpLockedPct !== undefined && summary.lpLockedPct < 80) {
      insights.push({
        signal: "Low liquidity lock",
        severity: "warning",
        detail: `Only ${summary.lpLockedPct}% of liquidity appears locked`,
        provider: this.name,
        category: "liquidity",
      });
    }

    return insights;
  }
}

function mapSeverity(level: string): RiskSeverity {
  const normalized = level.toLowerCase();
  if (normalized === "high" || normalized === "critical" || normalized === "danger") {
    return "critical";
  }
  if (normalized === "warn" || normalized === "warning" || normalized === "medium") {
    return "warning";
  }
  return "info";
}
