# Data Sources Exploration

This document maps out all data sources for Crypto X-Ray and their capabilities.

**Date**: 2026-03-29
**Status**: SPIKE-01 Discovery

---

## CoinGecko API

### Overview
- **Free Tier**: 10-50 calls/min
- **Paid Tier**: Up to 3,000+ calls/min (depending on plan)
- **Base URL**: `https://api.coingecko.com/api/v3`
- **Authentication**: Optional (no auth for free tier, API key for paid)
- **Pricing**: Free, Starter ($499/mo), Pro ($999/mo), Enterprise (custom)

### Endpoints Summary

| Category | Free | Paid | Purpose |
|----------|------|------|---------|
| Coins Data | 61 | 84 | Token metadata, prices, supply, market data |
| Markets | ✓ | ✓ | Market data with rankings, volume |
| Price | ✓ | ✓ | Simple price lookup by ID or address |
| Charts | ✓ | ✓ | Historical OHLC, volume data |
| Categories | ✓ | ✓ | Token categorization |
| Derivatives | ✓ | ✓ | Futures, swaps data |
| Companies | ✗ | ✓ | Company holdings (for BTC/ETH) |
| NFTs | Partial | ✓ | NFT data |

### Key Endpoints for Token Analysis

**GET /coins/{id}** (Free & Paid)
- Returns comprehensive token data
- **Available fields:**
  - `name`, `symbol`, `categories`
  - `market_data.current_price` (USD, other currencies)
  - `market_data.market_cap` (USD)
  - `market_data.fully_diluted_valuation` (FDV)
  - `market_data.circulating_supply`, `total_supply`, `max_supply`
  - `market_data.price_change_percentage_24h`
  - `market_data.ath`, `ath_date`
  - `market_data.atl`, `atl_date`
  - Rate limits: 1-2 req/sec (free), 10+ req/sec (paid)

**GET /simple/price** (Free & Paid)
- Lightweight price lookup
- **Params:** `ids`, `vs_currencies`, `include_market_cap=true`, `include_24hr_vol=true`
- **Response:** `{ [id]: { usd: number, usd_market_cap: number, usd_24h_vol: number } }`
- **Use case:** Quick price checks, minimal rate limit impact

**GET /coins/{id}/market_chart** (Free & Paid)
- Historical OHLC and volume data
- **Params:** `vs_currency`, `days`, `interval`
- **Response:** `{ prices: [[timestamp, price], ...], market_caps: [...], volumes: [...] }`
- **Rate limits:** 429 errors on free tier after ~3-5 requests due to rate limiting

**GET /coins/{id}/contract/{contract_address}** (Free & Paid)
- Token data by contract address (Ethereum, Polygon, etc.)
- Useful for **Tier 2 (Unknown Token) detection**
- Returns same fields as `/coins/{id}`

**GET /coins/list** (Free & Paid)
- Complete list of all tokens (ID map)
- Updated hourly
- **Use case:** Build local dictionary, ~14K tokens

### Paid-Only Endpoints

**GET /coins/{id}/circulating_supply_chart** (Paid only)
- Historical circulating supply progression
- Useful for understanding dilution over time

**GET /coins/{id}/total_supply_chart** (Paid only)
- Historical total supply progression
- Better than FDV ratio for long-term dilution analysis

**GET /coins/top_gainers_losers** (Paid only)
- Top gaining/losing tokens in time period
- Could be useful for hot tokens, but not critical

**GET /key** (Paid only)
- API key usage statistics
- For monitoring rate limits

### Rate Limits & Caching Strategy

| Data | Free Limit | Cache TTL | Recommended |
|------|-----------|-----------|-------------|
| Price (`/simple/price`) | 10-50/min | 5 min | Cache aggressively |
| Market data (`/coins/{id}`) | 10-50/min | 1 hour | Cache, prefetch top tokens |
| Historical charts | 10-50/min | 1 day | Cache all historical data |
| Token list | 10-50/min | 1 week | Build local dictionary |

### Data Fields Mapping

