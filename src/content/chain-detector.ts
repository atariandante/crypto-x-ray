// Chain detection heuristics — infer chain from address format and page context
// TODO: Implement in T-04b
export function detectChain(_address: string, _pageUrl: string) { return { chain: "ethereum", confidence: 0.5, candidates: ["ethereum"] }; }
