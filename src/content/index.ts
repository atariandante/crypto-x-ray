import { highlightDetectedTerms } from "./highlight-detections";
import { sendMessage } from "./messaging";
import { getVisibleTextNodes, startDynamicPageScanner } from "./text-scanner";
import type { Chain, Message } from "@/shared/types";

const HIGHLIGHT_SELECTOR = ".crypto-xray-highlight";

/**
 * Builds the generic background request for a highlighted entity using only
 * metadata stored on the span.
 */
export function buildRiskAssessmentMessage(element: HTMLElement): Message | null {
  if (element.dataset.coingeckoId) {
    return {
      type: "GET_RISK_ASSESSMENT",
      payload: { id: element.dataset.coingeckoId },
    };
  }

  if (
    element.dataset.entityType === "address" &&
    element.dataset.chain &&
    element.textContent
  ) {
    return {
      type: "GET_RISK_ASSESSMENT",
      payload: {
        address: element.textContent,
        chain: element.dataset.chain as Chain,
      },
    };
  }

  return null;
}

async function requestRiskAssessment(element: HTMLElement): Promise<void> {
  const message = buildRiskAssessmentMessage(element);
  if (!message) {
    return;
  }

  try {
    await sendMessage(message);
  } catch (error) {
    console.error("[Crypto X-Ray] Risk assessment request failed:", error);
  }
}

/**
 * Boots the content-script scan pipeline and wires highlight interactions to
 * the background messaging client.
 */
export function initializeContentScript(): void {
  console.log("[Crypto X-Ray] Content script loaded");

  function scan(): void {
    console.log("[Crypto X-Ray] Starting scan...");
    const nodes = getVisibleTextNodes();
    console.log(`[Crypto X-Ray] Found ${nodes.length} visible text nodes`);

    if (nodes.length > 0) {
      console.log(
        "[Crypto X-Ray] First few text samples:",
        nodes.slice(0, 5).map((n) => n.textContent?.slice(0, 50))
      );
    }

    const highlighted = highlightDetectedTerms(nodes);
    console.log(`[Crypto X-Ray] Highlighted ${highlighted} nodes from detector output`);
  }

  scan();

  document.addEventListener("mouseenter", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const highlight = target.closest(HIGHLIGHT_SELECTOR);
    if (highlight instanceof HTMLElement) {
      void requestRiskAssessment(highlight);
    }
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const highlight = target.closest(HIGHLIGHT_SELECTOR);
    if (highlight instanceof HTMLElement) {
      void requestRiskAssessment(highlight);
    }
  });

  startDynamicPageScanner((event) => {
    if (event.type === "full") {
      console.log("[Crypto X-Ray] SPA navigation detected, running full re-scan");
      scan();
      return;
    }

    console.log(`[Crypto X-Ray] ${event.nodes.length} new nodes detected`);
    const highlighted = highlightDetectedTerms(event.nodes);
    console.log(`[Crypto X-Ray] Highlighted ${highlighted} new nodes`);
  });

  console.log("[Crypto X-Ray] Dynamic page scanner started");
}

try {
  initializeContentScript();
} catch (err) {
  console.error("[Crypto X-Ray] Fatal error:", err);
}
