# Issue 3 Detection Engine Design

## Goal

Replace the content script's hardcoded demo highlighting path with a real detection engine that scans visible DOM text nodes and emits `DetectedToken[]` for downstream highlighting and resolution.

## Scope

This design covers:

- Implementing `scanDocument(textNodes: Text[]): DetectedToken[]`
- Detecting tickers, token names, EVM addresses, Solana addresses, and ENS domains
- Wiring the content script to use detector output instead of `DEMO_TERMS`
- Adding focused unit tests for detector behavior and edge cases

This design does not cover:

- Address or ENS resolution
- Chain inference beyond what the detector can infer directly from the matched pattern
- Tooltip or overlay behavior changes
- Broader false-positive tuning beyond the heuristics needed for this issue

## Current State

- [`src/content/detector.ts`](/Users/ggarcia14/Documents/code/greg/crypto-xray/src/content/detector.ts) is a stub that returns an empty array.
- [`src/content/index.ts`](/Users/ggarcia14/Documents/code/greg/crypto-xray/src/content/index.ts) highlights a hardcoded `DEMO_TERMS` list instead of detected entities.
- [`src/shared/types.ts`](/Users/ggarcia14/Documents/code/greg/crypto-xray/src/shared/types.ts) models detections as `ticker | name | address`.
- The token dictionary already exists and can resolve known token names and tickers.

## Design

### Detection Model

`DetectionType` will expand to:

- `ticker`
- `name`
- `address`
- `ens`

The address interface remains unified. EVM and Solana detections both use `type: "address"` and set `chain` when the matched pattern makes the chain inferable. ENS remains distinct from address so downstream resolution can treat human-readable names differently from raw addresses.

`scanDocument(textNodes: Text[]): DetectedToken[]` becomes the detector entrypoint. It accepts visible text nodes from the text scanner and returns pure detection metadata without touching the DOM.

### Matching Strategy

The detector runs per text node and emits detections in source order.

Each node is processed with explicit matchers in precedence order:

1. ENS domains
2. EVM addresses
3. Solana addresses
4. Tickers
5. Token names

Structured entities run first so they can reserve spans before softer dictionary-based name matching runs.

#### ENS domains

- Pattern: `label.eth`
- Matching is case-insensitive
- Uses word-boundary-aware checks so surrounding punctuation does not block valid matches
- Emits `type: "ens"` with high confidence

#### EVM addresses

- Pattern: `0x` followed by exactly 40 hex characters
- Emits `type: "address"` and `chain: "ethereum"`
- Confidence is high because the pattern is precise

This issue does not attempt multi-chain EVM inference from page context. The detector only marks the address as EVM-compatible through the existing chain field.

#### Solana addresses

- Pattern: base58 text with valid Solana address length constraints of 32-44 characters
- Excludes ambiguous characters outside base58
- Emits `type: "address"` and `chain: "solana"`
- Confidence is high, but lower than EVM if additional filtering is needed to avoid obvious false positives

#### Tickers

- Pattern: `$` followed by 2-5 uppercase letters
- Matching is boundary-aware so `$SOL,` matches but partial strings inside larger words do not
- If the ticker exists in the local dictionary, the detector includes the normalized ticker and `coingeckoId` with high confidence
- If the ticker matches the shape but is not in the dictionary, it still emits a ticker detection with lower confidence

#### Token names

- Name matching uses the existing local dictionary
- Matching is case-insensitive
- Matching runs only on text spans not already claimed by ENS, address, or ticker detections
- Name matches include `ticker` and `coingeckoId` from the dictionary entry

### Confidence Rules

Confidence remains numeric and heuristic, but deterministic.

- ENS: high confidence
- EVM address: high confidence
- Solana address: high confidence when the string passes base58 and length checks
- Dictionary-backed ticker: high confidence
- Unknown ticker-shaped match: medium confidence
- Dictionary-backed token name: medium-to-high confidence depending on ambiguity
- Ambiguous all-caps common-word forms such as `LINK` without a `$` prefix: low confidence or skipped entirely

The detector should prefer skipping obvious ambiguous matches over inflating low-signal results.

### Overlap and Deduplication

The detector maintains occupied spans per text node.

- Earlier structured matches block later name matches in the same span
- Longer structured matches win when overlapping candidates exist
- Duplicate detections with identical text, type, and span inside the same node collapse to one result

This keeps detector output stable and prevents follow-on highlighting from wrapping the same text repeatedly.

### Content Script Wiring

[`src/content/index.ts`](/Users/ggarcia14/Documents/code/greg/crypto-xray/src/content/index.ts) will switch from `DEMO_TERMS` to detector output:

1. Collect visible text nodes with `getVisibleTextNodes()`
2. Call `scanDocument(nodes)`
3. Pass the detected `text` values to `highlightNodes()`

The dynamic page scanner uses the same flow for newly added nodes.

This preserves the existing highlighter contract for now. If a later issue needs type-aware highlight styling or metadata, the highlighter can be upgraded separately without changing the detector contract introduced here.

## Testing

Add [`src/content/detector.test.ts`](/Users/ggarcia14/Documents/code/greg/crypto-xray/src/content/detector.test.ts) to cover:

- Ticker detection with punctuation and word-boundary edge cases
- Case-insensitive token-name detection
- EVM address detection
- Solana address detection
- ENS detection
- Overlap precedence between structured matches and names
- Ambiguous common-word handling, especially uppercase dictionary names without `$`
- Stable deduplication behavior for repeated or overlapping candidates

The implementation should follow test-driven development: add the minimal failing tests first, then implement detector behavior until the targeted detector tests and relevant content-script tests pass.

## Error Handling

The detector is pure and should fail closed.

- Empty node lists return an empty array
- Empty or whitespace-only text nodes produce no detections
- Invalid candidate strings are ignored rather than returned with misleading metadata

## Implementation Notes

- Reuse the existing token dictionary lookup helpers rather than introducing a second dictionary structure unless a focused performance need appears during implementation
- Avoid widening the detector API beyond what the issue needs
- Keep matcher helpers local to `src/content/detector.ts` unless a concrete reuse case appears
- Add JSDoc to exported detector functions and any non-obvious internal helpers

## Success Criteria

This work is complete when:

- `scanDocument(textNodes)` returns meaningful `DetectedToken[]`
- `DetectionType` distinguishes `ens` from `address`
- EVM and Solana addresses share the same address interface and differ via `chain`
- The content script stops using hardcoded demo terms
- Unit tests cover the accepted entity types and edge cases from the issue
