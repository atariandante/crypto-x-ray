/**
 * CoinGecko API Exploration Script
 * Fetches and analyzes OpenAPI specs for free and paid tiers
 * Compares endpoints, fields, and rate limits
 */

interface OpenAPISpec {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
}

async function fetchOpenAPISpec(url: string): Promise<OpenAPISpec | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
}

function extractEndpoints(spec: OpenAPISpec): Record<string, any[]> {
  const endpoints: Record<string, any[]> = {};

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const method of Object.keys(methods).filter((m) =>
      ["get", "post", "put", "delete"].includes(m)
    )) {
      const operation = methods[method];
      const key = `${method.toUpperCase()} ${path}`;

      endpoints[key] = {
        method,
        path,
        summary: operation.summary,
        description: operation.description,
        parameters: operation.parameters || [],
        responses: Object.keys(operation.responses || {}),
        rateLimit: operation["x-rate-limit"]?.limit,
      };
    }
  }

  return endpoints;
}

async function compareAPIs() {
  console.log("🔍 Fetching CoinGecko API OpenAPI specs...\n");

  const specs = {
    "Free (Demo)": {
      general: await fetchOpenAPISpec(
        "https://raw.githubusercontent.com/coingecko/coingecko-api-oas/refs/heads/main/coingecko-demo.json"
      ),
      onchain: await fetchOpenAPISpec(
        "https://raw.githubusercontent.com/coingecko/coingecko-api-oas/refs/heads/main/onchain-demo.json"
      ),
    },
    "Paid (Pro)": {
      general: await fetchOpenAPISpec(
        "https://raw.githubusercontent.com/coingecko/coingecko-api-oas/refs/heads/main/coingecko-pro.json"
      ),
      onchain: await fetchOpenAPISpec(
        "https://raw.githubusercontent.com/coingecko/coingecko-api-oas/refs/heads/main/onchain-pro.json"
      ),
    },
  };

  // Extract endpoints for both tiers
  const freeEndpoints = new Set<string>();
  const paidEndpoints = new Set<string>();
  const endpointDetails: Record<string, any> = {};

  if (specs["Free (Demo)"].general) {
    const free = extractEndpoints(specs["Free (Demo)"].general);
    for (const endpoint of Object.keys(free)) {
      freeEndpoints.add(endpoint);
      endpointDetails[endpoint] = { ...free[endpoint], tier: "free" };
    }
  }

  if (specs["Free (Demo)"].onchain) {
    const freeOnchain = extractEndpoints(specs["Free (Demo)"].onchain);
    for (const endpoint of Object.keys(freeOnchain)) {
      freeEndpoints.add(endpoint);
      endpointDetails[endpoint] = {
        ...freeOnchain[endpoint],
        tier: "free",
        category: "onchain",
      };
    }
  }

  if (specs["Paid (Pro)"].general) {
    const paid = extractEndpoints(specs["Paid (Pro)"].general);
    for (const endpoint of Object.keys(paid)) {
      paidEndpoints.add(endpoint);
      if (endpointDetails[endpoint]) {
        endpointDetails[endpoint].paidAvailable = true;
      } else {
        endpointDetails[endpoint] = { ...paid[endpoint], tier: "paid" };
      }
    }
  }

  if (specs["Paid (Pro)"].onchain) {
    const paidOnchain = extractEndpoints(specs["Paid (Pro)"].onchain);
    for (const endpoint of Object.keys(paidOnchain)) {
      paidEndpoints.add(endpoint);
      if (endpointDetails[endpoint]) {
        endpointDetails[endpoint].paidAvailable = true;
      } else {
        endpointDetails[endpoint] = {
          ...paidOnchain[endpoint],
          tier: "paid",
          category: "onchain",
        };
      }
    }
  }

  // Output summary
  console.log("📊 CoinGecko API Tier Comparison\n");
  console.log(`Free endpoints: ${freeEndpoints.size}`);
  console.log(`Paid endpoints: ${paidEndpoints.size}`);
  console.log(
    `Exclusive to Paid: ${paidEndpoints.size - freeEndpoints.size}\n`
  );

  // List exclusive endpoints
  const exclusiveToPaid = Array.from(paidEndpoints).filter(
    (e) => !freeEndpoints.has(e)
  );
  if (exclusiveToPaid.length > 0) {
    console.log("🔐 Paid-Only Endpoints:");
    exclusiveToPaid.slice(0, 10).forEach((endpoint) => {
      const detail = endpointDetails[endpoint];
      console.log(`  ${endpoint}`);
      if (detail.summary) console.log(`    → ${detail.summary}`);
    });
    if (exclusiveToPaid.length > 10) {
      console.log(`  ... and ${exclusiveToPaid.length - 10} more`);
    }
  }

  // Key endpoints for token analysis
  console.log("\n🎯 Key Endpoints for Token Analysis:");
  const keyEndpoints = Object.entries(endpointDetails).filter(
    ([path]) =>
      path.includes("/coins/") ||
      path.includes("/simple/") ||
      path.includes("/market")
  );

  for (const [endpoint, detail] of keyEndpoints.slice(0, 15)) {
    const tier = detail.paidAvailable ? "free & paid" : detail.tier;
    console.log(`  [${tier}] ${endpoint}`);
    if (detail.summary) console.log(`    → ${detail.summary}`);
  }

  return {
    freeCount: freeEndpoints.size,
    paidCount: paidEndpoints.size,
    exclusivePaid: exclusiveToPaid.length,
    specs,
    endpointDetails,
  };
}

// Run if executed directly
compareAPIs().then((result) => {
  console.log("\n✅ Analysis complete. Check console output above.");
});

export { compareAPIs };
