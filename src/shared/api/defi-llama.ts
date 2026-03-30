import { DefiLlama } from "@defillama/api";
import { getCached, setCached } from "../cache";
import { CACHE_TTL, Chain, FundamentalsInfo } from "../types";

const client = new DefiLlama();

// ---------- Constants ----------

const TREND_LOOKBACK_DAYS = 30;
const TREND_GROWTH_THRESHOLD = 0.1; // 10% change to qualify as growing/shrinking
const DAYS_IN_MONTH = 30;
const DAYS_IN_YEAR = 365;

// ---------- Chain mapping ----------

const CHAIN_TO_DEFILLAMA: Record<Chain, string> = {
  ethereum: "ethereum",
  arbitrum: "arbitrum",
  base: "base",
  polygon: "polygon",
  optimism: "optimism",
  bsc: "bsc",
  solana: "solana",
  avalanche: "avax",
};

/**
 * Format token identifier for DeFiLlama coins API.
 * Accepts either `{chain}:{address}` or `coingecko:{id}`.
 */
export function formatCoinId(
  chainOrType: Chain | "coingecko",
  addressOrId: string,
): string {
  if (chainOrType === "coingecko") return `coingecko:${addressOrId}`;
  return `${CHAIN_TO_DEFILLAMA[chainOrType]}:${addressOrId}`;
}

// ---------- Price types (from SDK) ----------

interface CoinPrice {
  price: number;
  symbol: string;
  timestamp: number;
  confidence: number;
  decimals?: number;
}

// ---------- Public API ----------

/**
 * Fetch current prices for tokens by chain:address or coingecko:id.
 * Primary price source — saves CoinGecko rate limit budget.
 */
export async function fetchPrices(
  coinIds: string[],
): Promise<Record<string, CoinPrice>> {
  const coinStr = coinIds.join(",");
  const cacheKey = `dl:prices:${coinStr}`;
  const cached = await getCached<Record<string, CoinPrice>>(cacheKey);
  if (cached) return cached;

  const data = await client.prices.getCurrentPrices(coinIds);
  const coins = (data as { coins: Record<string, CoinPrice> }).coins;

  await setCached(cacheKey, coins, CACHE_TTL.PRICE);
  return coins;
}

/**
 * Fetch price change percentage over a period.
 * Period examples: "1d", "7d", "30d".
 */
export async function fetchPriceChange(
  coinIds: string[],
  period = "1d",
): Promise<Record<string, number>> {
  const coinStr = coinIds.join(",");
  const cacheKey = `dl:pct:${period}:${coinStr}`;
  const cached = await getCached<Record<string, number>>(cacheKey);
  if (cached) return cached;

  const data = await client.prices.getPercentageChange(coinIds, { period });
  const coins = (data as { coins: Record<string, number> }).coins;

  await setCached(cacheKey, coins, CACHE_TTL.PRICE);
  return coins;
}

/**
 * Fetch all protocols with TVL data.
 * Used to build gecko_id → protocol name mapping.
 */
export async function fetchProtocols(): Promise<Protocol[]> {
  const cacheKey = "dl:protocols";
  const cached = await getCached<Protocol[]>(cacheKey);
  if (cached) return cached;

  const data = (await client.tvl.getProtocols()) as Protocol[];

  await setCached(cacheKey, data, CACHE_TTL.SUPPLY);
  return data;
}

interface Protocol {
  id: string;
  name: string;
  slug: string;
  symbol: string;
  gecko_id: string | null;
  tvl: number;
  chain: string;
  chains: string[];
  category: string;
  change_1d?: number | null;
  change_7d?: number | null;
  change_1m?: number | null;
}

/**
 * Find a protocol by its CoinGecko gecko_id.
 */
export async function findProtocolByGeckoId(
  geckoId: string,
): Promise<Protocol | null> {
  const protocols = await fetchProtocols();
  return protocols.find((p) => p.gecko_id === geckoId) ?? null;
}

/**
 * Fetch current TVL for a protocol.
 */
