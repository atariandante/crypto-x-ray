# AGENTS.md

This file provides guidance to Codex and other coding agents when working with code in this repository.

## Overview

**Crypto X-Ray** is a Chrome extension that acts as a real-time crypto risk detector for the internet. It scans any webpage, detects crypto-related entities (tokens, wallet addresses, contracts, ENS domains), and instantly tells you whether you should trust them. Think of it as a "Web3 antivirus."

The extension operates across three detection tiers:

1. **Tier 1**: Known tokens ($SOL, "Ethereum") via local dictionary (top 200+ by market cap)
2. **Tier 2**: Unknown token addresses via on-chain lookup (Etherscan, Solscan, etc.)
3. **Tier 3**: Wallet addresses via portfolio lookups (Debank, Etherscan)

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development mode (watch, rebuilds on file changes)
npm run dev

# Production build
npm run build

# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without modifying files
npm run format:check
```

### Running a Single Test

```bash
npm test -- <test-file-pattern>
# Example: npm test -- detector.test
```

### Loading the Extension

After building:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

## Architecture

### Manifest V3 Extension Structure

The extension follows Chrome Manifest V3 with three main execution contexts:

**Background Service Worker** (`src/background/index.ts`)

- Handles API calls to CoinGecko, DeFiLlama, RugCheck
- Implements request deduplication, caching, and rate limiting
- Runs the InsightEngine to produce RiskAssessments
- Responds to messages from content scripts
- Runs in the extension's isolated service worker context

**Content Script** (`src/content/index.ts`)

- Injected into all web pages (Manifest V3: at `document_idle`)
- Scans the DOM for token mentions, addresses, ENS domains, and wallet addresses
- Highlights detected entities inline with styled spans
- Manages tooltip overlays using Shadow DOM for style isolation
- Communicates with service worker via `chrome.runtime.sendMessage()`
- **Provider-agnostic**: never imports or references specific API clients

**UI Components** (React)

- **Popup** (`src/popup/`): Extension popup for manual token search
- **Options** (`src/options/`): Settings page for extension configuration
- **Tooltip** (`src/card/Tooltip.tsx`): Compact risk tooltip (consumes `TokenProfile` + `RiskAssessment`)
- **Cards** (`src/card/`): Analysis card variants (TokenCard, UnknownTokenCard, WalletCard)

### Data Flow

```text
Content Script
  ↓
  scanDocument() → detects tokens, addresses, ENS domains
  ↓
  highlightNodes() → inline highlights with data-* attributes
  ↓
  hover/click → sendMessage(GET_RISK_ASSESSMENT)
  ↓
Background Service Worker
  ↓
  resolve entity → API calls (CoinGecko, DeFiLlama, RugCheck)
  ↓
  InsightEngine.getRiskAssessment() → runs all RiskProviders
  ↓
  Response: { profile: TokenProfile, risk: RiskAssessment }
  ↓
