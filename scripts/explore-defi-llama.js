/**
 * DeFiLlama API Exploration
 * Free tier - no authentication required
 * Rate limits: Very generous (1000+/min)
 */

const DEFI_LLAMA_API = "https://api.llama.fi";

async function fetchData(endpoint) {
  try {
    const response = await fetch(`${DEFI_LLAMA_API}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error.message);
    return null;
  }
}

async function exploreDefiLlama() {
  console.log("📊 DeFiLlama API Exploration\n");

  // Get all protocols
  console.log("🔍 Fetching /protocols...");
  const protocols = await fetchData("/protocols");

  if (!protocols) {
    console.log("Failed to fetch protocols");
    return;
  }

  console.log(`✓ Found ${protocols.length} protocols\n`);

  // Find our test tokens' protocols
  const testProtocols = [
    "ethereum",
    "solana",
    "arbitrum",
    "optimism",
    "dogecoin",
  ];

  const foundProtocols = {};

  for (const testProto of testProtocols) {
    const proto = protocols.find(
      (p) => p.name.toLowerCase() === testProto.toLowerCase()
    );
    if (proto) {
      foundProtocols[testProto] = proto;
      console.log(`\n📍 ${testProto.toUpperCase()}`);
      console.log(`  Chain: ${proto.chain}`);
      console.log(`  TVL: $${(proto.tvl || 0).toLocaleString()}`);
      console.log(`  Token: ${proto.symbol || "N/A"}`);
      console.log(
        `  Category: ${proto.category || "N/A"}`
      );
      console.log(`  URL: ${proto.url || "N/A"}`);
    }
  }

  // Check for detailed protocol info endpoint
  if (foundProtocols.ethereum) {
    console.log("\n🔍 Fetching detailed protocol data for Ethereum...");
    const etherDetail = await fetchData("/protocol/ethereum");
    if (etherDetail) {
      console.log(`  ✓ TVL History: ${etherDetail.tvl?.length || 0} data points`);
      console.log(
        `  ✓ Revenue: ${etherDetail.revenue ? "Available" : "Not available"}`
      );
      console.log(`  ✓ Fees: ${etherDetail.fees ? "Available" : "Not available"}`);
      console.log(
        `  ✓ Staking: ${etherDetail.staking ? "Available" : "Not available"}`
      );
    }
  }

  console.log("\n\n📋 Available Data from DeFiLlama\n");
  console.log("Core Protocol Data:");
  console.log("  ✓ Protocol name, symbol");
  console.log("  ✓ TVL (Total Value Locked) - current");
  console.log("  ✓ TVL history - time series");
  console.log("  ✓ Revenue (if available)");
  console.log("  ✓ Fees (if available)");
  console.log("  ✓ Chain information");
  console.log("  ✓ Category (DEX, Lending, Staking, etc)");

  console.log("\nKey Features:");
  console.log("  ✓ NO authentication required");
  console.log("  ✓ NO rate limits (very generous)");
  console.log("  ✓ COMPLETELY FREE");
  console.log("  ✓ NO paid tier");

  console.log("\nLimitations:");
  console.log("  ✗ Only protocol data (not all tokens)");
  console.log("  ✗ No historical supply data");
  console.log("  ✗ No allocation data");
  console.log("  ✗ Limited to protocols with TVL");

  return {
    foundProtocols,
    total: protocols.length,
    features: [
      "No auth required",
      "Free tier",
      "Good for protocol fundamentals",
    ],
  };
}

exploreDef iLlama().catch(console.error);
