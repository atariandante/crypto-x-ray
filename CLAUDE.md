# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

```
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

The insight engine uses a **unified RiskProvider interface** pattern. The engine is fully provider-agnostic — each data source implements a single interface.

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
- Errors from the content script appear in the **page's DevTools console** (not extension DevTools)
- Use `console.log()` in content script code; watch the page console

### Debugging the Background Service Worker

1. Go to `chrome://extensions/`
2. Find Crypto X-Ray → click "Inspect views: background.html"
3. This opens the service worker's DevTools

### Adding a New API Client

1. Create `src/shared/api/newapi.ts` with async functions
2. Implement caching using `withCache()` from `cache.ts`
3. Add to service worker message handler
4. Update `MessageType` in `types.ts` if needed
5. Add host permission to `manifest.json`

### Adding a New RiskProvider

1. Create `src/shared/risk/providers/myprovider.ts` implementing `RiskProvider`
2. Implement `canHandle(entity)` — return true for entities this provider supports
3. Implement `getInsights(entity)` — fetch data and return `RiskInsight[]`
4. Register in `src/background/index.ts`: `engine.register(new MyProvider())`
5. Add unit tests in `src/shared/risk/providers/myprovider.test.ts`
6. No changes to InsightEngine, content script, or UI needed

### Running Tests

Tests are **colocated** with source files. Tests use **Vitest** (configured via `tsconfig.json` and Vite).

```bash
npm test                    # Run all tests once
npm test -- --coverage      # With coverage report
npm test:watch              # Watch mode

# Integration tests (hit live APIs)
npx vitest run src/shared/api/coingecko.integration.test.ts
npx vitest run src/shared/api/defi-llama.integration.test.ts
npx vitest run src/shared/api/rugcheck.integration.test.ts
```

## Key Dependencies

- **React 18.3**: UI rendering in popup, options, and tooltip overlays
- **Vite 5.3**: Module bundler and dev server
- **TypeScript 5.5**: Strict type checking (enabled)
- **Tailwind 3.4**: Utility CSS
- **@types/chrome**: Chrome Extension API types
- **Vitest**: Unit testing framework
- **ESLint + Prettier**: Code quality and formatting

## Notes for Implementation

- **Shadow DOM Usage**: Tooltip overlays use Shadow DOM to prevent style leaks into host pages
- **Inline Styles**: Highlight spans use inline styles (not CSS classes) for CSP compatibility on strict sites
- **Message Passing**: Content script ↔ Background worker uses `chrome.runtime.sendMessage()` with type-safe `Message` interface
- **Provider Isolation**: Content script and UI components must NEVER import from `src/shared/api/` or `src/shared/risk/providers/`. They only consume `RiskAssessment` and `TokenProfile` types
- **Rate Limiting**: Service worker should throttle API calls; implement exponential backoff for rate limits
- **Chain Context**: Always infer chain when analyzing addresses; different chains have different contract standards
- **Tier 1 Dictionary**: Top 200+ tokens by market cap — regenerate with `scripts/update-dictionary.ts`
- **JSDoc**: All exported functions and non-trivial private helpers must have JSDoc comments with `@param`, `@returns`, and a description

## Milestone 1 — Active Issues

| # | Title | Labels |
|---|-------|--------|
| [#3](https://github.com/atariandante/crypto-x-ray/issues/3) | Finalize entity detection engine | core, content-script |
| [#4](https://github.com/atariandante/crypto-x-ray/issues/4) | Implement highlight injection system | content-script, ui |
| [#5](https://github.com/atariandante/crypto-x-ray/issues/5) | Set up background messaging pipeline | background, core |
| [#6](https://github.com/atariandante/crypto-x-ray/issues/6) | Integrate token data providers (dictionary + RugCheck) | data, background |
| [#7](https://github.com/atariandante/crypto-x-ray/issues/7) | Implement caching layer | data |
| [#8](https://github.com/atariandante/crypto-x-ray/issues/8) | Build tooltip UI | ui, content-script |
| [#9](https://github.com/atariandante/crypto-x-ray/issues/9) | Implement insight engine with unified RiskProvider interface | core |
| [#10](https://github.com/atariandante/crypto-x-ray/issues/10) | Add debounced DOM observer | content-script |
| [#11](https://github.com/atariandante/crypto-x-ray/issues/11) | Reduce false positives in detection | core, content-script |
| [#12](https://github.com/atariandante/crypto-x-ray/issues/12) | Validate UX on real-world sites | content-script, ui |

**Execution order**: #6 → #3 → #7 → #4 → #5 → #9 → #8 → #10 → #11 → #12
