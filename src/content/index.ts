import { highlightDetectedTerms } from "./highlight-detections";
import { getVisibleTextNodes, startDynamicPageScanner } from "./text-scanner";

try {
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
} catch (err) {
  console.error("[Crypto X-Ray] Fatal error:", err);
}
