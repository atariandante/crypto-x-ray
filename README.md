# Crypto X-Ray — Token Intelligence Companion

A Chrome extension that detects crypto token mentions and addresses on any webpage and displays a compact analysis card with tokenomics, fundamentals, and supply dynamics.

Think Grammarly, but for crypto due diligence.

## What It Does

When you browse Twitter/X, CoinGecko, Medium, Reddit, Discord web, or any site, Crypto X-Ray:

- **Detects token mentions** ($SOL, "Ethereum", etc.) and highlights them
- **Detects contract addresses** (EVM 0x..., Solana base58) — even brand new tokens not listed anywhere
- **Detects wallet addresses** — hover to see portfolio breakdown, top holdings, recent activity
- **Shows an analysis card** on hover/click with:
  - Market cap vs FDV (dilution risk)
  - Supply type (fixed/inflationary/deflationary)
  - Circulating supply percentage
  - Next unlock event and pressure score
  - Allocation breakdown (team/investors/community)
  - Tokenomics health score (1-5)
  - Red flags detection
  - TGE analysis for newly launched tokens

## Detection Tiers

| Tier | What | How | Speed |
|------|-------|-----|-------|
| 1 | Known tokens ($SOL, "Arbitrum") | Local dictionary (top 500 by mcap) | Instant |
| 2 | Unknown token addresses | On-chain lookup via Etherscan/Solscan | On hover |
| 3 | Wallet addresses | Portfolio lookup via Debank/Etherscan | On hover |

## Data Sources

| API | Role | Cost | Status |
|-----|------|------|--------|
| **CoinGecko** | Token identity, supply, market cap, FDV, categories | Free (10-50 req/min) | Implemented |
| **DeFiLlama** | Prices, TVL, revenue, fees, DEX volumes | Free (~1000 req/min) | Implemented |
| **DeFiLlama Pro** | Unlock schedules, allocation breakdowns, vesting | $300/mo | Future (premium tier) |
| **Etherscan** | Contract verification, token info (EVM chains) | Free (5 req/sec) | Planned |
| **Solscan** | Token metadata, holders (Solana) | Free (100 req/min) | Planned |
| **Debank** | Wallet portfolio breakdown | Free/Paid | Planned |

### Smart Routing Strategy

Prices are routed through DeFiLlama (generous rate limits) to preserve CoinGecko budget for identity/supply data (only source). See [`docs/data-sources.md`](docs/data-sources.md) for full endpoint mapping.

### Eliminated APIs

- **Tokenomist** — 100% paid, no free tier. Replaced by DeFiLlama Pro for unlock/allocation data.
- **Token Terminal** — Enterprise pricing only. Revenue/fees covered by DeFiLlama free tier.

## Tech Stack

- **TypeScript** + **React 18** for UI
- **Vite** + **@crxjs/vite-plugin** for extension bundling
- **Tailwind CSS** for styling
- **Chrome Extension Manifest V3**
- **Shadow DOM** for style isolation on host pages
- **@defillama/api** SDK for DeFiLlama integration
- **Vitest** for unit and integration testing

## Project Structure

```
src/
├── background/          # Service worker (API calls, caching, rate limiting)
├── content/             # Content script (token detection, DOM scanning)
│   ├── detector.ts      # Token/address detection engine
│   ├── chain-detector.ts # Chain inference heuristics
│   └── overlay.ts       # Floating card overlay management
├── card/                # Analysis card React component
│   ├── TokenCard.tsx     # Card for known tokens
│   ├── WalletCard.tsx    # Card for wallet addresses
│   └── UnknownTokenCard.tsx # Card for unindexed tokens
├── popup/               # Extension popup (manual search)
├── options/             # Settings page
├── shared/
│   ├── api/             # API clients (CoinGecko, DeFiLlama)
│   │   ├── coingecko.ts # Token identity, supply, market data
│   │   └── defi-llama.ts # Prices, TVL, revenue, fees (uses @defillama/api SDK)
│   ├── scoring/         # Tokenomics health scoring engine
│   ├── resolver.ts      # Maps detected text → token/wallet identity
│   ├── dictionary.ts    # Top 500 token dictionary + mapping
│   ├── types.ts         # Shared TypeScript interfaces
│   ├── cache.ts         # chrome.storage.local caching with TTLs
│   └── rate-limiter.ts  # Per-API rate limiting with queue and backoff
docs/
public/                  # Extension icons and assets
```

## Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build for production
npm run build

# Run unit tests
npm test

# Run integration tests (hits live APIs — requires internet)
npx vitest run src/shared/api/coingecko.integration.test.ts
npx vitest run src/shared/api/defi-llama.integration.test.ts

# Lint
npm run lint
```

### Test Structure

Tests are colocated with their source files:

```
src/shared/cache.ts              → src/shared/cache.test.ts
src/shared/rate-limiter.ts       → src/shared/rate-limiter.test.ts
src/shared/api/coingecko.ts      → src/shared/api/coingecko.test.ts
                                   src/shared/api/coingecko.integration.test.ts
src/shared/api/defi-llama.ts     → src/shared/api/defi-llama.test.ts
                                   src/shared/api/defi-llama.integration.test.ts
```

- **Unit tests** (`*.test.ts`) — mock all external dependencies, run fast
- **Integration tests** (`*.integration.test.ts`) — hit real APIs, verify response parsing and type mapping

## Loading the Extension

1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` folder

## Milestones

### Milestone 1 — Chrome Extension (current)
Detect tokens on web pages, show analysis cards inline.

### Milestone 2 — Desktop App (future)
Grammarly-style overlay that works in native apps (Telegram Desktop, WhatsApp, Slack) using Tauri + OS accessibility APIs.

## License

MIT
