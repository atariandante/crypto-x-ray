import { getVisibleTextNodes, startDynamicPageScanner } from "./text-scanner";
import { highlightNodes } from "./highlighter";

console.log("[Crypto X-Ray] Content script loaded");

const DEMO_TERMS = [
  "$SOL",
  "$ETH",
  "$BTC",
  "Bitcoin",
  "Ethereum",
  "Solana",
  "0x",
  "blockchain",
  "DeFi",
  "NFT",
  "wallet",
];

function scan() {
  console.log("[Crypto X-Ray] Starting scan...");
  const nodes = getVisibleTextNodes();
  console.log(`[Crypto X-Ray] Found ${nodes.length} visible text nodes`);

  if (nodes.length > 0) {
    console.log(
      "[Crypto X-Ray] First few text samples:",
      nodes.slice(0, 5).map((n) => n.textContent?.slice(0, 50))
    );
  }

  const highlighted = highlightNodes(nodes, DEMO_TERMS);
  console.log(`[Crypto X-Ray] Highlighted ${highlighted} nodes with terms:`, DEMO_TERMS);
}

scan();

startDynamicPageScanner((newNodes) => {
  console.log(`[Crypto X-Ray] ${newNodes.length} new nodes detected`);
  const highlighted = highlightNodes(newNodes, DEMO_TERMS);
  console.log(`[Crypto X-Ray] Highlighted ${highlighted} new nodes`);
});

console.log("[Crypto X-Ray] Dynamic page scanner started");
