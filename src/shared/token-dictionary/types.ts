/**
 * Stores the generated dictionary payload used for Tier 1 token resolution.
 * Rank is kept so ticker collisions can be resolved deterministically.
 */
export interface TokenDictionaryEntry {
  coingeckoId: string;
  name: string;
  symbol: string;
  marketCapRank: number;
}

/**
 * Minimal dictionary match returned to callers after a successful lookup.
 * The lookup layer intentionally hides generator-only metadata like rank.
 */
export interface TokenDictionaryMatch {
  coingeckoId: string;
  name: string;
  symbol: string;
}