**From `/coins/{id}`**:
- ✓ Token name, symbol, logo
- ✓ Current price (USD)
- ✓ Market cap (USD)
- ✓ FDV (Fully Diluted Valuation)
- ✓ Circulating supply %, total supply, max supply
- ✓ Supply type (inferred from total vs max vs circulating)
- ✓ Price change 24h, 7d, 30d
- ✓ All-time high (ATH) with date
- ✓ Categories
- ✓ Market cap vs FDV ratio (dilution indicator)
- ✗ Unlock schedules (not available)
- ✗ Allocation breakdown (not available)

---

## Tokenomist.ai API

### Overview
- **Free Tier**: Limited endpoints
- **Paid Tier**: Full access to unlock schedules, allocation
- **Authentication**: API key required
- **Endpoint**: `https://api.tokenomist.ai/v1`

### Key Endpoints

**GET /tokens/{tokenAddress}** (Paid)
- Full token data including allocation, vesting, unlock schedule
- **Available fields:**
  - Token metadata
  - Allocation breakdown (team %, investors %, community %)
  - Team vesting status and unlock timeline
  - Next unlock event with amount and date

### Data Mapping

**From Tokenomist**:
- ✓ Allocation (team, investors, community, ecosystem, treasury)
- ✓ Vesting status for each group
- ✓ Next unlock event (date, amount, recipient, % of circulating)
- ✓ Unlock pressure estimate
- ✓ Supply increase 30d/90d projections
- ✗ Not available in free tier

---

## DeFiLlama API

### Overview
- **Free Tier**: TVL, prices, fees/revenue, DEX volumes, stablecoins, yields
- **Paid Tier ($300/mo)**: Emissions/unlocks, bridges, derivatives, DAT, equities, treasuries, hacks, raises
- **Base URLs**: `https://api.llama.fi`, `https://coins.llama.fi`, `https://stablecoins.llama.fi`, `https://yields.llama.fi`
- **Authentication**: None (free), API key (paid via `pro-api.llama.fi`)
- **Rate limits**: Very generous (~1000+/min free)

### Free Endpoints (no auth required)

#### TVL
| Endpoint | Purpose | Server |
|----------|---------|--------|
| `GET /protocols` | All protocols with TVL, symbol, category, chains, change_1d/7d | api.llama.fi |
| `GET /protocol/{protocol}` | Historical TVL + chain breakdowns + token breakdowns | api.llama.fi |
| `GET /tvl/{protocol}` | Simple current TVL number | api.llama.fi |
| `GET /v2/chains` | All chains with TVL, gecko_id, chainId | api.llama.fi |
| `GET /v2/historicalChainTvl` | Historical TVL across all chains | api.llama.fi |
| `GET /v2/historicalChainTvl/{chain}` | Historical TVL for one chain | api.llama.fi |

#### Prices (coins.llama.fi)
| Endpoint | Purpose | Key Detail |
|----------|---------|------------|
| `GET /prices/current/{coins}` | Current prices by `{chain}:{address}` or `coingecko:{id}` | Returns: price, symbol, decimals, confidence, timestamp |
| `GET /prices/historical/{timestamp}/{coins}` | Historical prices at a timestamp | Same response schema |
| `GET /batchHistorical` | Multiple tokens at multiple timestamps | Batch pricing |
| `GET /chart/{coins}` | Price chart at intervals (period, span, start/end) | Time-series data |
| `GET /percentage/{coins}` | Price change % over a period | Quick % change lookup |
| `GET /prices/first/{coins}` | Earliest known price record | Useful for TGE date estimation |
| `GET /block/{chain}/{timestamp}` | Closest block to a timestamp | Chain utility |

#### Fees & Revenue
| Endpoint | Purpose | Key Detail |
|----------|---------|------------|
| `GET /overview/fees` | All protocols with fees/revenue summaries | `dataType`: dailyFees, dailyRevenue, dailyHoldersRevenue |
| `GET /overview/fees/{chain}` | Fees by chain | Same schema filtered |
| `GET /summary/fees/{protocol}` | Per-protocol fee detail with historical chart | Returns: total24h, total7d, total30d, total1y, totalAllTime, gecko_id, category, totalDataChart |

