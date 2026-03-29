# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Crypto X-Ray** is a Chrome extension that detects cryptocurrency tokens on any webpage and displays analysis cards with tokenomics data, fundamentals, and supply dynamics. Think of it as a "Grammarly for crypto due diligence."

The extension operates across three detection tiers:
1. **Tier 1**: Known tokens ($SOL, "Ethereum") via local dictionary (top 500 by market cap)
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
- Handles API calls to CoinGecko, Tokenomist, Etherscan, Solscan, Debank, DeFiLlama, Token Terminal
- Implements request deduplication, caching, and rate limiting
- Maintains shared state and responds to messages from content scripts
- Runs in the extension's isolated service worker context

**Content Script** (`src/content/index.ts`)
- Injected into all web pages (Manifest V3: at `document_idle`)
- Scans the DOM for token mentions, addresses, and wallet addresses
- Detects chain context when analyzing addresses
- Manages floating analysis cards using Shadow DOM for style isolation
- Communicates with service worker via `chrome.runtime.sendMessage()`

**UI Components** (React)
- **Popup** (`src/popup/`): Extension popup for manual token search
- **Options** (`src/options/`): Settings page for extension configuration
- **Cards** (`src/card/`): Three analysis card variants:
  - `TokenCard.tsx`: Renders full analysis for known tokens (price, supply, unlocks, allocation, scoring)
  - `UnknownTokenCard.tsx`: Basic analysis for unindexed token addresses
  - `WalletCard.tsx`: Portfolio breakdown for wallet addresses

### Data Flow

```
Content Script
  ↓
  scanDocument() → detects tokens, addresses, wallets
  ↓
  resolve() → classifies and enriches detections
  ↓
  chrome.runtime.sendMessage()
  ↓
Background Service Worker
  ↓
  API calls (CoinGecko, Tokenomist, Etherscan, etc.)
  ↓
  Response back to content script
  ↓
Content Script renders overlay with React card
```

### Key Modules

**Detection Layer** (`src/content/detector.ts`)
- `scanDocument()`: Scans DOM for token mentions and addresses
- Pattern matching for known tickers, contract addresses (0x..., base58), wallet addresses
- Returns `DetectedToken[]` with text, type, and confidence scores

**Resolution Layer** (`src/shared/resolver.ts`)
- `resolve()`: Maps detected text → `ResolutionResult`
- Path A: Dictionary lookup (instant, Tier 1)
- Path B: On-chain lookup via Etherscan/Solscan (slower, Tier 2)
- Path C: CoinGecko search (fallback for ambiguous tickers)

**Chain Detection** (`src/content/chain-detector.ts`)
- Infers blockchain context from page context, URL, and text heuristics
- Returns `Chain` (ethereum, arbitrum, base, polygon, optimism, bsc, solana, avalanche)

**API Clients** (`src/shared/api/`)
- `coingecko.ts`: Price, market cap, FDV, supply, categories
- `tokenomist.ts`: Unlock schedules, vesting info, allocations
- `defi-llama.ts`: TVL and protocol fundamentals
- `etherscan.ts`: Contract verification, token info, wallet balances
- `tokenomist.ts`: Complementary on-chain data for Solana

**Scoring Engine** (`src/shared/scoring/`)
- `fundamentals-score.ts`: Scores protocol revenue, TVL, user growth
- `supply-score.ts`: Scores dilution risk, circulating supply %, unlock pressure
- `tge-analyzer.ts`: Analyzes TGE unlock patterns and estimates sell pressure

**Caching** (`src/shared/cache.ts`)
- Wraps `chrome.storage.local` with TTL-based caching
- Cache policies in `types.ts`:
  - Price: 5 minutes
  - Supply: 1 hour
  - Allocation: 24 hours
  - Dictionary: 1 week
  - Address resolution: 5 minutes

### Type System

Core types in `src/shared/types.ts`:

- **DetectedToken**: What the content script finds on the page (ticker, name, or address)
- **ResolutionResult**: Union of TokenProfile | UnknownTokenProfile | WalletProfile
- **TokenProfile**: Full analysis for indexed tokens (price, supply, unlocks, allocation, scoring, TGE)
- **UnknownTokenProfile**: Minimal data for unindexed contracts
- **WalletProfile**: Portfolio snapshot and recent transactions
- **TokenScore**: 1-5 health rating + red flags
- **TGEAnalysis**: TGE unlock %, grade, comparable projects

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

**Host Permissions**: APIs for CoinGecko, Etherscan, Arbiscan, Basescan, Polygonscan, BSCScan, Optimism, Solscan, Helius, Debank, DeFiLlama, Token Terminal

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
2. Implement caching using `cache.ts` wrapper
3. Add to service worker message handler
4. Update `MessageType` in `types.ts` if needed

### Running Tests
Tests use **Vitest** (configured via `tsconfig.json` and Vite). Test files go in `tests/`.

```bash
npm test                    # Run all tests once
npm test -- --coverage      # With coverage report
npm test:watch              # Watch mode
```

## Key Dependencies

- **React 18.3**: UI rendering in popup, options, and card overlays
- **Vite 5.3**: Module bundler and dev server
- **TypeScript 5.5**: Strict type checking (enabled)
- **Tailwind 3.4**: Utility CSS
- **@types/chrome**: Chrome Extension API types
- **Vitest**: Unit testing framework
- **ESLint + Prettier**: Code quality and formatting

## Notes for Implementation

- **Shadow DOM Usage**: Card overlays use Shadow DOM to prevent style leaks into host pages
- **Message Passing**: Content script ↔ Background worker uses `chrome.runtime.sendMessage()` with type-safe `Message` interface
- **Rate Limiting**: Service worker should throttle API calls; implement exponential backoff for rate limits
- **Chain Context**: Always infer chain when analyzing addresses; different chains have different contract standards
- **Tier 1 Dictionary**: Top 500 tokens by market cap—keep in sync with CoinGecko
