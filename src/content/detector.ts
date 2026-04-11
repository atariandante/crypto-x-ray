import { lookupByTicker, TOKEN_DICTIONARY_DATA } from "@/shared/dictionary";
import type { Chain, DetectedToken } from "@/shared/types";

const ENS_PATTERN = /\b[a-z0-9-]+\.eth\b/gi;
const EVM_ADDRESS_PATTERN = /\b0x[a-fA-F0-9]{40}\b/g;
const SOLANA_ADDRESS_PATTERN = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
const TICKER_PATTERN = /(^|[^A-Za-z0-9])(\$[A-Z]{2,5})(?=$|[^A-Za-z0-9])/g;
const NAME_CONTEXT_REQUIRED_RANK_THRESHOLD = 20;
const CONTEXT_SENSITIVE_NAME_MAX_LENGTH = 7;
const CRYPTO_CONTEXT_WORD_PATTERN =
  "\\b(token|tokens|coin|coins|crypto|blockchain|protocol|wallet|wallets|address|addresses|chain|network|market|markets|price|prices|chart|charts|holder|holders|trader|traders|trading|exchange|exchanges|defi|dex|staking|liquidity|airdrop|listing|supply)\\b";
const BEFORE_CRYPTO_CONTEXT_PATTERN = new RegExp(
  `${CRYPTO_CONTEXT_WORD_PATTERN}(?:\\W+\\w+){0,2}\\W*$`,
  "i",
);
const AFTER_CRYPTO_CONTEXT_PATTERN = new RegExp(
  `^\\W*(?:\\w+\\W+){0,2}${CRYPTO_CONTEXT_WORD_PATTERN}`,
  "i",
);

interface Span {
  start: number;
  end: number;
}

interface SpanMatch extends Span {
  detection: DetectedToken;
}

/**
 * Associates an accepted detection with the source text node and exact offsets.
 */
export interface DetectedTextMatch extends Span {
  detection: DetectedToken;
  node: Text;
}

interface NamePattern {
  coingeckoId: string;
  pattern: RegExp;
  requiresCryptoContext: boolean;
  ticker: string;
}

const NAME_PATTERNS: NamePattern[] = TOKEN_DICTIONARY_DATA.map((entry) => ({
  coingeckoId: entry.coingeckoId,
  pattern: new RegExp(
    `(^|[^A-Za-z0-9])(${escapePattern(entry.name)})(?=$|[^A-Za-z0-9])`,
    "gi",
  ),
  requiresCryptoContext: requiresCryptoContext(entry.name, entry.marketCapRank),
  ticker: entry.symbol,
}));

/**
 * Scans visible text nodes for crypto entities while preserving source order.
 *
 * Structured matches reserve spans before softer dictionary-name matches so the
 * content script can highlight stable, non-overlapping detections.
 */
export function scanDocument(textNodes: Text[]): DetectedToken[] {
  return scanDocumentMatches(textNodes).map((match) => match.detection);
}

/**
 * Scans visible text nodes and keeps the accepted match offsets for exact highlighting.
 */
export function scanDocumentMatches(textNodes: Text[]): DetectedTextMatch[] {
  const matches: DetectedTextMatch[] = [];

  for (const node of textNodes) {
    const text = node.textContent;
    if (!text?.trim()) {
      continue;
    }

    const occupied: Span[] = [];
    const accepted: SpanMatch[] = [];

    acceptMatches(accepted, occupied, collectRegexMatches(text, ENS_PATTERN, createEnsDetection));
    acceptMatches(
      accepted,
      occupied,
      collectRegexMatches(text, EVM_ADDRESS_PATTERN, (value) =>
        createAddressDetection(value, "ethereum", 0.98),
      ),
    );
    acceptMatches(
      accepted,
      occupied,
      collectRegexMatches(text, SOLANA_ADDRESS_PATTERN, (value) =>
        createAddressDetection(value, "solana", 0.95),
      ),
    );
    acceptMatches(accepted, occupied, collectTickerMatches(text));
    acceptMatches(accepted, occupied, sortMatchesForAcceptance(collectNameMatches(text)));

    accepted.sort((left, right) => left.start - right.start || left.end - right.end);
    matches.push(...accepted.map((match) => ({ ...match, node })));
  }

  return matches;
}

/**
 * Collects precise regex-backed matches such as ENS domains and addresses.
 */
function collectRegexMatches(
  text: string,
  pattern: RegExp,
  createDetection: (value: string) => DetectedToken,
): SpanMatch[] {
  const matches: SpanMatch[] = [];
  pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[0];
    matches.push({
      start: match.index,
      end: match.index + value.length,
      detection: createDetection(value),
    });
  }

  return matches;
}

/**
 * Collects `$TICKER` matches and enriches them with dictionary metadata when available.
 */