#### DEX Volumes
| Endpoint | Purpose |
|----------|---------|
| `GET /overview/dexs` | All DEXs with volume summaries |
| `GET /overview/dexs/{chain}` | DEX volumes filtered by chain |
| `GET /summary/dexs/{protocol}` | Per-DEX volume with historical data |

#### Options
| Endpoint | Purpose |
|----------|---------|
| `GET /overview/options` | Options DEX volume overview |
| `GET /summary/options/{protocol}` | Per-options-DEX volume |

#### Open Interest
| Endpoint | Purpose |
|----------|---------|
| `GET /overview/open-interest` | All OI exchanges with summaries |

#### Stablecoins (stablecoins.llama.fi)
| Endpoint | Purpose |
|----------|---------|
| `GET /stablecoins` | All stablecoins with circulating, pegType, chains |
| `GET /stablecoin/{asset}` | Historical mcap + chain distribution |
| `GET /stablecoincharts/all` | Historical total stablecoin mcap |
| `GET /stablecoincharts/{chain}` | Historical stablecoin mcap per chain |
| `GET /stablecoinchains` | Current stablecoin mcap by chain |
| `GET /stablecoinprices` | Historical stablecoin prices |

#### Yields (yields.llama.fi)
| Endpoint | Purpose |
|----------|---------|
| `GET /pools` | All yield pools with APY, TVL, predictions |
| `GET /chart/{pool}` | Historical APY and TVL for a pool |

### Paid Endpoints ($300/mo — `pro-api.llama.fi`)

| Endpoint | Purpose | Relevance to Extension |
|----------|---------|----------------------|
| **`GET /api/emissions`** | **All tokens with unlock data: events, nextEvent, unlocksPerDay, circSupply, totalLocked** | **HIGH — replaces Tokenomist** |
| **`GET /api/emission/{protocol}`** | **Per-token: allocation (insiders/airdrop/farming %), unlock timeline, vesting categories** | **HIGH — replaces Tokenomist** |
| `GET /api/tokenProtocols/{symbol}` | Token usage across protocols | LOW |
| `GET /api/inflows/{protocol}/{timestamp}` | Protocol inflows/outflows | LOW |
| `GET /api/chainAssets` | Chain asset breakdowns | LOW |
| `GET /api/categories` | Category overview | LOW |
| `GET /api/hacks` | Hack dashboard | MEDIUM (red flags) |
| `GET /api/raises` | Fundraising rounds | LOW |
| `GET /api/treasuries` | Protocol treasury holdings | MEDIUM |
| `GET /stablecoins/stablecoindominance/{chain}` | Stablecoin dominance | LOW |
| `GET /yields/poolsBorrow` | Borrow costs | LOW |
| `GET /yields/perps` | Perp funding rates | LOW |
| `GET /yields/lsdRates` | LSD APY rates | LOW |
| `GET /bridges/*` | Bridge volumes and transactions | LOW |
| `GET /api/overview/derivatives` | Derivatives overview | LOW |
| `GET /dat/*` | Digital Asset Treasury (institutional) | LOW |
| `GET /equities/*` | Public company data | LOW |
| `GET /etfs/*` | ETF flows and AUM | LOW |

### Emission/Unlock Schema (Paid — $300/mo)

**`/api/emissions`** response per token:
```
token, name, gecko_id, protocolId
circSupply, circSupply30d, totalLocked, maxSupply, mcap
unlocksPerDay
nextEvent: { date, toUnlock }
events[]: { description, timestamp, noOfTokens[], category, unlockType (cliff/linear) }
```

**`/api/emission/{protocol}`** detailed response:
```
documentedData.data[]: { label, data[]: { timestamp, unlocked, rawEmission, burned } }
documentedData.tokenAllocation:
  current: { insiders %, noncirculating %, publicSale %, airdrop %, farming % }
  final: { same categories with final % }
  progress: { same categories with vesting progress % }
metadata: { token, sources[], total, chain, name, gecko_id, categories }
```

### Data Mapping

