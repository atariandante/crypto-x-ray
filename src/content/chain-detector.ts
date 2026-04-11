/**
 * Infers the most likely chain for a detected address from page context.
 * This placeholder keeps the content pipeline typed until chain heuristics land.
 */
export function detectChain(_address: string, _pageUrl: string) {
  return { chain: "ethereum", confidence: 0.5, candidates: ["ethereum"] };
}
