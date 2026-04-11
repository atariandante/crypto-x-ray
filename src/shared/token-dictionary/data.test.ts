import { describe, expect, it } from "vitest";
import { TOKEN_DICTIONARY_DATA } from "./data";

describe("generated token dictionary data", () => {
  it("contains at least 100 ranked tokens", () => {
    expect(TOKEN_DICTIONARY_DATA.length).toBeGreaterThanOrEqual(100);
  });

  it("stores uppercase symbols and positive market cap ranks", () => {
    for (const token of TOKEN_DICTIONARY_DATA) {
      expect(token.symbol).toBe(token.symbol.toUpperCase());
      expect(token.marketCapRank).toBeGreaterThan(0);
    }
  });
});
