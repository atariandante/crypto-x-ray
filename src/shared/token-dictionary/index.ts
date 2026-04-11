import { TOKEN_DICTIONARY_DATA } from "./data";
import { normalizeName, normalizeTicker } from "./normalize";
import type { TokenDictionaryEntry, TokenDictionaryMatch } from "./types";

function toMatch(entry: TokenDictionaryEntry): TokenDictionaryMatch {
  return {
    coingeckoId: entry.coingeckoId,
    name: entry.name,
    symbol: entry.symbol,
  };
}

const tickerMap = new Map<string, TokenDictionaryEntry>();
const nameMap = new Map<string, TokenDictionaryEntry>();

for (const entry of TOKEN_DICTIONARY_DATA) {
  const tickerKey = normalizeTicker(entry.symbol);
  const existingTicker = tickerMap.get(tickerKey);
  if (!existingTicker || entry.marketCapRank < existingTicker.marketCapRank) {
    tickerMap.set(tickerKey, entry);
  }

  nameMap.set(normalizeName(entry.name), entry);
}

/**
 * Resolve a ticker symbol to the best-ranked token in the local dictionary.
 */
export function lookupByTicker(ticker: string): TokenDictionaryMatch | null {
  const entry = tickerMap.get(normalizeTicker(ticker));
  return entry ? toMatch(entry) : null;
}

/**
 * Resolve a token name to a local dictionary match.
 */
export function lookupByName(name: string): TokenDictionaryMatch | null {
  const entry = nameMap.get(normalizeName(name));
  return entry ? toMatch(entry) : null;
}
