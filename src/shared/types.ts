// ============================================================
// Detection types — what the content script finds on the page
// ============================================================

/**
 * Identifies which kind of entity the content script detected in page text.
 */
export type DetectionType = "ticker" | "name" | "address";

/**
 * Represents a candidate entity found during page scanning before resolution.
 */
export interface DetectedToken {
  text: string;
  type: DetectionType;
  ticker?: string;
  coingeckoId?: string;
  chain?: Chain;
  confidence: number;
}

// ============================================================
// Chain types
// ============================================================

/**
 * Blockchain networks the extension currently knows how to reason about.
 */
export type Chain =
  | "ethereum"
  | "arbitrum"
  | "base"
  | "polygon"
  | "optimism"
  | "bsc"
  | "solana"
  | "avalanche";

/**
 * Describes the best chain guess plus alternative candidates from heuristics.
 */
export interface ChainDetectionResult {
  chain: Chain;
  confidence: number;
  candidates: Chain[];
}

// ============================================================
// Resolution types — what an address/ticker resolves to
// ============================================================

/**
 * Distinguishes which profile family a resolver returned.
 */
export type ResolutionType = "known_token" | "unknown_token" | "wallet";

/**
 * Wraps the resolved data returned by the shared resolution pipeline.
 */
export interface ResolutionResult {
  type: ResolutionType;
  data: TokenProfile | UnknownTokenProfile | WalletProfile;
}

// ============================================================
// Token profile — full analysis for known (indexed) tokens
// ============================================================

/**
 * Canonical analysis payload for a known token with indexed market data.
 */
export interface TokenProfile {
  // Identity
  id: string;
  coingeckoId: string;
  name: string;
  symbol: string;
  logo?: string;
  category?: string;
  chains: Chain[];

  // Price
  price: number;
  priceChange24h: number;
  ath: number;
  athDate?: string;

  // Supply
  supply: SupplyInfo;

  // Unlocks (DeFiLlama Pro — $300/mo)
  unlocks?: UnlockInfo;

  // Allocation (DeFiLlama Pro — $300/mo)
  allocation?: AllocationInfo;

  // Fundamentals (free: DeFiLlama + CoinGecko)
  fundamentals?: FundamentalsInfo;

  // Scoring
  score?: TokenScore;

  // TGE analysis (if newly launched)
  tge?: TGEAnalysis;

  // Meta
  lastUpdated: number;
}

// ============================================================
// Unknown token profile — for tokens not on CoinGecko
// ============================================================

/**
 * Lightweight analysis payload for contracts not found in indexed sources.
 */
export interface UnknownTokenProfile {
  contractAddress: string;
  chain: Chain;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
  holderCount?: number;
  deployerAddress?: string;
  contractAge?: number; // days since deployment
  isVerified: boolean;
  warnings: string[];
}

// ============================================================
// Wallet profile — for EOA addresses
// ============================================================

/**
 * Summary payload for wallet addresses and their recent on-chain activity.
 */
export interface WalletProfile {
  address: string;
  chain: Chain;
  totalValueUsd: number;
  topHoldings: WalletHolding[];
  recentTransactions: WalletTransaction[];
  labels: string[];
  riskIndicators: string[];
  lastUpdated: number;
}

/**
 * A single token position within a resolved wallet portfolio.
 */
export interface WalletHolding {
  name: string;
  symbol: string;
  amount: number;
  valueUsd: number;
  percentage: number;
  logo?: string;
}

/**
 * A recent wallet activity entry normalized for UI consumption.
 */
export interface WalletTransaction {
  type: "send" | "receive" | "swap" | "approve" | "other";
  token?: string;
  amount?: number;
  valueUsd?: number;
  timeAgo: string;
  hash: string;
}

// ============================================================
// Supply data
// ============================================================

/**
 * Describes the token-supply regime inferred from external market data.
 */
export type SupplyType = "fixed" | "inflationary" | "deflationary" | "rebase";

/**
 * Supply and valuation metrics used by token scoring and UI summaries.
 */
export interface SupplyInfo {
  type: SupplyType;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  circulatingPercent: number; // 0-100
  marketCap: number;
  fdv: number;
  fdvToMcapRatio: number; // fdv / marketCap
  hasBurnMechanism: boolean;
}

// ============================================================
// Unlock / vesting data
// ============================================================

/**
 * Classifies how threatening upcoming token unlocks are to circulating supply.
 */
export type UnlockPressure = "low" | "medium" | "high" | "critical";

/**
 * Vesting and unlock metadata used to estimate sell pressure.
 */
export interface UnlockInfo {
  nextUnlockDate?: string;
  nextUnlockAmount?: number;
  nextUnlockPercentOfCirculating?: number;
  nextUnlockRecipient?: string;
  pressure: UnlockPressure;
  supplyIncrease30d: number; // percentage
  supplyIncrease90d: number; // percentage
}

