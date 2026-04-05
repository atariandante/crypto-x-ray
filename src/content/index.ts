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
  const nodes = getVisibleTextNodes();
  const highlighted = highlightNodes(nodes, DEMO_TERMS);
  console.log(`[Crypto X-Ray] Scanned ${nodes.length} nodes, highlighted ${highlighted}`);
}

scan();

startDynamicPageScanner((newNodes) => {
  const highlighted = highlightNodes(newNodes, DEMO_TERMS);
  console.log(`[Crypto X-Ray] ${newNodes.length} new nodes, highlighted ${highlighted}`);
});

console.log("[Crypto X-Ray] Dynamic page scanner started");
