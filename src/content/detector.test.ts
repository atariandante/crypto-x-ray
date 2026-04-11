/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { scanDocument } from "./detector";
import type { DetectedToken } from "@/shared/types";

type ExpectedDetection = Pick<
  DetectedToken,
  "text" | "type" | "ticker" | "coingeckoId"
> &
  Partial<Pick<DetectedToken, "chain">>;

function createTextNodes(...texts: string[]) {
  return texts.map((text) => document.createTextNode(text));
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
  it("detects dictionary-backed tickers with high confidence", () => {
    const results = scanDocument(createTextNodes("Bullish on $SOL today."));

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
    const results = scanDocument(createTextNodes("The market still talks about eThErEuM."));

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
    const results = scanDocument(
      createTextNodes("Wallet 0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 is active."),
    );

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
    const results = scanDocument(
      createTextNodes("Treasury So11111111111111111111111111111111111111112 moved."),
    );

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
    const results = scanDocument(createTextNodes("Follow vitalik.eth for updates."));

    expectDetection(
      results,
      {
        text: "vitalik.eth",
        type: "ens",
      },
      0.8,
    );
    expect(results.some((token) => token.text === "vitalik.eth" && token.type === "address")).toBe(
      false,
    );
  });

  it("skips ambiguous uppercase common words without a ticker prefix", () => {
    const results = scanDocument(createTextNodes("DASH is a dashboard label, not a token mention."));

    expect(results.some((token) => token.text === "DASH")).toBe(false);
  });

  it("skips common-word token names in ordinary prose", () => {
    const results = scanDocument(
      createTextNodes(
        "The render finished before sunrise while the team reviewed the mockup.",
      ),
    );

    expect(results.some((token) => token.text.toLowerCase() === "render")).toBe(false);
  });

  it("skips canton in ordinary prose without crypto context", () => {
    const results = scanDocument(
      createTextNodes("The delegation visited Canton before continuing the trade mission."),
    );

    expect(results.some((token) => token.text === "Canton")).toBe(false);
  });

  it("skips top-ranked ambiguous names in ordinary prose", () => {
    const results = scanDocument(createTextNodes("TRON Legacy is still a cult movie."));

    expect(results.some((token) => token.text === "TRON")).toBe(false);
  });

  it("detects ambiguous token names when nearby crypto context disambiguates them", () => {
    const results = scanDocument(
      createTextNodes("Rain token holders tracked the protocol after the exchange listing."),
    );

    expectDetection(
      results,
      {
        text: "Rain",
        type: "name",
        ticker: "RAIN",
        coingeckoId: "rain",
      },
      0.9,
    );
  });

  it("detects ambiguous token names when nearby crypto context appears before the name", () => {
    const results = scanDocument(createTextNodes("Token Dash rallied today."));

    expectDetection(
      results,
      {
        text: "Dash",
        type: "name",
        ticker: "DASH",
        coingeckoId: "dash",
      },
      0.9,
    );
  });

  it("returns stable detection text values for content-script highlighting", () => {
    const detections = scanDocument(
      createTextNodes(
        "Track $SOL, vitalik.eth, and Ethereum.",
        "Ignore plain LINK when it is not a ticker.",
      ),
    );

    expect(detections.map((detection) => detection.text)).toEqual([
      "$SOL",
      "vitalik.eth",
      "Ethereum",
    ]);
  });

  it("prefers longer overlapping names while preserving structured matcher precedence", () => {
    const results = scanDocument(
      createTextNodes(
        "Contact vitalik.eth about Bitcoin Cash before sending to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.",
      ),
    );

    expect(results).toEqual([
      expect.objectContaining({
        text: "vitalik.eth",
        type: "ens",
      }),
      expect.objectContaining({
        text: "Bitcoin Cash",
        type: "name",
        ticker: "BCH",
        coingeckoId: "bitcoin-cash",
      }),
      expect.objectContaining({
        text: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        type: "address",
        chain: "ethereum",
      }),
    ]);
    expect(results.some((token) => token.text === "Bitcoin")).toBe(false);
  });
});