**From DeFiLlama Free Tier**:
- ✓ Protocol TVL (current + historical)
- ✓ TVL trend (from historical data)
- ✓ Fees (daily, 7d, 30d, 1y, all-time)
- ✓ Revenue (daily, via `dataType=dailyRevenue`)
- ✓ Revenue trend (from historical chart)
- ✓ Token price by contract address
- ✓ Price change % over any period
- ✓ Chain distribution
- ✓ DEX trading volumes
- ✓ Category (from /protocols)
- ✓ gecko_id linking (protocols → CoinGecko)
- ✗ Token allocation details (PAID)
- ✗ Unlock/vesting schedules (PAID)

### Matching Protocols to Tokens

Protocols have `gecko_id` field linking to CoinGecko:
- Protocol `aave` → gecko_id `aave`
- Protocol `uniswap` → gecko_id `uniswap`
- Not all protocols have tokens (many have `gecko_id: null`)

---

## Token Terminal API

### Overview
- **Free Tier**: Limited historical data
- **Paid Tier**: Full fundamentals (revenue, fees, active users, etc.)
- **Base URL**: `https://api.tokenterminal.com/v2`
- **Authentication**: API key required
- **Pricing**: Enterprise (custom)

### Key Endpoints

**GET /projects/{slug}/metrics** (Paid)
- Revenue, volume, active users, fees
- Time-series data for trends

**GET /projects/{slug}/fundamentals** (Paid)
- P/E ratio, PEG, other valuation metrics

### Data Mapping

**From Token Terminal**:
- ✓ Revenue (annual/monthly)
- ✓ Revenue trend
- ✓ Active users
- ✓ GitHub commits (development activity)
- ✓ Valuation ratios (P/E, P/S, etc.)
- ✗ Free tier has limited history

---

## Etherscan API (Tier 2: Unknown Token Detection)

### Overview
- **Free Tier**: 5 calls/second
- **Paid Tier**: Higher rate limits
- **Base URL**: `https://api.etherscan.io/api`
- **Authentication**: API key (free)
- **Coverage**: Ethereum mainnet only

### Key Endpoints

**GET token contract info**
- Verify contract source code
- Get token metadata (name, symbol, decimals)
- Get total supply, holder count

### Data Mapping

**From Etherscan**:
- ✓ Contract verification status
- ✓ Token name, symbol, decimals
- ✓ Total supply
- ✓ Holder count
- ✓ Contract creation date
- ✗ Supply breakdown (circulating vs locked)
- ✗ Vesting info

---

## Solscan API (Tier 2: Solana Tokens)

### Overview
- **Free Tier**: 100 requests/minute
- **Base URL**: `https://api.solscan.io`
- **Authentication**: API key recommended
- **Coverage**: Solana mainnet

### Key Endpoints

**GET /token/meta?token={address}**
- Token metadata

**GET /token/holders?token={address}**
- Top token holders

---

## Debank API (Tier 3: Wallet Portfolios)

### Overview
- **Free Tier**: Limited
- **Paid Tier**: Full wallet data
- **Base URL**: `https://openapi.debank.com`
- **Authentication**: API key
- **Coverage**: Multi-chain (Ethereum, Polygon, BSC, Arbitrum, Optimism, etc.)

### Key Endpoints

**GET /v1/user/portfolio_item_list**
- Wallet holdings with balances and USD values

**GET /v1/user/token_list**
- User's token holdings

**GET /v1/user/simple_token_list**
- Lightweight version of token list

### Data Mapping

**From Debank**:
- ✓ Wallet total value (USD)
- ✓ Token holdings (amount, value, percentage)
- ✓ Top holdings
- ✓ Recent transactions (send, receive, swap, approve)
- ✓ Labels (CEX, contract, bridge, etc.)
- ✓ Risk indicators

---

## Data Mapping Matrix

### TokenProfile Fields → Data Sources

