import { getCached, setCached } from "../cache";
import { ApiName, getRateLimiter } from "../rate-limiter";
import {
  CACHE_TTL,
  Chain,
  SupplyInfo,
  SupplyType,
  TokenProfile,
} from "../types";

const BASE_URL = "https://api.coingecko.com/api/v3";
const VS_CURRENCY = "usd";
const limiter = getRateLimiter(ApiName.CoinGecko);

// ---------- Raw CoinGecko response types ----------

interface CoinGeckoMarketData {
  current_price: Record<string, number>;
  market_cap: Record<string, number>;
  fully_diluted_valuation: Record<string, number>;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  price_change_percentage_24h: number;
  ath: Record<string, number>;
  ath_date: Record<string, string>;
}

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  image?: { small?: string; thumb?: string };
  categories?: string[];
  asset_platform_id?: string;
  detail_platforms?: Record<string, { contract_address: string }>;
  market_data?: CoinGeckoMarketData;
}

interface CoinGeckoListItem {
  id: string;
  symbol: string;
  name: string;
  platforms?: Record<string, string>;
}

interface CoinGeckoSimplePrice {
  [id: string]: {
    usd: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
    usd_24h_change?: number;
  };
}

// ---------- Internal helpers ----------

async function fetchJSON<T>(url: string): Promise<T> {
  return limiter.execute(async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko ${response.status}: ${url}`);
    }
    return response.json() as Promise<T>;
  });
}

function inferSupplyType(
  _circulating: number,
  _total: number,
  max: number | null,
): SupplyType {
  // A defined max supply means the token has a hard cap (e.g., BTC 21M)
  if (max !== null && max > 0) return "fixed";
  // No max supply = potentially inflationary (e.g., ETH)
  return "inflationary";
}

/**
 * CoinGecko platform IDs mapped to our Chain type.
 * CoinGecko uses its own naming for blockchain platforms.
 */
const COINGECKO_PLATFORM_TO_CHAIN: Record<string, Chain> = {
  ethereum: "ethereum",
  "arbitrum-one": "arbitrum",
  base: "base",
  "polygon-pos": "polygon",
  "optimistic-ethereum": "optimism",
  "binance-smart-chain": "bsc",
  solana: "solana",
  "avalanche-c-chain": "avalanche",
};

const CHAIN_TO_COINGECKO_PLATFORM: Record<Chain, string> = {
  ethereum: "ethereum",
  arbitrum: "arbitrum-one",
  base: "base",
  polygon: "polygon-pos",
  optimism: "optimistic-ethereum",
  bsc: "binance-smart-chain",
  solana: "solana",
  avalanche: "avalanche-c-chain",
};

function mapChainFromPlatform(platformId: string): Chain | undefined {
  return COINGECKO_PLATFORM_TO_CHAIN[platformId];
}

// ---------- Public API ----------

/**
 * Fetch the full CoinGecko coin list for dictionary building.
 * Returns ~14K tokens with id, symbol, name, and platform addresses.
 */
export async function fetchCoinList(): Promise<CoinGeckoListItem[]> {
  const cacheKey = "cg:coin_list";
  const cached = await getCached<CoinGeckoListItem[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchJSON<CoinGeckoListItem[]>(
    `${BASE_URL}/coins/list?include_platform=true`,
  );

  await setCached(cacheKey, data, CACHE_TTL.DICTIONARY);
  return data;
}

/**
 * Fetch full token data by CoinGecko ID and map to TokenProfile.
 */
export async function fetchTokenById(id: string): Promise<TokenProfile> {
  const cacheKey = `cg:coin:${id}`;
  const cached = await getCached<TokenProfile>(cacheKey);
  if (cached) return cached;

  const coin = await fetchJSON<CoinGeckoCoin>(
    `${BASE_URL}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`,
  );

  const profile = mapCoinToProfile(coin);
  await setCached(cacheKey, profile, CACHE_TTL.SUPPLY);
  return profile;
}

/**
 * Resolve a contract address to a TokenProfile.
 * Used for Tier 2 detection (unknown addresses).
 */
export async function fetchTokenByContract(
  chain: Chain,
  contractAddress: string,
): Promise<TokenProfile | null> {
  const platformId = chainToPlatformId(chain);
  if (!platformId) return null;

  const cacheKey = `cg:contract:${chain}:${contractAddress}`;
  const cached = await getCached<TokenProfile>(cacheKey);
  if (cached) return cached;

  try {
    const coin = await fetchJSON<CoinGeckoCoin>(
      `${BASE_URL}/coins/${platformId}/contract/${contractAddress}`,
    );
    const profile = mapCoinToProfile(coin);
    await setCached(cacheKey, profile, CACHE_TTL.SUPPLY);
    return profile;
  } catch {
    return null;
  }
}

/**
 * Batch price lookup for multiple token IDs.
 * Lightweight — use when you only need price, not full profile.
 */
export async function fetchSimplePrices(
  ids: string[],
): Promise<CoinGeckoSimplePrice> {
  const idStr = ids.join(",");
  const cacheKey = `cg:prices:${idStr}`;
  const cached = await getCached<CoinGeckoSimplePrice>(cacheKey);
  if (cached) return cached;

  const data = await fetchJSON<CoinGeckoSimplePrice>(
    `${BASE_URL}/simple/price?ids=${idStr}&vs_currencies=${VS_CURRENCY}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
  );

  await setCached(cacheKey, data, CACHE_TTL.PRICE);
  return data;
}

// ---------- Mapping helpers ----------

function mapCoinToProfile(coin: CoinGeckoCoin): TokenProfile {
  const md = coin.market_data;
  const circulating = md?.circulating_supply ?? 0;
  const total = md?.total_supply ?? 0;
  const max = md?.max_supply ?? null;
  const marketCap = md?.current_price?.[VS_CURRENCY]
    ? md.current_price[VS_CURRENCY] * circulating
    : md?.market_cap?.[VS_CURRENCY] ?? 0;
  const fdv = md?.fully_diluted_valuation?.[VS_CURRENCY] ?? 0;

  const chains: Chain[] = [];
  if (coin.detail_platforms) {
    for (const platformId of Object.keys(coin.detail_platforms)) {
      const chain = mapChainFromPlatform(platformId);
      if (chain) chains.push(chain);
    }
  }

  const supply: SupplyInfo = {
    type: inferSupplyType(circulating, total, max),
    circulatingSupply: circulating,
    totalSupply: total,
    maxSupply: max ?? undefined,
    circulatingPercent: total > 0 ? (circulating / total) * 100 : 0,
    marketCap,
    fdv,
    fdvToMcapRatio: marketCap > 0 ? fdv / marketCap : 0,
    hasBurnMechanism: false, // not auto-detectable from CoinGecko
  };

  return {
    id: coin.id,
    coingeckoId: coin.id,
    name: coin.name,
    symbol: coin.symbol.toUpperCase(),
    logo: coin.image?.small,
    category: coin.categories?.[0],
    chains,
    price: md?.current_price?.[VS_CURRENCY] ?? 0,
    priceChange24h: md?.price_change_percentage_24h ?? 0,
    ath: md?.ath?.[VS_CURRENCY] ?? 0,
    athDate: md?.ath_date?.[VS_CURRENCY],
    supply,
    lastUpdated: Date.now(),
  };
}

function chainToPlatformId(chain: Chain): string | null {
  return CHAIN_TO_COINGECKO_PLATFORM[chain] ?? null;
}
