/**
 * Sample CoinGecko Data Fetcher
 * Fetches real data from key endpoints for test tokens: ETH, SOL, ARB, OP, DOGE
 */

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const TEST_TOKENS = {
  ethereum: "ethereum",
  solana: "solana",
  arbitrum: "arbitrum",
  optimism: "optimism",
  dogecoin: "dogecoin",
};

async function fetchData(endpoint) {
  try {
    const response = await fetch(`${COINGECKO_API}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error.message);
    return null;
  }
}

async function exploreCoinGecko() {
  console.log("📊 Fetching CoinGecko sample data for test tokens\n");

  const results = {};

  for (const [symbol, id] of Object.entries(TEST_TOKENS)) {
    console.log(`\n🔍 ${symbol.toUpperCase()} (${id})`);
    results[symbol] = {};

    // Endpoint 1: /coins/{id}
    console.log("  Fetching /coins/{id}...");
    const coinData = await fetchData(
      `/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false`
    );
    if (coinData) {
      results[symbol].coin = {
        name: coinData.name,
        symbol: coinData.symbol,
        category: coinData.categories,
        marketCap: coinData.market_data?.market_cap?.usd,
        fdv: coinData.market_data?.fully_diluted_valuation?.usd,
        circulatingSupply: coinData.market_data?.circulating_supply,
        totalSupply: coinData.market_data?.total_supply,
        maxSupply: coinData.market_data?.max_supply,
        currentPrice: coinData.market_data?.current_price?.usd,
        priceChange24h: coinData.market_data?.price_change_percentage_24h,
        ath: coinData.market_data?.ath?.usd,
        athDate: coinData.market_data?.ath_date?.usd,
      };
      console.log(
        `    ✓ Got market data: mcap $${(coinData.market_data?.market_cap?.usd || 0).toLocaleString()}`
      );
    }

    // Endpoint 2: /simple/price
    console.log("  Fetching /simple/price...");
    const priceData = await fetchData(
      `/simple/price?ids=${id}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`
    );
    if (priceData) {
      results[symbol].price = priceData[id];
      console.log(
        `    ✓ Got price: $${priceData[id]?.usd || "N/A"}, mcap $${(priceData[id]?.usd_market_cap || 0).toLocaleString()}`
      );
    }

    // Endpoint 3: /coins/{id}/market_chart (last 30 days)
    console.log("  Fetching /coins/{id}/market_chart...");
    const chartData = await fetchData(
      `/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`
    );
    if (chartData) {
      results[symbol].chart = {
        prices: chartData.prices?.length,
        marketCaps: chartData.market_caps?.length,
        volumes: chartData.volumes?.length,
      };
      console.log(`    ✓ Got ${chartData.prices?.length || 0} price points`);
    }
  }

  // Document field availability
  console.log("\n\n📋 Available Fields from /coins/{id}\n");
  const sampleCoin = results.ethereum.coin;
  if (sampleCoin) {
    console.log("Market Data Fields:");
    Object.keys(sampleCoin)
      .filter((k) => sampleCoin[k] !== undefined)
      .forEach((field) => {
        console.log(`  ✓ ${field}: ${typeof sampleCoin[field]}`);
      });
  }

  return results;
}

// Run
exploreCoinGecko().catch(console.error);
