<p align="center">
  <img src="public/icons/icon_128.png" alt="Crypto X-Ray" width="96" />
</p>

<h1 align="center">Crypto X-Ray</h1>

<p align="center">
  <strong>Token intelligence at the point of discovery.</strong><br />
  A Chrome extension that detects crypto tokens on any webpage and delivers instant tokenomics analysis — without leaving the page.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/typescript-5.5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/vite-5-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

## The Problem

You see a token mentioned on Twitter, Reddit, or a blog post. To evaluate it, you open CoinGecko, DeFiLlama, Etherscan, and a token unlock tracker in separate tabs. By the time you've checked supply dynamics and dilution risk, you've lost the thread.

**Crypto X-Ray eliminates that workflow.** Hover over any token mention or contract address and get a full analysis card inline — market cap, FDV, supply breakdown, unlock schedule, health score, and red flags. Think **Grammarly, but for crypto due diligence**.

---

## ✨ Features

- **🔍 Smart Detection** — Recognizes `$SOL`, "Ethereum", EVM addresses (`0x…`), Solana base58 addresses, and wallet addresses
- **📊 Analysis Cards** — Inline overlays with market cap vs FDV, supply type, circulating %, allocation breakdown, and health scores
- **🚨 Red Flag Alerts** — Automatic detection of high dilution risk, concentrated allocations, and suspicious unlock patterns
- **⛓️ Multi-Chain** — Ethereum, Arbitrum, Base, Polygon, Optimism, BSC, Solana, and Avalanche
- **🧠 TGE Analysis** — Evaluates newly launched tokens with unlock-day sell pressure and comparable benchmarks
- **💼 Wallet Insights** — Hover on any wallet address to see portfolio breakdown and recent activity
- **⚡ Instant & Cached** — TTL-based caching keeps the extension fast on repeat visits

---

## Detection Tiers

| Tier | Detects | Method | Speed |
|------|---------|--------|-------|
| **1** | Known tokens (`$SOL`, `"Arbitrum"`) | Local dictionary — top 500 by market cap | Instant |
| **2** | Unknown contract addresses | On-chain lookup via Etherscan / Solscan | On hover |
| **3** | Wallet addresses | Portfolio lookup via Debank / Etherscan | On hover |

---

## Data Sources