// ============================================================
// Allocation data
// ============================================================

/**
 * Token allocation breakdown for major stakeholder groups.
 */
export interface AllocationInfo {
  team: number; // percentage
  investors: number;
  community: number;
  ecosystem: number;
  treasury: number;
  other: number;
  teamVestingStatus: "locked" | "unlocking" | "fully_unlocked";
  investorVestingStatus: "locked" | "unlocking" | "fully_unlocked";
}

// ============================================================
// Fundamentals data
// ============================================================

/**
 * Fundamental protocol metrics used to enrich token analysis.
 */
export interface FundamentalsInfo {
  revenueUsd?: number;
  revenueTrend?: "growing" | "flat" | "shrinking";
  tvlUsd?: number;
  tvlTrend?: "growing" | "flat" | "shrinking";
  activeUsers?: number;
  githubCommits30d?: number;
}

// ============================================================
// Scoring
// ============================================================

/**
 * Human-readable token health score derived from multiple heuristics.
 */
export interface TokenScore {
  overall: number; // 1-5
  supply: number; // 1-5
  fundamentals: number; // 1-5
  verdict: string; // 1-line summary
  redFlags: string[];
}

// ============================================================
// TGE analysis (for newly launched tokens)
// ============================================================

/**
 * Letter grade assigned to a token-generation event assessment.
 */
export type TGEGrade = "A" | "B" | "C" | "D" | "F";

/**
 * Launch-time tokenomics assessment for newly released assets.
 */
export interface TGEAnalysis {
  tgeUnlockPercent: number;
  grade: TGEGrade;
  estimatedSellPressure: "low" | "moderate" | "high" | "extreme";
  redFlags: string[];
  comparables: TGEComparable[];
}

/**
 * Comparable launch profile used to contextualize a TGE analysis.
 */
export interface TGEComparable {
  name: string;
  category: string;
  launchFdv: number;
  tgeUnlockPercent: number;
  priceChange30d: number;
  priceChange90d: number;
}

// ============================================================
// RugCheck data
// ============================================================

/**
 * A single risk signal returned by RugCheck and normalized for the app.
 */
export interface RugCheckRisk {
  name: string;
  level: string;
  description?: string;
  value?: string;
  score?: number;
}

/**
 * Lightweight RugCheck summary used for fast Solana risk lookups.
 */
export interface RugCheckSummary {
  mint: string;
  score: number;
  normalizedScore: number;
  tokenProgram: string;
  tokenType: string;
  lpLockedPct?: number;
  risks: RugCheckRisk[];
}

/**
 * Expanded RugCheck payload used when deeper holder or market context is needed.
 */
export interface RugCheckReport extends RugCheckSummary {
  rugged: boolean;
  topHolders: Record<string, unknown>[];
  markets: Record<string, unknown>[];
  graphInsidersDetected: number;
  insiderNetworks: Record<string, unknown>[];
  creatorTokens: Record<string, unknown>[];
}

// ============================================================
// Settings
// ============================================================

/**
 * User-configurable extension settings persisted in local storage.
 */
export interface UserSettings {
  detectionEnabled: boolean;
  highlightStyle: "underline" | "background" | "none";
  disabledSites: string[];
  theme: "light" | "dark" | "auto";
  alertLevel: "all" | "important_only" | "critical_only";
  apiKeys: {
    defiLlamaPro?: string; // $300/mo — unlocks emission/allocation data
    etherscan?: string;
    solscan?: string;
    debank?: string;
  };
  tier: "free" | "paid";
}

// ============================================================
// Cache
// ============================================================

/**
 * Envelope stored in cache so values carry their own expiration metadata.
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Shared cache durations tuned to the volatility of each data source.
 */
export const CACHE_TTL = {
  PRICE: 5 * 60 * 1000, // 5 minutes
  SUPPLY: 60 * 60 * 1000, // 1 hour
  ALLOCATION: 24 * 60 * 60 * 1000, // 24 hours
  DICTIONARY: 7 * 24 * 60 * 60 * 1000, // 1 week
  RUGCHECK: 5 * 60 * 1000, // 5 minutes
  ADDRESS_RESOLUTION: 5 * 60 * 1000, // 5 minutes
  WALLET: 5 * 60 * 1000, // 5 minutes
} as const;

// ============================================================
// Messages (content script <-> background service worker)
// ============================================================

/**
 * Message names exchanged between content scripts and the background worker.
 */
export type MessageType =
  | "RESOLVE_TOKEN"
  | "RESOLVE_ADDRESS"
  | "GET_SETTINGS"
  | "UPDATE_SETTINGS"
  | "SEARCH_TOKEN";

/**
 * Generic message envelope for extension runtime communication.
 */
export interface Message {
  type: MessageType;
  payload: unknown;
}

/**
 * Standard success/error response envelope for runtime message handlers.
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
