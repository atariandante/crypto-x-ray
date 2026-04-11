/** @vitest-environment jsdom */
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { scanDocument } from "./detector";
import type { DetectedToken } from "@/shared/types";

type ExpectedDetection = Pick<
  DetectedToken,
  "text" | "type" | "ticker" | "coingeckoId" | "chain"
>;

function renderPage(text: string) {
  document.body.innerHTML = `<main>${text}</main>`;
}

function expectDetection(
  results: DetectedToken[],
  expected: ExpectedDetection,
  minConfidence?: number,
) {
  expect(results).toEqual(
    expect.arrayContaining([expect.objectContaining(expected)]),
  );

  if (minConfidence != null) {
    const match = results.find((token) => token.text === expected.text);
    expect(match?.confidence).toBeGreaterThanOrEqual(minConfidence);
  }
}

describe("scanDocument", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("detects dictionary-backed tickers with high confidence", () => {
    renderPage("Bullish on $SOL today.");

    const results = scanDocument();

    expectDetection(
      results,
      {
        text: "$SOL",
        type: "ticker",
        ticker: "SOL",
        coingeckoId: "solana",
      },
      0.9,
    );
  });

  it("detects token names case-insensitively", () => {
    renderPage("The market still talks about eThErEuM.");

    const results = scanDocument();

    expectDetection(
      results,
      {
        text: "eThErEuM",
        type: "name",
        ticker: "ETH",
        coingeckoId: "ethereum",
      },
      0.9,
    );
  });

  it("detects EVM addresses with chain metadata", () => {
    renderPage("Wallet 0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 is active.");

    const results = scanDocument();

    expectDetection(
      results,
      {
        text: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        type: "address",
        chain: "ethereum",
      },
      0.8,
    );
  });

  it("detects Solana addresses with chain metadata", () => {
    renderPage("Treasury So11111111111111111111111111111111111111112 moved.");

    const results = scanDocument();

    expectDetection(
      results,
      {
        text: "So11111111111111111111111111111111111111112",
        type: "address",
        chain: "solana",
      },
      0.8,
    );
  });

  it("treats ENS domains as distinct from addresses", () => {
    const expected = [
      {
        text: "vitalik.eth",
        type: "ens",
        chain: "ethereum",
      },
    ] satisfies ExpectedDetection[];

    renderPage("Follow vitalik.eth for updates.");

    const results = scanDocument();

    expectDetection(results, expected[0], 0.8);
    expect(results.some((token) => token.text === "vitalik.eth" && token.type === "address")).toBe(
      false,
    );
  });

  it("skips ambiguous uppercase common words without a ticker prefix", () => {
    renderPage("DASH is a dashboard label, not a token mention.");

    const results = scanDocument();

    expect(results.some((token) => token.text === "DASH")).toBe(false);
  });
});
