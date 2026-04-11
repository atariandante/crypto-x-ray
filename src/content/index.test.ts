/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
const getVisibleTextNodes = vi.fn(() => []);
const startDynamicPageScanner = vi.fn();
const highlightDetectedTerms = vi.fn(() => 0);

vi.mock("./messaging", () => ({
  sendMessage,
}));

vi.mock("./text-scanner", () => ({
  getVisibleTextNodes,
  startDynamicPageScanner,
}));

vi.mock("./highlight-detections", () => ({
  highlightDetectedTerms,
}));

describe("content interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("builds a GET_RISK_ASSESSMENT request for dictionary-backed highlights", async () => {
    const { buildRiskAssessmentMessage } = await import("./index");

    const span = document.createElement("span");
    span.dataset.coingeckoId = "ethereum";
    span.dataset.entityType = "name";

    expect(buildRiskAssessmentMessage(span)).toEqual({
      type: "GET_RISK_ASSESSMENT",
      payload: { id: "ethereum" },
    });
  });

  it("builds a GET_RISK_ASSESSMENT request for address highlights", async () => {
    const { buildRiskAssessmentMessage } = await import("./index");

    const span = document.createElement("span");
    span.textContent = "0xabc";
    span.dataset.entityType = "address";
    span.dataset.chain = "ethereum";

    expect(buildRiskAssessmentMessage(span)).toEqual({
      type: "GET_RISK_ASSESSMENT",
      payload: { address: "0xabc", chain: "ethereum" },
    });
  });

  it("sends a background message when a highlighted entity is hovered", async () => {
    const { initializeContentScript } = await import("./index");

    const span = document.createElement("span");
    span.className = "crypto-xray-highlight";
    span.textContent = "Ethereum";
    span.dataset.coingeckoId = "ethereum";
    span.dataset.entityType = "name";
    document.body.appendChild(span);

    initializeContentScript();
    span.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    expect(sendMessage).toHaveBeenCalledWith({
      type: "GET_RISK_ASSESSMENT",
      payload: { id: "ethereum" },
    });
  });
});
