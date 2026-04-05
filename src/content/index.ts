import { getVisibleTextNodes, startDynamicPageScanner } from "./text-scanner";

console.log("[Crypto X-Ray] Content script loaded");

function scan() {
  const nodes = getVisibleTextNodes();
  console.log(`[Crypto X-Ray] Found ${nodes.length} visible text nodes`);
  return nodes;
}

scan();

startDynamicPageScanner((newNodes) => {
  console.log(`[Crypto X-Ray] ${newNodes.length} new text nodes detected`);
});

console.log("[Crypto X-Ray] Dynamic page scanner started");
