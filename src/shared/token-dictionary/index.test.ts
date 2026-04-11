import { describe, expect, it } from "vitest";
import { lookupByName, lookupByTicker } from "./index";

describe("token-dictionary", () => {
  it("resolves a known ticker case-insensitively", () => {
    expect(lookupByTicker(" btc ")).toEqual({
      coingeckoId: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
    });
  });

  it("resolves a known name with normalized whitespace", () => {
    expect(lookupByName("  Ethereum  ")).toEqual({
      coingeckoId: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
    });
  });

  it("prefers the highest-ranked token for ambiguous tickers", () => {
    expect(lookupByTicker("sol")).toEqual({
      coingeckoId: "solana",
      name: "Solana",
      symbol: "SOL",
    });
  });

  it("returns null for unknown values", () => {
    expect(lookupByTicker("not-a-token")).toBeNull();
    expect(lookupByName("Definitely Not A Coin")).toBeNull();
  });
});