```
IDENTITY
├── id (CoinGecko ID) ← CoinGecko /coins/list
├── coingeckoId ← CoinGecko
├── name ← CoinGecko /coins/{id}, Etherscan
├── symbol ← CoinGecko /coins/{id}, Etherscan
├── logo ← CoinGecko /coins/{id}
└── category ← CoinGecko /coins/{id}

PRICE & MARKET
├── price ← CoinGecko /simple/price
├── priceChange24h ← CoinGecko /coins/{id}
├── ath ← CoinGecko /coins/{id}
└── athDate ← CoinGecko /coins/{id}

SUPPLY INFO
├── type (fixed/inflationary/deflationary) ← Inferred from CoinGecko supply
├── circulatingSupply ← CoinGecko /coins/{id}
├── totalSupply ← CoinGecko /coins/{id}
├── maxSupply ← CoinGecko /coins/{id}
├── circulatingPercent ← Calculated (circulating/total)
├── marketCap ← CoinGecko /coins/{id}
├── fdv ← CoinGecko /coins/{id}
├── fdvToMcapRatio ← Calculated
└── hasBurnMechanism ← External research (not auto-detected)

UNLOCKS (Free — DeFiLlama frontend data)
├── nextUnlockDate ← DeFiLlama /unlocks/{token} (frontend)
├── nextUnlockAmount ← DeFiLlama /unlocks/{token} (frontend)
├── nextUnlockPercentOfCirculating ← Calculated
├── pressure ← Calculated (high/medium/low/critical)
└── supplyIncrease30d ← Calculated from emissions schedule

ALLOCATION (Free — DeFiLlama frontend data)
├── team % ← DeFiLlama /unlocks/{token} (frontend)
├── investors % ← DeFiLlama /unlocks/{token} (frontend)
├── community % ← DeFiLlama /unlocks/{token} (frontend)
└── teamVestingStatus ← Inferred from unlock schedule

FUNDAMENTALS (Free — DeFiLlama + CoinGecko)
├── revenueUsd ← DeFiLlama /overview/fees
├── revenueTrend ← DeFiLlama (historical fees data)
├── tvlUsd ← DeFiLlama /protocol/{name}
├── tvlTrend ← DeFiLlama (historical)
├── peRatio ← Calculated (market cap / revenue)
└── activeUsers ← Not available (nice-to-have, not critical)

SCORING
├── overall (1-5) ← Custom algorithm
├── supply (1-5) ← Supply metrics + FDV ratio
├── fundamentals (1-5) ← Revenue + TVL + users
└── redFlags ← Heuristics on unlocks, concentration
```

---

## API Conclusions

### Eliminated APIs
- **Tokenomist**: 100% paid. No free tier.
- **Token Terminal**: Enterprise pricing only. Revenue/fees covered by DeFiLlama free tier.

### Unlock/Allocation Data — No Free Source Exists

Both Tokenomist and DeFiLlama charge for emission/unlock data:
- **Tokenomist**: Custom pricing (est. $300-1000/mo)
- **DeFiLlama**: $300/mo (`/api/emissions`, `/api/emission/{protocol}`)

DeFiLlama is the better option if we eventually pay — richer schema with allocation breakdowns (insiders/airdrop/farming %), vesting progress, and historical unlock events. Single $300/mo covers ALL tokens vs per-token pricing.

**MVP Decision**: Ship without unlock data. Add as premium feature later via DeFiLlama paid tier.

### Viable Free APIs

| API | Role | Auth | Rate Limit | Cost |
|-----|------|------|------------|------|
| **CoinGecko** | Token identity, supply, market data, categories | Optional API key | 10-50/min | $0 |
| **DeFiLlama** | Prices, TVL, revenue, fees, DEX volumes | None | ~1000/min | $0 |
| **Etherscan** | Contract verification, token info (EVM) | Free API key | 5/sec | $0 |
| **Solscan** | Token metadata, holders (Solana) | API key recommended | 100/min | $0 |

### Smart Routing Strategy

Route calls to minimize CoinGecko rate limit pressure:

