import { beforeEach, describe, expect, it, vi } from "vitest";
import { RugCheckProvider } from "./rugcheck";

const { fetchTokenSummary } = vi.hoisted(() => ({
  fetchTokenSummary: vi.fn(),
}));

vi.mock("../../api/rugcheck", () => ({
  fetchTokenSummary,
}));

describe("RugCheckProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only handles Solana token entities", () => {
    const provider = new RugCheckProvider();

    expect(
      provider.canHandle({
        type: "token",
        identifier: "So11111111111111111111111111111111111111112",
        chain: "solana",
      }),
    ).toBe(true);
    expect(
      provider.canHandle({
        type: "token",
        identifier: "0xabc",
        chain: "ethereum",
      }),
    ).toBe(false);
  });

  it("maps RugCheck summary risks and LP lock warnings into insights", async () => {
    fetchTokenSummary.mockResolvedValue({
      mint: "So11111111111111111111111111111111111111112",
      score: 1000,
      normalizedScore: 80,
      tokenProgram: "Tokenkeg",
      tokenType: "spl",
      lpLockedPct: 60,
      risks: [
        {
          name: "Mint authority enabled",
          level: "high",
          description: "Token can mint more supply",
        },
      ],
    });

    const provider = new RugCheckProvider();
    const insights = await provider.getInsights({
      type: "token",
      identifier: "So11111111111111111111111111111111111111112",
      chain: "solana",
    });

    expect(insights.map((insight) => insight.signal)).toEqual(
      expect.arrayContaining(["Mint authority enabled", "Low liquidity lock"]),
    );
    expect(insights.find((insight) => insight.signal === "Mint authority enabled")?.severity).toBe(
      "critical",
    );
  });
});
