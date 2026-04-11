import type { RiskAssessment, RiskEntity, RiskInsight, RiskProvider } from "./types";

const SEVERITY_SCORE: Record<RiskInsight["severity"], number> = {
  info: 10,
  warning: 35,
  critical: 70,
};

/**
 * Runs matching risk providers, merges their signals, and computes a single
 * assessment that the rest of the extension can consume.
 */
export class InsightEngine {
  private readonly providers: RiskProvider[] = [];

  /**
   * Registers a provider without coupling the engine to provider classes.
   */
  register(provider: RiskProvider): void {
    this.providers.push(provider);
  }

  /**
   * Returns an aggregate risk assessment while isolating provider failures.
   */
  async getRiskAssessment(entity: RiskEntity): Promise<RiskAssessment> {
    const matchingProviders = this.providers.filter((provider) =>
      provider.canHandle(entity),
    );

    const results = await Promise.all(
      matchingProviders.map(async (provider) => {
        try {
          return {
            provider: provider.name,
            insights: await provider.getInsights(entity),
          };
        } catch {
          return {
            provider: provider.name,
            insights: [],
          };
        }
      }),
    );

    const insights = dedupeInsights(results.flatMap((result) => result.insights));
    const providers = results
      .filter((result) => result.insights.length > 0)
      .map((result) => result.provider);
    const score = computeScore(insights);
    const riskLevel = computeRiskLevel(score);

    return {
      riskLevel,
      score,
      verdict: buildVerdict(riskLevel, insights),
      insights,
      providers,
    };
  }
}

function dedupeInsights(insights: RiskInsight[]): RiskInsight[] {
  const deduped = new Map<string, RiskInsight>();

  for (const insight of insights) {
    const key = `${insight.category}:${insight.signal.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing || SEVERITY_SCORE[insight.severity] > SEVERITY_SCORE[existing.severity]) {
      deduped.set(key, insight);
    }
  }

  return Array.from(deduped.values());
}

function computeScore(insights: RiskInsight[]): number {
  if (insights.length === 0) return 0;

  const total = insights.reduce(
    (sum, insight) => sum + SEVERITY_SCORE[insight.severity],
    0,
  );

  return Math.min(100, total);
}

function computeRiskLevel(score: number): RiskAssessment["riskLevel"] {
  if (score >= 70) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function buildVerdict(
  riskLevel: RiskAssessment["riskLevel"],
  insights: RiskInsight[],
): string {
  if (insights.length === 0) {
    return "No major risk signals detected";
  }

  const topInsight = insights
    .slice()
    .sort((left, right) => SEVERITY_SCORE[right.severity] - SEVERITY_SCORE[left.severity])[0];

  if (riskLevel === "high") {
    return `High risk: ${topInsight.signal.toLowerCase()}`;
  }
  if (riskLevel === "medium") {
    return `Caution: ${topInsight.signal.toLowerCase()}`;
  }
  return `Low risk with minor concern: ${topInsight.signal.toLowerCase()}`;
}
