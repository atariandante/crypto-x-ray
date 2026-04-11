# Issue 6 Design: Token Dictionary and RugCheck Integration

## Summary

This document defines the implementation design for GitHub issue `#6`, "Integrate token data providers (dictionary + RugCheck)".

The feature is split into two distinct responsibilities:

1. A static token dictionary used only for fast Tier 1 token identity resolution during page scanning.
2. A live RugCheck client used to fetch current Solana risk data after a token has been identified.

The dictionary is intentionally not a source of truth for token analysis. It is a local, checked-in index that resolves token names and tickers to likely CoinGecko IDs without introducing runtime network latency into the content detection path.

## Goals

- Add a checked-in top-100 token dictionary derived from CoinGecko.
- Expose fast lookup helpers by ticker and token name.
- Resolve ambiguous tickers by preferring the highest market-cap token in the dataset.
- Add a regeneration script so the dictionary can be refreshed deterministically.
- Add a RugCheck client for Solana summary and full-report lookups.
- Add typed RugCheck domain models and focused automated tests.

## Non-Goals

- Live token search against CoinGecko during page detection.
- Full token intelligence aggregation in this issue.
- Multi-chain risk-provider abstraction beyond the RugCheck client itself.
- Automatic CI refresh of the token dictionary.

## Agreed Constraints

- The dictionary should cover the top 100 tokens by market cap for fast lookup.
- The dictionary must live under `src/shared/token-dictionary/`.
- Public modules and non-obvious exported functions should include JSDoc.
- Tests should be written when they provide meaningful behavioral coverage, not only for superficial coverage growth.

## Architecture

### 1. Static Token Dictionary

The token dictionary is a generated, checked-in dataset plus a small handwritten lookup layer.

Runtime behavior:

- Page detection extracts candidate ticker or token-name text.
- The token dictionary resolves the text locally to a likely CoinGecko token.
- If a token is resolved, downstream live data providers can fetch current token analysis.

This design keeps the frequently executed detection path local and deterministic while allowing all substantive intelligence to remain live and current.

### 2. Live RugCheck Client

RugCheck is a runtime data source for Solana risk analysis.

Runtime behavior:

- A resolved or user-selected Solana mint address is passed to the RugCheck client.
- `fetchTokenSummary(mint)` returns lightweight risk data for quick display.
- `fetchTokenReport(mint)` returns the fuller RugCheck report for deeper inspection or future UI expansion.

The RugCheck client should own response parsing and adaptation so the rest of the codebase depends on internal domain types rather than raw API shapes.

## Module Layout

### Token Dictionary

- `src/shared/token-dictionary/data.ts`
  Generated static dataset for the top 100 tokens.

- `src/shared/token-dictionary/index.ts`
  Public lookup API including `lookupByTicker()` and `lookupByName()`.

- `src/shared/token-dictionary/normalize.ts`
  Shared normalization logic for ticker and name matching.

- `src/shared/token-dictionary/types.ts`
  Dictionary-specific types if they are too narrow to belong in the shared global type module.

- `src/shared/token-dictionary/index.test.ts`
  Focused unit tests for lookup behavior and ambiguity resolution.

### Generation Script

- `scripts/update-token-dictionary.ts`
  Fetches source data from CoinGecko, ranks tokens, normalizes output, and rewrites the generated dictionary dataset.

### RugCheck

- `src/shared/api/rugcheck.ts`
  Runtime RugCheck client and mapping logic.

- `src/shared/api/rugcheck.test.ts`
  Unit tests with mocked responses.

- `src/shared/api/rugcheck.integration.test.ts`
  Integration test against a known RugCheck-supported Solana mint.

### Shared Types / Config

- `src/shared/types.ts`
  Shared RugCheck domain types used by the rest of the app.

- `manifest.json`
  Host permission for `https://api.rugcheck.xyz/*`.

## Token Dictionary Design

### Source Data

The regeneration script should use CoinGecko data to produce the checked-in dataset. The script must assemble enough information to:

- select the top 100 tokens by market cap,
- retain a stable `coingeckoId`,
- preserve canonical `name` and `symbol`,
- record enough ranking information to break ticker collisions consistently.

The generated dataset should be stable in ordering and formatting so diffs are readable.

### Data Shape

Each dictionary entry should contain the minimum data needed for reliable resolution:

- `coingeckoId`
- `name`
- `symbol`
- `marketCapRank`

Additional generated metadata is acceptable if it materially improves lookup behavior, but the dataset should remain compact and readable.

### Lookup API

Public API:

- `lookupByTicker(ticker: string)`
- `lookupByName(name: string)`

Return shape:

- `{ coingeckoId, name, symbol }`
- `null` when no reasonable match exists

