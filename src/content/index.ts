import { scanDocument } from "./detector";
import { highlightNodes } from "./highlighter";
import { getVisibleTextNodes, startDynamicPageScanner } from "./text-scanner";

try {
  console.log("[Crypto X-Ray] Content script loaded");

  /**
   * Runs detector-driven highlighting for the current batch of text nodes.
   * The detector can emit repeated terms across nodes, but the highlighter
   * contract expects a unique term list.
   */
  function highlightDetectedTerms(nodes: Text[]): number {
    const detections = scanDocument(nodes);
    const terms = [...new Set(detections.map((detection) => detection.text))];

    console.log(
      `[Crypto X-Ray] Detector returned ${detections.length} detections and ${terms.length} unique terms`,
      terms
    );

    return highlightNodes(nodes, terms);
  }

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

  startDynamicPageScanner((newNodes) => {
    console.log(`[Crypto X-Ray] ${newNodes.length} new nodes detected`);
    const highlighted = highlightDetectedTerms(newNodes);
    console.log(`[Crypto X-Ray] Highlighted ${highlighted} new nodes`);
  });

  console.log("[Crypto X-Ray] Dynamic page scanner started");
} catch (err) {
  console.error("[Crypto X-Ray] Fatal error:", err);
}
