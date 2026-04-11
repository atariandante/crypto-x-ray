import { describe, expect, it, vi } from "vitest";
import { fetchTokenReport, fetchTokenSummary } from "./rugcheck";

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
  },
});

describe("rugcheck integration", { timeout: 30_000 }, () => {
  it("fetchTokenSummary returns a usable summary for wrapped SOL", async () => {
    const summary = await fetchTokenSummary(
      "So11111111111111111111111111111111111111112",
    );

    expect(summary).not.toBeNull();
    expect(summary!.mint).toBe("So11111111111111111111111111111111111111112");
    expect(summary!.score).toBeGreaterThanOrEqual(0);
    expect(summary!.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(summary!.tokenProgram).toBeTruthy();
  });

  it("fetchTokenReport returns the report envelope for wrapped SOL", async () => {
    const report = await fetchTokenReport(
      "So11111111111111111111111111111111111111112",
    );

    expect(report).not.toBeNull();
    expect(report!.mint).toBe("So11111111111111111111111111111111111111112");
    expect(report!.score).toBeGreaterThanOrEqual(0);
    expect(report!.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(typeof report!.rugged).toBe("boolean");
  });
});