export async function fetchTvl(protocolSlug: string): Promise<number | null> {
  const cacheKey = `dl:tvl:${protocolSlug}`;
  const cached = await getCached<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const data = (await client.tvl.getTvl(protocolSlug)) as number;
    await setCached(cacheKey, data, CACHE_TTL.SUPPLY);
    return data;
  } catch {
    return null;
  }
}

interface ProtocolDetail {
  id: string;
  name: string;
  symbol: string;
  gecko_id: string | null;
  tvl: { date: number; totalLiquidityUSD: number }[];
  currentChainTvls: Record<string, number>;
  category: string;
}

/**
 * Fetch detailed protocol data including historical TVL.
 */
export async function fetchProtocolDetail(
  protocolSlug: string,
): Promise<ProtocolDetail | null> {
  const cacheKey = `dl:protocol:${protocolSlug}`;
  const cached = await getCached<ProtocolDetail>(cacheKey);
  if (cached) return cached;

  try {
    const data = (await client.tvl.getProtocol(
      protocolSlug,
    )) as ProtocolDetail;
    await setCached(cacheKey, data, CACHE_TTL.SUPPLY);
    return data;
  } catch {
    return null;
  }
}

interface FeeSummary {
  total24h?: number | null;
  total7d?: number | null;
  total30d?: number | null;
  total1y?: number | null;
  totalAllTime?: number | null;
  totalDataChart?: [number, number][];
  gecko_id?: string | null;
  category?: string;
}

/**
 * Fetch fee/revenue summary for a protocol.
 */
export async function fetchFees(
  protocolSlug: string,
): Promise<FeeSummary | null> {
  const cacheKey = `dl:fees:${protocolSlug}`;
  const cached = await getCached<FeeSummary>(cacheKey);
  if (cached) return cached;

  try {
    const data = (await client.fees.getSummary(protocolSlug, {
      dataType: "dailyRevenue",
    })) as FeeSummary;
    await setCached(cacheKey, data, CACHE_TTL.SUPPLY);
    return data;
  } catch {
    return null;
  }
}

/**
 * Build FundamentalsInfo for a token by looking up its protocol in DeFiLlama.
 * Enriches the TokenProfile with TVL and revenue data.
 */
export async function fetchFundamentals(
  geckoId: string,
): Promise<FundamentalsInfo | null> {
  const protocol = await findProtocolByGeckoId(geckoId);
  if (!protocol) return null;

  const slug = protocol.slug ?? protocol.name.toLowerCase().replace(/\s+/g, "-");
  const [detail, fees] = await Promise.all([
    fetchProtocolDetail(slug),
    fetchFees(slug),
  ]);

  const tvlHistory = detail?.tvl ?? [];
  const tvlTrend = inferTrend(
    tvlHistory.map((p) => p.totalLiquidityUSD),
    TREND_LOOKBACK_DAYS,
  );

  const revenueChart = fees?.totalDataChart ?? [];
  const revenueTrend = inferTrend(
    revenueChart.map((p) => p[1]),
    TREND_LOOKBACK_DAYS,
  );

  return {
    tvlUsd: protocol.tvl,
    tvlTrend,
    revenueUsd: fees?.total30d
      ? (fees.total30d / DAYS_IN_MONTH) * DAYS_IN_YEAR
      : undefined,
    revenueTrend,
  };
}

// ---------- Trend helpers ----------

function inferTrend(
  values: number[],
  lookback: number = TREND_LOOKBACK_DAYS,
): "growing" | "flat" | "shrinking" | undefined {
  if (values.length < 2) return undefined;

  const recent = values.slice(-lookback);
  if (recent.length < 2) return undefined;

  const first = recent[0];
  const last = recent[recent.length - 1];

  if (first === 0) return undefined;

  const change = (last - first) / Math.abs(first);

  if (change > TREND_GROWTH_THRESHOLD) return "growing";
  if (change < -TREND_GROWTH_THRESHOLD) return "shrinking";
  return "flat";
}