Content Script renders tooltip with Shadow DOM
```

### Key Modules

**Detection Layer** (`src/content/detector.ts`)

- `scanDocument()`: Scans DOM text nodes for token mentions and addresses
- Pattern matching for known tickers ($SOL), token names, EVM addresses (0x...), Solana addresses (base58), ENS domains (*.eth)
- Returns `DetectedToken[]` with text, type, and confidence scores

**Text Scanner** (`src/content/text-scanner.ts`)

- Uses TreeWalker API to collect visible text nodes
- Skips `<script>`, `<style>`, `<noscript>`, `<input>`, `<textarea>`, and contenteditable elements
- MutationObserver-based `startDynamicPageScanner()` for live SPA content

**Highlighter** (`src/content/highlighter.ts`)

- Wraps detected entities in styled `<span>` elements with inline styles (CSP-safe)
- Uses `data-*` attributes for entity metadata
- Event delegation for hover/click interactions

**Resolution Layer** (`src/shared/resolver.ts`)

- `resolve()`: Maps detected text → `ResolutionResult`
- Path A: Dictionary lookup (instant, Tier 1)
- Path B: On-chain lookup via Etherscan/Solscan (slower, Tier 2)
- Path C: CoinGecko search (fallback for ambiguous tickers)

**Chain Detection** (`src/content/chain-detector.ts`)

- Infers blockchain context from page context, URL, and text heuristics
- Returns `Chain` (ethereum, arbitrum, base, polygon, optimism, bsc, solana, avalanche)

### Data Infrastructure

Three complementary free APIs:

| API | Role | Free Tier |
|-----|------|-----------|
| **CoinGecko** | Token identity, supply, market cap, FDV, categories | 10-50 req/min |
| **DeFiLlama** | Prices (primary), TVL, revenue, fees | ~1000 req/min |
| **RugCheck** | Risk scores, holder analysis, LP locks (Solana) | Free, no auth |

Smart routing: Prices route through DeFiLlama (generous limits) to preserve CoinGecko quota for identity/supply data.

**API Clients** (`src/shared/api/`)

- `coingecko.ts`: Price, market cap, FDV, supply, categories
- `defi-llama.ts`: TVL, protocol fundamentals, prices
- `rugcheck.ts`: Risk reports, LP lock status, insider detection (Solana)
- `etherscan.ts`: Contract verification, token info, wallet balances (planned)

### Risk Assessment System

The insight engine uses a **unified RiskProvider interface** pattern. The engine is fully provider-agnostic. Each data source implements a single interface.

**Core types** (`src/shared/risk/types.ts`):

- **RiskProvider**: Interface that all data sources implement (`canHandle()`, `getInsights()`)
- **RiskEntity**: Normalized input (identifier, chain, type, optional pre-fetched profile)
- **RiskInsight**: Normalized output (signal, severity, detail, provider, category)
- **RiskAssessment**: Final output (riskLevel, score 0-100, verdict, insights[], providers[])

**InsightEngine** (`src/shared/risk/engine.ts`):

- Registry pattern: `engine.register(new RugCheckProvider())`
- Calls `canHandle()` to filter, then `getInsights()` in parallel on all matching providers
- Merges, deduplicates, and computes aggregate risk level
- A failing provider does not block others

**MVP Providers** (`src/shared/risk/providers/`):

- `rugcheck.ts` — **RugCheckProvider**: Solana tokens only. Maps RugCheck API risks to RiskInsight[]
- `internal.ts` — **InternalHeuristicsProvider**: All chains. Threshold checks on CoinGecko/DeFiLlama data (FDV/MCap ratio, circulating %, TVL, revenue trend)

**Adding a new RiskProvider**:

1. Create `src/shared/risk/providers/newprovider.ts` implementing `RiskProvider`
2. Implement `canHandle()` (which entities this provider supports)
3. Implement `getInsights()` (fetch data, return `RiskInsight[]`)
4. Register in background: `engine.register(new NewProvider())`
5. No changes to InsightEngine, content script, or tooltip needed

**Caching** (`src/shared/cache.ts`)

- Wraps `chrome.storage.local` with TTL-based caching
- `withCache<T>(key, ttl, fetcher)` higher-order function for cache-first pattern
- Cache policies in `types.ts`:
  - Price: 5 minutes
  - Supply: 1 hour
  - Allocation: 24 hours
  - Dictionary: 1 week
  - RugCheck: 5 minutes
  - Address resolution: 5 minutes

### Type System

Core types in `src/shared/types.ts`:

- **DetectedToken**: What the content script finds on the page (ticker, name, address, ENS)
- **ResolutionResult**: Union of TokenProfile | UnknownTokenProfile | WalletProfile
- **TokenProfile**: Full analysis for indexed tokens (price, supply, unlocks, allocation, scoring, TGE)
- **UnknownTokenProfile**: Minimal data for unindexed contracts
- **WalletProfile**: Portfolio snapshot and recent transactions
- **TokenScore**: 1-5 health rating + red flags
- **Message / MessageResponse**: Type-safe chrome.runtime messaging (`RESOLVE_TOKEN`, `RESOLVE_ADDRESS`, `GET_RISK_ASSESSMENT`, etc.)
- **UserSettings**: Detection preferences, disabled sites, API keys, confidence threshold

Risk types in `src/shared/risk/types.ts`:

- **RiskProvider**: Interface for data source adapters
- **RiskEntity**: Normalized entity input
- **RiskInsight**: Individual risk signal (signal, severity, category, provider)
- **RiskAssessment**: Aggregate risk output (riskLevel, score, verdict, insights[])

## Configuration & Styling

- **TypeScript**: `tsconfig.json` with `strict: true`, `baseUrl` path alias `@/`
- **Build Tool**: Vite with `@crxjs/vite-plugin` for Chrome extension bundling
- **CSS**: Tailwind + PostCSS
- **Linting**: ESLint with TypeScript support (warn on any, allow `_` prefix for unused vars)
- **Formatting**: Prettier (semi, 2-space, 100-char line width)

## Storage & Permissions

**chrome.storage**: Caches API responses and stores user settings
**Permissions**:

- `storage`: Cache management
- `activeTab`: Detect current tab URL
- `alarms`: Scheduled cache invalidation

**Host Permissions**: APIs for CoinGecko, RugCheck, Etherscan, Arbiscan, Basescan, Polygonscan, BSCScan, Optimism, Solscan, Helius, Debank, DeFiLlama

## Common Development Workflows

### Debugging the Content Script

- Open DevTools on any page
- Errors from the content script appear in the page's DevTools console, not extension DevTools
- Use `console.log()` in content script code and watch the page console

### Debugging the Background Service Worker

1. Go to `chrome://extensions/`
2. Find Crypto X-Ray and click "Inspect views: background.html"
3. This opens the service worker's DevTools