| API | Role | Rate Limit | Status |
|-----|------|------------|--------|
| [CoinGecko](https://www.coingecko.com/) | Token identity, supply, market cap, FDV, categories | Free: 10–50 req/min | ✅ Implemented |
| [DeFiLlama](https://defillama.com/) | Prices, TVL, revenue, fees, DEX volumes | Free: ~1000 req/min | ✅ Implemented |
| [DeFiLlama Pro](https://defillama.com/) | Unlock schedules, allocation breakdowns, vesting | $300/mo | 🔜 Premium tier |
| [Etherscan](https://etherscan.io/) | Contract verification, token info (EVM chains) | Free: 5 req/sec | 🔜 Planned |
| [Solscan](https://solscan.io/) | Token metadata, holders (Solana) | Free: 100 req/min | 🔜 Planned |
| [Debank](https://debank.com/) | Wallet portfolio breakdown | Free/Paid | 🔜 Planned |

> **Smart Routing:** Prices route through DeFiLlama (generous limits) to preserve CoinGecko quota for identity/supply data. See [`docs/data-sources.md`](docs/data-sources.md) for the full endpoint mapping.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.5 (strict mode) |
| UI | React 18 |
| Styling | Tailwind CSS 3.4 |
| Build | Vite 5 + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/) |
| Extension | Chrome Manifest V3 |
| Style Isolation | Shadow DOM |
| Testing | Vitest |
| Linting | ESLint + Prettier |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Web Page (any site)                    │
│                                                          │
│  Content Script                                          │
│  ┌────────────┐   ┌────────────┐   ┌─────────────────┐  │
│  │ Text       │──▶│ Detector   │──▶│ DOM Highlighter │  │
│  │ Scanner    │   │ + Resolver │   │ (Shadow DOM)    │  │
│  └────────────┘   └─────┬──────┘   └─────────────────┘  │
│                         │                                │
└─────────────────────────┼────────────────────────────────┘
                          │ chrome.runtime.sendMessage()
┌─────────────────────────┼────────────────────────────────┐
│  Background Service Worker                               │
│  ┌──────────┐   ┌───────┴──────┐   ┌─────────────────┐  │
│  │ Rate     │──▶│ API Clients  │──▶│ Cache           │  │
│  │ Limiter  │   │ CoinGecko    │   │ chrome.storage  │  │
│  │          │   │ DeFiLlama    │   │ TTL-based       │  │
│  └──────────┘   └──────────────┘   └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Card Types

| Card | Description |
|------|-------------|
| `TokenCard` | Full analysis for indexed tokens — price, supply, FDV, unlocks, allocation, health score |
| `UnknownTokenCard` | Basic analysis for unindexed contract addresses discovered on-chain |
| `WalletCard` | Portfolio snapshot and recent transactions for wallet addresses |

---

## Project Structure

```
src/
├── background/             # Service worker — API calls, caching, rate limiting
├── content/                # Content script — DOM scanning, detection, highlighting
│   ├── text-scanner.ts     # TreeWalker + MutationObserver for live scanning
│   ├── highlighter.ts      # Shadow DOM token highlights
│   ├── detector.ts         # Token / address pattern matching
│   └── chain-detector.ts   # Chain inference from page context
├── card/                   # React analysis card components
│   ├── TokenCard.tsx
│   ├── UnknownTokenCard.tsx
│   └── WalletCard.tsx
├── popup/                  # Extension popup — manual token search
├── options/                # Settings page
└── shared/
    ├── api/                # API clients (CoinGecko, DeFiLlama, …)
    ├── scoring/            # Tokenomics health scoring engine
    ├── resolver.ts         # Detection → token/wallet identity resolution
    ├── dictionary.ts       # Top 500 token dictionary
    ├── cache.ts            # chrome.storage caching with TTLs
    ├── rate-limiter.ts     # Per-API rate limiting with queue + backoff
    └── types.ts            # Shared TypeScript interfaces
docs/
├── data-sources.md         # Full API endpoint mapping & routing strategy
└── product-strategy.md     # Tier structure & revenue model
public/
└── icons/                  # Extension icons (16–128px)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A Chromium-based browser (Chrome, Brave, Edge, Arc)

### Installation

```bash
# Clone the repository
git clone https://github.com/atariandante/crypto-x-ray.git
cd crypto-x-ray

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys (CoinGecko free tier works out of the box)
```

### Development

```bash
# Build in watch mode (rebuilds on every file change)
npm run dev

# Production build
npm run build

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests (hits live APIs — requires internet)
npx vitest run src/shared/api/coingecko.integration.test.ts
npx vitest run src/shared/api/defi-llama.integration.test.ts

# Lint
npm run lint

# Format
npm run format
```

### Load the Extension

1. Run `npm run build` (or `npm run dev` for watch mode)
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `dist/` folder

---

## Environment Variables

Copy `.env.example` to `.env` and add your keys. Only CoinGecko is required for basic functionality — the rest unlock additional detection tiers.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_COINGECKO_API_KEY` | Recommended | CoinGecko API key (free tier works) |
| `VITE_ETHERSCAN_API_KEY` | Optional | Etherscan for EVM contract lookups |
| `VITE_SOLSCAN_API_KEY` | Optional | Solscan Pro for Solana token data |
| `VITE_HELIUS_API_KEY` | Optional | Helius for Solana RPC + DAS API |
| `VITE_DEBANK_API_KEY` | Optional | Debank for wallet portfolio data |
| `VITE_BASESCAN_API_KEY` | Optional | Basescan for Base chain lookups |
| `VITE_ARBISCAN_API_KEY` | Optional | Arbiscan for Arbitrum chain lookups |

---

## Testing

Tests are **colocated** with their source files:

```
src/shared/cache.ts                 → src/shared/cache.test.ts
src/shared/rate-limiter.ts          → src/shared/rate-limiter.test.ts
src/shared/api/coingecko.ts         → src/shared/api/coingecko.test.ts
                                      src/shared/api/coingecko.integration.test.ts
src/shared/api/defi-llama.ts        → src/shared/api/defi-llama.test.ts
                                      src/shared/api/defi-llama.integration.test.ts
src/content/text-scanner.ts         → src/content/text-scanner.test.ts
src/content/highlighter.ts          → src/content/highlighter.test.ts
```

- **Unit tests** (`*.test.ts`) — mock all external dependencies, run fast
- **Integration tests** (`*.integration.test.ts`) — hit real APIs, verify response parsing

---

## Roadmap

### Milestone 1 — Chrome Extension _(current)_

Detect tokens on web pages and show inline analysis cards with tokenomics data.

### Milestone 2 — Pro Tier

Portfolio Risk Scanner, Fundamentals Alerts, Bulk Page Scan, Multi-Token Comparison, and Export/Share.

### Milestone 3 — Desktop App

Grammarly-style overlay for native apps (Telegram Desktop, WhatsApp, Slack) using Tauri + OS accessibility APIs.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m "feat: add my feature"`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

Please follow the existing code style — the project uses **ESLint** + **Prettier** with the config in `.eslintrc.json` and `.prettierrc`.

---

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>Built with ☕ and conviction that you shouldn't need 5 browser tabs to evaluate a token.</sub>
</p>