Behavior:

- Lookups should be case-insensitive.
- Lookups should normalize surrounding whitespace.
- Name lookups should normalize consistent punctuation and spacing where useful.
- Ambiguous tickers must resolve to the highest-ranked token in the dictionary.

### Ambiguity Handling

Ticker ambiguity is expected. For example, multiple tokens may share the same symbol. The dictionary module should precompute or otherwise consistently prefer the entry with the best market-cap rank among dictionary candidates.

This should be encoded in lookup behavior rather than requiring callers to choose among multiple candidates.

## Regeneration Script Design

`scripts/update-token-dictionary.ts` should:

1. Fetch the required CoinGecko source data.
2. Rank or filter tokens down to the top 100 by market cap.
3. Normalize and validate generated entries.
4. Emit `src/shared/token-dictionary/data.ts`.
5. Preserve deterministic ordering so reruns produce stable diffs.

The script should fail clearly when source data is incomplete or malformed enough to make output unreliable.

If package scripts are updated, they should expose a clear manual command such as `update:token-dictionary`.

## RugCheck Client Design

### Public API

- `fetchTokenSummary(mint: string): Promise<RugCheckSummary | null>`
- `fetchTokenReport(mint: string): Promise<RugCheckReport | null>`

Returning `null` for not-found or unsupported cases is acceptable if it matches the style used by the existing provider clients. Unexpected transport or parsing failures should still surface as actionable errors where appropriate.

### Mapping Responsibilities

The client should map raw RugCheck responses into internal types defined in `src/shared/types.ts`.

Summary output should cover:

- score
- normalized score if present
- risks
- LP locked percentage
- token program
- token type

Full report output should preserve the fields needed by the issue, especially:

- top holders
- markets
- insider-related data

### Network and Permissions

The implementation must add `https://api.rugcheck.xyz/*` to `manifest.json` host permissions.

## Types Design

Shared types in `src/shared/types.ts` should be added only for information that is meaningfully consumed outside the RugCheck client.

Expected additions include:

- `RugCheckRisk`
- `RugCheckSummary`
- `RugCheckReport`

Raw API-only shapes that exist solely to support parsing can stay local to `src/shared/api/rugcheck.ts`.

## Testing Strategy

### Token Dictionary Tests

Add unit tests that validate meaningful behavior:

- known ticker resolution,
- known name resolution,
- case-insensitive matching,
- whitespace normalization,
- ambiguous ticker resolution preferring the highest-ranked token,
- unknown values returning `null`.

Avoid low-value tests that only assert the existence of exported constants.

### RugCheck Unit Tests

Use mocked fetch responses to validate:

- successful summary mapping,
- successful full-report mapping,
- handling of missing or unsupported data,
- error behavior for non-OK responses where relevant.

### RugCheck Integration Test

Add one integration test against a known stable Solana mint supported by RugCheck.

The test should verify that the live endpoint is reachable and that the mapped response contains the expected high-level fields without overfitting to volatile exact values.

## Documentation and JSDoc Guidance

Implementation guidance for agents and contributors:

- Add JSDoc to exported dictionary and RugCheck functions where behavior, normalization, ranking, or failure semantics are not immediately obvious.
- Prefer small focused modules over files that mix generated data with handwritten logic.
- Add tests when they verify ranking, normalization, API adaptation, or other behavior that could realistically regress.
- Skip tests that only duplicate obvious TypeScript declarations or static exports without exercising behavior.

## Risks and Tradeoffs

### Static Dictionary Drift

The top-100 set will drift over time as market caps change. This is acceptable because the dictionary is only a fast identity index, not the live analysis layer. The regeneration script is the maintenance mechanism.

### Ticker Ambiguity

Choosing the highest-ranked token is pragmatic but imperfect. This is acceptable for Tier 1 detection because false positives are reduced relative to random or first-match behavior, and deeper validation can happen later in the pipeline.

### RugCheck Volatility

RugCheck response details may evolve. Keeping raw response parsing localized to the client limits blast radius when the API shape changes.

## Implementation Checklist

1. Create the `src/shared/token-dictionary/` module structure.
2. Implement the generation script and generated data output.
3. Implement lookup helpers and normalization logic.
4. Add dictionary tests.
5. Add RugCheck shared types.
6. Implement the RugCheck client.
7. Add RugCheck unit and integration tests.
8. Add the RugCheck host permission to `manifest.json`.

## Open Decisions Resolved In This Spec

- Dictionary scope is top 100 tokens, not 200.
- Dictionary location is `src/shared/token-dictionary/`.
- The dictionary is static and checked in, but only for identity resolution.
- Live token intelligence remains runtime-driven.
- JSDoc and high-value tests are explicit project guidance for this work.
