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

- **CoinGecko API** — price, market cap, FDV, supply, categories
- **Tokenomist.ai API** — unlock schedules, vesting, allocations
- **DefiLlama API** — TVL, protocol revenue
- **Token Terminal API** — fundamentals (revenue, fees, active users)
- **Etherscan/Basescan/Arbiscan** — contract info, wallet balances
- **Solscan/Helius** — Solana token and wallet data
- **Debank API** — wallet portfolio breakdown

## Tech Stack

- **TypeScript** + **React** for UI
- **Vite** for extension bundling
- **Tailwind CSS** for styling
- **Chrome Extension Manifest V3**
- **Shadow DOM** for style isolation on host pages

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
│   ├── api/             # API clients (CoinGecko, Tokenomist, Etherscan, etc.)
│   ├── scoring/         # Tokenomics health scoring engine
│   ├── resolver.ts      # Maps detected text → token/wallet identity
│   ├── dictionary.ts    # Top 500 token dictionary + mapping
│   ├── types.ts         # Shared TypeScript interfaces
│   └── cache.ts         # chrome.storage caching layer
├── tests/
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

# Run tests
npm test

# Lint
npm run lint
```

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
