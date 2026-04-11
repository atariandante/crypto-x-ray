import { describe, expect, it } from "vitest";
import { InsightEngine } from "./engine";
import type { RiskEntity, RiskProvider } from "./types";

function createEntity(overrides: Partial<RiskEntity> = {}): RiskEntity {
  return {
    type: "token",
    identifier: "ethereum",
    ...overrides,
  };
}

describe("InsightEngine", () => {
  it("runs matching providers and aggregates a medium-risk assessment", async () => {
    const engine = new InsightEngine();
    const entity = createEntity();

    const provider: RiskProvider = {
      id: "internal",
      name: "Internal",
      canHandle: () => true,
      getInsights: async () => [
        {
          signal: "High dilution risk",
          severity: "warning",
          detail: "FDV is far above market cap",
          provider: "Internal",
          category: "supply",
        },
      ],
    };

    engine.register(provider);

    const assessment = await engine.getRiskAssessment(entity);

    expect(assessment.riskLevel).toBe("medium");
    expect(assessment.score).toBeGreaterThan(0);
    expect(assessment.providers).toEqual(["Internal"]);
    expect(assessment.insights).toHaveLength(1);
  });

  it("deduplicates overlapping insights from different providers", async () => {
    const engine = new InsightEngine();
    const entity = createEntity();

    engine.register({
      id: "one",
      name: "Provider One",
      canHandle: () => true,
      getInsights: async () => [
        {
          signal: "Low liquidity",
          severity: "warning",
          detail: "Liquidity is below threshold",
          provider: "Provider One",
          category: "liquidity",
        },
      ],
    });
    engine.register({
      id: "two",
      name: "Provider Two",
      canHandle: () => true,
      getInsights: async () => [
        {
          signal: "Low liquidity",
          severity: "warning",
          detail: "Liquidity is below threshold",
          provider: "Provider Two",
          category: "liquidity",
        },
      ],
    });

    const assessment = await engine.getRiskAssessment(entity);

    expect(assessment.insights).toHaveLength(1);
    expect(assessment.providers).toEqual(["Provider One", "Provider Two"]);
  });

  it("isolates provider failures and still returns results from healthy providers", async () => {
    const engine = new InsightEngine();
    const entity = createEntity();

    engine.register({
      id: "broken",
      name: "Broken Provider",
      canHandle: () => true,
      getInsights: async () => {
        throw new Error("provider failed");
      },
    });
    engine.register({
      id: "healthy",
      name: "Healthy Provider",
      canHandle: () => true,
      getInsights: async () => [
        {
          signal: "Mint authority enabled",
          severity: "critical",
          detail: "Token can mint more supply",
          provider: "Healthy Provider",
          category: "contract",
        },
      ],
    });

    const assessment = await engine.getRiskAssessment(entity);

    expect(assessment.riskLevel).toBe("high");
    expect(assessment.insights).toHaveLength(1);
    expect(assessment.providers).toEqual(["Healthy Provider"]);
  });
});
