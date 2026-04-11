import type { TokenDictionaryEntry } from "./types";

export const TOKEN_DICTIONARY_DATA: TokenDictionaryEntry[] = [
  { coingeckoId: "bitcoin", name: "Bitcoin", symbol: "BTC", marketCapRank: 1 },
  { coingeckoId: "ethereum", name: "Ethereum", symbol: "ETH", marketCapRank: 2 },
  { coingeckoId: "solana", name: "Solana", symbol: "SOL", marketCapRank: 6 },
  {
    coingeckoId: "sol-wormhole",
    name: "SOL Wormhole",
    symbol: "SOL",
    marketCapRank: 9999,
  },
];
