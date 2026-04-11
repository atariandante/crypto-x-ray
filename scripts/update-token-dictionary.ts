import { writeFile } from "node:fs/promises";

const MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false";

interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
}

interface TokenDictionaryEntry {
  coingeckoId: string;
  name: string;
  symbol: string;
  marketCapRank: number;
}

function renderDataFile(entries: TokenDictionaryEntry[]): string {
  const data = JSON.stringify(entries, null, 2);
  return `import type { TokenDictionaryEntry } from "./types";

export const TOKEN_DICTIONARY_DATA: TokenDictionaryEntry[] = ${data};
`;
}

async function fetchTopTokens(): Promise<TokenDictionaryEntry[]> {
  const response = await fetch(MARKETS_URL);
  if (!response.ok) {
    throw new Error(`CoinGecko ${response.status}: ${MARKETS_URL}`);
  }

  const coins = (await response.json()) as CoinGeckoMarketCoin[];

  return coins
    .filter((coin) => coin.market_cap_rank !== null)
    .map((coin) => ({
      coingeckoId: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      marketCapRank: coin.market_cap_rank as number,
    }))
    .sort((a, b) => a.marketCapRank - b.marketCapRank);
}

async function main() {
  const tokens = await fetchTopTokens();
  if (tokens.length < 100) {
    throw new Error(`Expected 100 tokens, received ${tokens.length}`);
  }

  await writeFile(
    new URL("../src/shared/token-dictionary/data.ts", import.meta.url),
    renderDataFile(tokens),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