function collectTickerMatches(text: string): SpanMatch[] {
  const matches: SpanMatch[] = [];
  TICKER_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TICKER_PATTERN.exec(text)) !== null) {
    const tickerText = match[2];
    const start = match.index + match[1].length;
    const end = start + tickerText.length;
    const normalizedTicker = tickerText.slice(1);
    const dictionaryMatch = lookupByTicker(normalizedTicker);

    matches.push({
      start,
      end,
      detection: {
        text: tickerText,
        type: "ticker",
        ticker: dictionaryMatch?.symbol ?? normalizedTicker,
        coingeckoId: dictionaryMatch?.coingeckoId,
        confidence: dictionaryMatch ? 0.96 : 0.7,
      },
    });
  }

  return matches;
}

/**
 * Collects dictionary-backed token-name matches before overlap filtering is applied.
 */
function collectNameMatches(text: string): SpanMatch[] {
  const matches: SpanMatch[] = [];

  for (const namePattern of NAME_PATTERNS) {
    namePattern.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = namePattern.pattern.exec(text)) !== null) {
      const value = match[2];
      const start = match.index + match[1].length;
      const end = start + value.length;
      if (!isAcceptedNameMatch(text, start, end, namePattern, value)) {
        continue;
      }

      matches.push({
        start,
        end,
        detection: {
          text: value,
          type: "name",
          ticker: namePattern.ticker,
          coingeckoId: namePattern.coingeckoId,
          confidence: value === value.toUpperCase() ? 0.6 : 0.92,
        },
      });
    }
  }

  return matches;
}

/**
 * Accepts only matches whose spans are still free, preserving matcher precedence.
 */
function acceptMatches(
  accepted: SpanMatch[],
  occupied: Span[],
  candidates: SpanMatch[],
): void {
  for (const candidate of candidates) {
    if (reserveSpan(candidate, occupied)) {
      accepted.push(candidate);
    }
  }
}

/**
 * Prioritizes longer candidates so broader dictionary names win within overlapping spans.
 */
function sortMatchesForAcceptance(matches: SpanMatch[]): SpanMatch[] {
  return [...matches].sort((left, right) => {
    const lengthDelta = right.end - right.start - (left.end - left.start);
    if (lengthDelta !== 0) {
      return lengthDelta;
    }

    return left.start - right.start;
  });
}

/**
 * Reserves a span if it does not overlap an already accepted detection.
 */
function reserveSpan(match: Span, occupied: Span[]): boolean {
  if (occupied.some((span) => match.start < span.end && match.end > span.start)) {
    return false;
  }

  occupied.push({ start: match.start, end: match.end });
  return true;
}

/**
 * Accepts unambiguous names immediately and requires local crypto context for ambiguous ones.
 */
function isAcceptedNameMatch(
  text: string,
  start: number,
  end: number,
  namePattern: NamePattern,
  value: string,
): boolean {
  if (!namePattern.requiresCryptoContext && !isUppercaseNameMatch(value)) {
    return true;
  }

  return hasNearbyCryptoContext(text, start, end);
}

/**
 * Marks lower-ranked, short single-word alphabetic names as context-sensitive.
 */
function requiresCryptoContext(name: string, marketCapRank: number): boolean {
  return (
    marketCapRank > NAME_CONTEXT_REQUIRED_RANK_THRESHOLD &&
    isSingleWordAlphabetic(name) &&
    name.length <= CONTEXT_SENSITIVE_NAME_MAX_LENGTH
  );
}

/**
 * Looks for crypto-oriented vocabulary within a few words of an ambiguous name.
 */
function hasNearbyCryptoContext(text: string, start: number, end: number): boolean {
  const beforeContext = text.slice(Math.max(0, start - 40), start);
  const afterContext = text.slice(end, Math.min(text.length, end + 40));

  return (
    BEFORE_CRYPTO_CONTEXT_PATTERN.test(beforeContext) ||
    AFTER_CRYPTO_CONTEXT_PATTERN.test(afterContext)
  );
}

/**
 * Identifies plain single-word alphabetic names that are more likely to appear in prose.
 */
function isSingleWordAlphabetic(value: string): boolean {
  return /^[A-Za-z]+$/.test(value);
}

/**
 * Treats all-uppercase single-word names as ambiguous unless nearby crypto context disambiguates them.
 */
function isUppercaseNameMatch(value: string): boolean {
  return isSingleWordAlphabetic(value) && value === value.toUpperCase();
}

/**
 * Escapes literal token names before embedding them in boundary-aware regexes.
 */
function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the normalized ENS detection payload used by the structured matcher pass.
 */
function createEnsDetection(value: string): DetectedToken {
  return {
    text: value,
    type: "ens",
    confidence: 0.99,
  };
}

/**
 * Builds a chain-aware address detection for structured address patterns.
 */
function createAddressDetection(value: string, chain: Chain, confidence: number): DetectedToken {
  return {
    text: value,
    type: "address",
    chain,
    confidence,
  };
}