| Data Need | Primary Source | Fallback | Why |
|-----------|---------------|----------|-----|
| **Price (current)** | DeFiLlama `/prices/current/{chain}:{addr}` | CoinGecko `/simple/price` | DeFiLlama has no rate limit |
| **Price (historical)** | DeFiLlama `/chart/{coins}` | CoinGecko `/market_chart` | DeFiLlama: no limit, flexible periods |
| **Price change %** | DeFiLlama `/percentage/{coins}` | CoinGecko `/coins/{id}` | Lightweight single call |
| **Token identity** | CoinGecko `/coins/{id}` | — | Only source for name, logo, categories |
| **Supply data** | CoinGecko `/coins/{id}` | — | Only source for circulating/total/max |
| **Market cap + FDV** | CoinGecko `/coins/{id}` | — | Only source |
| **TVL** | DeFiLlama `/tvl/{protocol}` or `/protocol/{name}` | — | Authoritative source |
| **Revenue + fees** | DeFiLlama `/summary/fees/{protocol}` | — | Free, with historical chart |
| **DEX volume** | DeFiLlama `/summary/dexs/{protocol}` | — | Free |
| **Contract resolve** | CoinGecko `/coins/{id}/contract/{addr}` | DeFiLlama `/prices/current/{chain}:{addr}` | CoinGecko returns full token data |
| **Contract verify** | Etherscan API | Solscan (Solana) | Free tier |

### Exact Endpoints for Implementation

#### Phase 1 — Core Token Card (FREE)

```
CoinGecko:
  GET /coins/list                          → Build Tier 1 dictionary (id, symbol, name)
  GET /coins/{id}                          → Full token data (supply, market_data, categories)
  GET /coins/{id}/contract/{address}       → Tier 2: resolve contract → token
  GET /simple/price?ids=...&vs_currencies=usd  → Lightweight batch price check

DeFiLlama:
  GET coins.llama.fi/prices/current/{coins}  → Primary price source (save CoinGecko budget)
  GET coins.llama.fi/percentage/{coins}      → Price change % over custom periods
  GET coins.llama.fi/chart/{coins}           → Historical price chart
  GET api.llama.fi/protocols                 → Protocol list (match tokens to protocols via gecko_id)
  GET api.llama.fi/tvl/{protocol}            → Current TVL (simple number)
  GET api.llama.fi/protocol/{protocol}       → Historical TVL + chain breakdown
  GET api.llama.fi/summary/fees/{protocol}   → Fees + revenue with historical chart
  GET api.llama.fi/overview/fees?dataType=dailyRevenue  → Revenue rankings

Etherscan:
  GET /api?module=contract&action=getsourcecode  → Contract verification
  GET /api?module=token&action=tokeninfo         → Token metadata

Solscan:
  GET /token/meta?token={address}            → Solana token metadata
```

#### Phase 2 — Unlock & Allocation (PAID — $300/mo DeFiLlama)

```
DeFiLlama Pro:
  GET pro-api.llama.fi/api/emissions         → All tokens with unlock events + nextEvent
  GET pro-api.llama.fi/api/emission/{protocol} → Detailed allocation + vesting timeline
```

#### Phase 3 — Wallet Analysis

```
Debank:
  GET /v1/user/token_list                    → Wallet token holdings
  GET /v1/user/portfolio_item_list           → Full portfolio breakdown
```

### TokenCard Fields Coverage at $0/month

