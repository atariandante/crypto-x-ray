// ============================================================
// Detection types — what the content script finds on the page
// ============================================================

export type DetectionType = "ticker" | "name" | "address";

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

export type Chain =
  | "ethereum"
  | "arbitrum"
  | "base"
  | "polygon"
  | "optimism"
  | "bsc"
  | "solana"
  | "avalanche";

export interface ChainDetectionResult {
  chain: Chain;
  confidence: number;
  candidates: Chain[];
}

// ============================================================
// Resolution types — what an address/ticker resolves to
// ============================================================

export type ResolutionType = "known_token" | "unknown_token" | "wallet";

export interface ResolutionResult {
  type: ResolutionType;
  data: TokenProfile | UnknownTokenProfile | WalletProfile;
}

// ============================================================
// Token profile — full analysis for known (indexed) tokens
// ============================================================

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

export interface WalletHolding {
  name: string;
  symbol: string;
  amount: number;
  valueUsd: number;
  percentage: number;
  logo?: string;
}

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

export type SupplyType = "fixed" | "inflationary" | "deflationary" | "rebase";

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

export type UnlockPressure = "low" | "medium" | "high" | "critical";

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

export type TGEGrade = "A" | "B" | "C" | "D" | "F";

export interface TGEAnalysis {
  tgeUnlockPercent: number;
  grade: TGEGrade;
  estimatedSellPressure: "low" | "moderate" | "high" | "extreme";
  redFlags: string[];
  comparables: TGEComparable[];
}

export interface TGEComparable {
  name: string;
  category: string;
  launchFdv: number;
  tgeUnlockPercent: number;
  priceChange30d: number;
  priceChange90d: number;
}

// ============================================================
// Settings
// ============================================================

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

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export const CACHE_TTL = {
  PRICE: 5 * 60 * 1000, // 5 minutes
  SUPPLY: 60 * 60 * 1000, // 1 hour
  ALLOCATION: 24 * 60 * 60 * 1000, // 24 hours
  DICTIONARY: 7 * 24 * 60 * 60 * 1000, // 1 week
  ADDRESS_RESOLUTION: 5 * 60 * 1000, // 5 minutes
  WALLET: 5 * 60 * 1000, // 5 minutes
} as const;

// ============================================================
// Messages (content script <-> background service worker)
// ============================================================

export type MessageType =
  | "RESOLVE_TOKEN"
  | "RESOLVE_ADDRESS"
  | "GET_SETTINGS"
  | "UPDATE_SETTINGS"
  | "SEARCH_TOKEN";

export interface Message {
  type: MessageType;
  payload: unknown;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
