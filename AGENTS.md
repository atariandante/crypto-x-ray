# AGENTS.md

Repository guidance for Codex and other terminal coding agents.

## Project Summary

Crypto X-Ray is a Chrome Manifest V3 extension that scans pages for crypto-related entities and shows risk context inline.

Primary detection tiers:

1. Tier 1: known tokens from a static local dictionary
2. Tier 2: unknown token contracts resolved through chain-specific APIs
3. Tier 3: wallet addresses resolved through portfolio and explorer data

## Working Agreements

- Preserve the existing architecture. Do not move provider-specific API logic into the content script.
- Keep the content script provider-agnostic. Network calls and risk aggregation belong in the background worker and shared modules.
- Prefer small, targeted changes over broad refactors.
- Keep TypeScript strictness intact. Do not weaken types to get tests passing.
- Prefer `rg` and `rg --files` for search.

## Important Paths

- `src/background/index.ts`: service worker entrypoint, provider wiring, risk engine usage
- `src/content/`: DOM scanning, highlighting, page interaction
- `src/shared/api/`: external API clients
- `src/shared/risk/`: provider interface, engine, and risk aggregation
- `src/shared/types.ts`: cross-cutting shared types
- `src/card/`, `src/popup/`, `src/options/`: React UI surfaces
- `manifest.json`: extension permissions and host permissions

## Architecture Rules

- Content script responsibilities:
  - scan visible page text
  - highlight matches
  - request analysis through typed Chrome messages
- Background responsibilities:
  - call external APIs
  - cache and dedupe requests
  - build `RiskAssessment` responses
- Shared layer responsibilities:
  - define types
  - implement resolvers, caches, API clients, and risk providers

When adding a new data provider:

1. Add or update types first.
2. Add the API client under `src/shared/api/`.
3. If it contributes to scoring, expose it through a `RiskProvider`.
4. Register the provider in the background worker.
5. Update `manifest.json` if new host permissions are required.

## Commands

```bash
npm install
npm run dev
npm run build
npm test
npm run lint
npm run format:check
```

Useful test targeting:

```bash
npm test -- detector
npm test -- rugcheck
```

## Test And Environment Notes

- Unit tests should pass without network access.
- Existing integration tests hit live CoinGecko and DeFiLlama endpoints. In restricted environments they fail with DNS or fetch errors; treat that as an environment limitation unless the changed code affects those tests directly.
- If Vitest reports `jsdom` missing, the local install is incomplete; refresh dependencies before treating it as a code regression.
- Prefer mocked tests for new API clients, plus a clearly named integration test only where live verification is useful.

## Extension Debugging

- Content script logs appear in the inspected page's DevTools console.
- Background logs appear in the extension service worker inspector from `chrome://extensions`.
- After build, load `dist/` as an unpacked extension.

## Implementation Expectations

- Keep functions and modules focused.
- Add succinct comments only where the code would otherwise be hard to parse.
- Preserve CSP-safe patterns in content/highlighting code.
- Do not add runtime API calls for Tier 1 token dictionary lookups; keep dictionary data static in source.
- Favor deterministic behavior for ambiguous token matches and document the tie-breaker in code or tests.