| Field | Source | Free? |
|-------|--------|-------|
| name, symbol, logo | CoinGecko `/coins/{id}` | ✓ |
| categories | CoinGecko `/coins/{id}` | ✓ |
| price (USD) | DeFiLlama `/prices/current` | ✓ |
| priceChange 24h/7d/30d | DeFiLlama `/percentage` | ✓ |
| marketCap | CoinGecko `/coins/{id}` | ✓ |
| FDV | CoinGecko `/coins/{id}` | ✓ |
| circulatingSupply / totalSupply / maxSupply | CoinGecko `/coins/{id}` | ✓ |
| circulatingPercent | Calculated | ✓ |
| fdvToMcapRatio | Calculated | ✓ |
| supplyType (fixed/inflationary) | Inferred from supply fields | ✓ |
| ATH + ATH date | CoinGecko `/coins/{id}` | ✓ |
| TVL | DeFiLlama `/tvl/{protocol}` | ✓ |
| TVL trend | DeFiLlama `/protocol/{protocol}` (historical) | ✓ |
| Revenue (USD) | DeFiLlama `/summary/fees/{protocol}?dataType=dailyRevenue` | ✓ |
| Revenue trend | DeFiLlama (totalDataChart) | ✓ |
| Fees | DeFiLlama `/summary/fees/{protocol}` | ✓ |
| P/E ratio | Calculated (marketCap / annualized revenue) | ✓ |
| DEX volume | DeFiLlama `/summary/dexs/{protocol}` | ✓ |
| **Unlock schedule** | **DeFiLlama `/api/emission/{protocol}`** | **✗ ($300/mo)** |
| **Allocation breakdown** | **DeFiLlama `/api/emission/{protocol}`** | **✗ ($300/mo)** |
| **Next unlock event** | **DeFiLlama `/api/emissions`** | **✗ ($300/mo)** |
| Active users | Not available from any free source | ✗ |

**Coverage: ~80% of TokenCard fields at $0/month. Unlock/allocation is the 20% gap.**

---

## Implementation Priority

**Phase 1 (MVP — Core Token Cards, $0/mo)**
1. CoinGecko `/coins/list` → build Tier 1 dictionary (top 500)
2. DeFiLlama `coins.llama.fi/prices/current/{coins}` → primary price lookups
3. CoinGecko `/coins/{id}` → full token data (supply, market cap, FDV, categories)
4. DeFiLlama `/protocols` → protocol list with gecko_id mapping
5. DeFiLlama `/summary/fees/{protocol}?dataType=dailyRevenue` → revenue data
6. DeFiLlama `/tvl/{protocol}` → TVL data
7. Etherscan free API → Tier 2 contract verification
8. **Coverage**: ~80% of TokenCard fields, 95% of common tokens

**Phase 2 (Unlock & Allocation, $300/mo DeFiLlama Pro)**
1. DeFiLlama `/api/emissions` → token unlock list + next events
2. DeFiLlama `/api/emission/{protocol}` → allocation breakdown + vesting timeline
3. Integrate into supply scoring engine
4. **Coverage**: ~95% of TokenCard fields

**Phase 3 (Wallet Analysis)**
1. Debank free tier for wallet portfolio data
2. Etherscan/Solscan for transaction history
3. Advanced risk scoring + red flag detection

---

## Rate Limit Handling

### Strategy
1. **Implement request queueing** to stay under limits
2. **Cache aggressively** with TTL-based invalidation
3. **Use `/simple/price`** instead of `/coins/{id}` when possible (lower overhead)
4. **Batch requests** where available
5. **Implement exponential backoff** for 429 errors

### Caching Priorities

| Endpoint | Free Tier | TTL | Priority |
|----------|-----------|-----|----------|
| `/simple/price` | 10-50/min | 5 min | HIGH |
| `/coins/{id}` | 10-50/min | 1 hour | HIGH |
| `/coins/list` | 10-50/min | 1 week | MEDIUM |
| `/coins/{id}/market_chart` | 10-50/min | 1 day | MEDIUM |
| Etherscan contract | 5/sec | 24 hours | HIGH |

---

## Next Steps

1. ✓ Document all data sources
2. ✓ Analyze free vs paid tiers — eliminated Tokenomist & Token Terminal
3. ✓ Define smart routing strategy (DeFiLlama for prices/fundamentals, CoinGecko for identity/supply)
4. ✓ Verified DeFiLlama emissions API is paid ($300/mo) — no free unlock data source exists
5. ✓ Mapped exact endpoints for each implementation phase
6. Create API client implementations (Phase 1: CoinGecko + DeFiLlama free)
7. Implement caching layer with TTL-based invalidation
8. Create scoring algorithms (supply score from CoinGecko, fundamentals from DeFiLlama)
9. TODO: When extension has users, add DeFiLlama Pro ($300/mo) for unlock/allocation data
10. Integrate Debank for wallet analysis (Phase 3)
